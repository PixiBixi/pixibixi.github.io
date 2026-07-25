---
description: Une CI GitHub Actions durcie pour un projet Go — actions SHA-pinned, permissions least-privilege, zizmor, golangci-lint, govulncheck, tests multi-plateforme et feedback reviewdog en PR.
tags:
  - GitHub Actions
  - Go
  - CI/CD
  - Security
  - golangci-lint
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

C'est ce qui distingue une CI correcte d'une CI qu'on peut laisser tourner sur un repo public sans y penser. Quatre patterns, appliqués sur **tous** les workflows.

### Épingler les actions par SHA, pas par tag

Un tag Git est mutable. `uses: actions/checkout@v7` pointe vers ce que le mainteneur (ou quelqu'un qui a compromis son compte) décide d'y mettre. Le SHA d'un commit, lui, ne bouge pas.

```yaml
# Fragile : le tag peut être redéplacé sur du code malveillant
- uses: actions/checkout@v7

# Durci : le SHA est immuable, le commentaire garde la version lisible
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
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
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
  with:
    persist-credentials: false
```

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
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - uses: zizmorcore/zizmor-action@192e21d79ab29983730a13d1382995c2307fbcaa # v0.5.7
```

!!! tip "Faire tourner zizmor en local"
    `uvx zizmor .github/workflows/` (ou `pipx run zizmor`) donne le même verdict avant de committer.

## Test et build multi-plateforme

Deux jobs dans `ci.yml`. Le premier teste, le second vérifie que le binaire compile sur les trois OS.

```yaml title=".github/workflows/ci.yml"
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - uses: actions/setup-go@924ae3a1cded613372ab5595356fb5720e22ba16 # v6.5.0
        with:
          go-version-file: go.mod
      - run: go mod verify
      - run: go build -v ./...
      - run: go test -race ./...

  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - uses: actions/setup-go@924ae3a1cded613372ab5595356fb5720e22ba16 # v6.5.0
        with:
          go-version-file: go.mod
      - run: go build -v -o gopen${{ matrix.os == 'windows-latest' && '.exe' || '' }} .
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

## Vulnérabilités des dépendances

[govulncheck](https://go.dev/blog/govulncheck) est l'outil officiel de la Go Team. Sa force : il ne signale une CVE que si ton code **appelle réellement** la fonction vulnérable, pas juste parce que le module est dans l'arbre de dépendances. Beaucoup moins de faux positifs qu'un scanner générique.

```yaml title=".github/workflows/govulncheck.yml"
permissions:
  contents: read

jobs:
  govulncheck:
    runs-on: ubuntu-latest
    steps:
      - uses: golang/govulncheck-action@032d45514ae346b1db93c04b0c90b841c370344f # v1.1.0
        with:
          go-version-file: go.mod
```

Il couvre aussi les vulnérabilités de la toolchain Go elle-même, pas seulement les libs tierces.

## Feedback direct dans la PR

Faire échouer un job, c'est bien. Dire quoi corriger et où, c'est mieux. [reviewdog](https://github.com/reviewdog/reviewdog) poste les problèmes en suggestions inline sur la PR, applicables en un clic.

```yaml title=".github/workflows/go-format.yml"
permissions:
  contents: read
  pull-requests: write   # requis pour poster les suggestions

jobs:
  goimports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false
      - uses: actions/setup-go@924ae3a1cded613372ab5595356fb5720e22ba16 # v6.5.0
        with:
          go-version-file: go.mod
      - run: go install golang.org/x/tools/cmd/goimports@latest
      - run: goimports -w $(find . -name '*.go')
      - uses: reviewdog/action-suggester@2558ba17e65a9039e73764a73009fc05fef28a46 # v1.24.3
        with:
          tool_name: goimports
```

Le job reformate le code, puis reviewdog compare avec ce qui a été poussé et propose le diff en commentaire. Même mécanique pour le Markdown avec `reviewdog/action-markdownlint` et `reporter: github-pr-review`.

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

Un petit outil lit les commits depuis le dernier tag, calcule le prochain `vX.Y.Z` et le pose ; GoReleaser enchaîne dans le même job. `default_bump: false` est la clé : sans commit `feat`/`fix` releasable, aucun tag n'est créé, donc aucune release parasite sur un simple `docs:` ou `chore:`.

```yaml title=".github/workflows/release.yml"
on:
  push:
    branches: [main]
    tags: ['v*']   # échappatoire : un tag posé à la main publie aussi

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
          persist-credentials: false
      - id: tag
        if: github.ref_type == 'branch'
        uses: mathieudutour/github-tag-action@a22cf08638b34d5badda920f9daf6e72c477b07b # v6.2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          release_branches: main
          default_bump: false
      - if: github.ref_type == 'tag' || steps.tag.outputs.new_tag != ''
        run: git fetch --tags --force
      # setup-go + GoReleaser, gardés par la même condition — voir l'article GoReleaser
```

Pourquoi tout dans un seul job, plutôt qu'un workflow qui tague et un autre qui publie sur le tag ? Parce qu'un tag poussé avec le `GITHUB_TOKEN` par défaut **ne re-déclenche pas** de workflow — garde-fou anti-boucle de GitHub. Séparer les deux imposerait un PAT dédié juste pour ré-armer le second workflow. En enchaînant calcul-du-tag et publication dans le même run, on s'en passe. La double condition (`ref_type == 'tag'` ou nouveau tag calculé) préserve l'échappatoire manuelle : un `v*` poussé à la main court-circuite le calcul et publie directement.

Résultat : Renovate merge un `minor` de dépendance, la CI passe, une version mineure sort et est publiée — sans qu'une main touche à un tag.

## Récap

Ce qui fait la différence entre une CI Go qui marche et une CI Go qu'on laisse tourner sans y penser :

- Actions épinglées par SHA, versions gardées lisibles en commentaire
- `permissions:` au moindre privilège, par workflow et par job
- `persist-credentials: false` sur chaque checkout
- zizmor pour que tout ça reste vrai dans le temps
- `go test -race` et build sur les trois OS
- golangci-lint épinglé, exclusions justifiées
- govulncheck pour les CVE réellement atteignables
- reviewdog pour un feedback actionnable en PR
- Renovate en automerge (minor/patch/digest) et releases déclenchées par le type de commit

!!! tip "Et après le CI ?"
    Une fois le CI vert et un tag posé — à la main ou calculé par la CI (voir plus haut) — c'est [GoReleaser](goreleaser.md) qui prend le relais : binaires multi-arch, images OCI, signatures cosign, publication Homebrew.
