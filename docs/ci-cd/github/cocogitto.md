---
description: "Automatiser le versioning sémantique avec cocogitto : cog check, cog bump, CHANGELOG, GitHub Actions. Comparaison avec release-please."
variables:
  - name: cog_version
    default: 7.0.0
tags:
  - GitHub Actions
  - CI/CD
  - Release
  - Conventional Commits
  - Semver
---

# Cocogitto : versioning sémantique, CHANGELOG et releases au push

Versionner à la main oblige à relire les commits depuis le dernier tag, à choisir entre patch, minor et major, puis à recopier les changements dans le CHANGELOG. Cocogitto déduit ces 3 décisions des Conventional Commits. Il valide les messages, calcule le bump semver, écrit le CHANGELOG et pose le tag à chaque push sur `main`, sans PR intermédiaire.

## Publier au push ou au merge d'une PR

Les 2 outils s'appuient sur les [Conventional Commits](https://www.conventionalcommits.org/) et automatisent le versioning, mais cocogitto publie au push alors que release-please publie au merge d'une PR.

| | cocogitto | release-please |
|---|---|---|
| **Déclencheur** | Push direct sur `main` | Merge d'une Release PR |
| **Validation locale** | `cog check`, hook `commit-msg` | Aucune |
| **Bump** | Immédiat au push | À la merge de la PR |
| **CHANGELOG** | Format cog (`- - -`) | Keep a Changelog |
| **GitHub Release** | `gh release create` à ajouter | Créée automatiquement |
| **Config** | `cog.toml` | `release-please-config.json` |
| **Mainteneur** | Communauté | Google |

En pratique, les 2 flows divergent dès le premier push :

![Comparaison cocogitto vs release-please](./cocogitto-comparison.svg)

Release-please accumule les commits dans une PR et ne publie qu'au merge de celle-ci, avec une approbation humaine avant chaque release. Cocogitto bumpe dès le push sans approbation. La discipline sur les branches remplace cette étape.

Cocogitto convient à un projet solo ou à une petite équipe qui merge directement sur `main`, valide ses commits en local et veut publier sans étape manuelle. Release-please convient à une équipe qui impose une review avant chaque release et travaille déjà avec la PR comme unité de travail.

!!! warning "Un bump par push"
    Cocogitto calcule un seul bump par push, sur l'ensemble des commits depuis le dernier tag. Pousser 3 `fix:` l'un après l'autre sur `main` produit 3 patch bumps, alors qu'une branche feature mergée en une fois n'en produit qu'un.

## Installation

Les versions disponibles sont listées sur la [page des releases](https://github.com/cocogitto/cocogitto/releases) de cocogitto.

```bash
# macOS
brew install cocogitto

# Linux (binaire direct) : le nom de l'archive porte la version
curl -sSfL "https://github.com/cocogitto/cocogitto/releases/download/<cog_version>/cocogitto-<cog_version>-x86_64-unknown-linux-musl.tar.gz" \
  | tar xz --strip-components=1 -C ~/.local/bin x86_64-unknown-linux-musl/cog
```

## Configuration de base

```toml title="cog.toml"
ignore_merge_commits = true
tag_prefix = "v"          # obligatoire quand les tags existants sont en v*

[changelog]
path = "CHANGELOG.md"
template = "remote"
remote = "github.com"
repository = "mon-repo"
owner = "mon-org"
authors = []
```

Les types de commit qui déclenchent un bump se règlent dans `[commit_types]`, décrit dans [la section sur le bump](#choisir-les-commits-qui-publient-une-release).

!!! note "tag_prefix"
    Sans `tag_prefix = "v"`, cocogitto cherche des tags `1.2.3` sans `v`. Quand les tags existants sont en `v1.2.3`, comme ceux de release-please, ce champ est obligatoire.

## Préparer le CHANGELOG pour cog

Cocogitto a besoin d'un séparateur `- - -` pour savoir où insérer chaque nouvelle section. Le fichier minimal tient en 3 lignes :

```markdown
# Changelog

- - -
```

À chaque bump, cog insère le nouveau bloc sous l'en-tête, juste après le premier `- - -` :

```markdown
# Changelog

- - -
## [v1.3.0](https://github.com/...) - 2026-05-11
#### Features
- (**api**) add pagination endpoint - ([abc1234](...)) - John Doe

- - -
## [v1.2.0](https://github.com/...) - 2026-05-01
...
```

!!! warning "Migration depuis release-please"
    Le CHANGELOG généré par release-please n'a pas de `- - -`. Il faut en ajouter un à la main avant le premier `cog bump`, faute de quoi l'erreur `cannot find default separator` fait échouer le job de release.

## Valider les commits avant le push

```bash
# Valider tout l'historique
cog check

# Valider uniquement depuis le dernier tag
cog check --from-latest-tag

# Voir ce que le prochain bump produirait
cog bump --auto --dry-run

# Bumper manuellement
cog bump --patch   # 1.2.3 → 1.2.4
cog bump --minor   # 1.2.3 → 1.3.0
cog bump --major   # 1.2.3 → 2.0.0
```

## Refuser un message de commit non conforme

Cog peut valider le message de commit avant son enregistrement, par un hook `commit-msg` :

```yaml title=".pre-commit-config.yaml"
repos:
  - repo: local
    hooks:
      - id: cog-verify
        name: Conventional commit check
        language: system
        entry: cog verify --file
        stages: [commit-msg]
```

Le framework pre-commit ajoute lui-même le chemin du message à la fin de la commande, d'où le `--file` sans valeur. Un `args: ["--file", ".git/COMMIT_EDITMSG"]` en plus fait passer le chemin 2 fois et cog refuse la commande, puisque `--file` et le message positionnel s'excluent. Le hook ne s'active qu'après `pre-commit install --hook-type commit-msg`.

## Publier à chaque push sur `main`

```yaml title=".github/workflows/release.yml"
name: Release

on:
  push:
    branches: [main]

permissions: {}

jobs:
  release:
    runs-on: ubuntu-24.04
    permissions:
      contents: write   # commit du CHANGELOG, tag et GitHub Release
    outputs:
      bumped: ${{ steps.bump.outputs.bumped }}
      tag_name: ${{ steps.bump.outputs.tag_name }}
    steps:
      - uses: step-security/harden-runner@dc2769abcc0fcfbadfc1df54081c1608579ef6b2 # v2.22.2
        with:
          egress-policy: audit
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0          # obligatoire : cog calcule le bump sur tout l'historique
          persist-credentials: false

      # installe cog et configure l'identité git du commit de bump
      - uses: cocogitto/cocogitto-action@52d0023b4396897f1815648e553db2ab8d782f3a # v4.2.0
        with:
          git-user: github-actions[bot]
          git-user-email: github-actions[bot]@users.noreply.github.com
          command: check
          args: --from-latest-tag   # ne valide que les commits depuis le dernier tag

      # cog renvoie 0 quand aucun commit ne justifie de bump : une erreur fait échouer le job
      - name: Bump version
        id: bump
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          BEFORE=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
          cog bump --auto
          AFTER=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
          if [ "$BEFORE" != "$AFTER" ]; then
            git push --atomic "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
              HEAD:main "refs/tags/${AFTER}"
            echo "bumped=true" >> "$GITHUB_OUTPUT"
            echo "tag_name=$AFTER" >> "$GITHUB_OUTPUT"
          else
            echo "bumped=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Create GitHub release
        if: steps.bump.outputs.bumped == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG: ${{ steps.bump.outputs.tag_name }}
        run: |
          set -euo pipefail
          NOTES=$(awk "/^## .*${TAG#v}/{found=1; next} found && /^- - -/{exit} found{print}" CHANGELOG.md)
          gh release create "$TAG" \
            --title "$TAG" \
            --notes "${NOTES:-Release $TAG}" \
            --verify-tag

  build-push:
    needs: release
    if: needs.release.outputs.bumped == 'true'
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: write   # push vers ghcr.io
    steps:
      - uses: step-security/harden-runner@dc2769abcc0fcfbadfc1df54081c1608579ef6b2 # v2.22.2
        with:
          egress-policy: audit
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: ${{ needs.release.outputs.tag_name }}
          persist-credentials: false

      - uses: docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069 # v4.4.1

      - uses: docker/login-action@dbcb813823bdd20940b903addbd779551569679f # v4.6.0
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@dc802804100637a589fabce1cb79ff13a1411302 # v6.2.0
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}},value=${{ needs.release.outputs.tag_name }}
            type=semver,pattern={{major}}.{{minor}},value=${{ needs.release.outputs.tag_name }}
            type=raw,value=latest   # non généré automatiquement hors push de tag natif
            type=sha,prefix=sha-

      - uses: docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

Les actions sont épinglées par SHA, les permissions sont posées job par job et le checkout ne garde pas le token, pour les raisons détaillées dans [l'article sur le durcissement](hardening.md). Le step de bump pousse alors le commit et le tag avec le `GITHUB_TOKEN` passé explicitement, en un seul push atomique.

!!! note "tag latest non automatique"
    L'action `docker/metadata-action` ne génère `latest` automatiquement que sur un push de tag Git (`on: push: tags: ['v*']`). Ce workflow se déclenche sur un push de branche et doit donc écrire `type=raw,value=latest`.

### Enchaîner GoReleaser dans le même job

Un tag poussé avec le `GITHUB_TOKEN` ne déclenche aucun autre workflow, car GitHub bloque ces événements pour éviter les boucles. Un workflow GoReleaser sur `on: push: tags` ne démarre donc pas après le bump. GoReleaser tourne alors dans le job `release` à la place du step `Create GitHub release`. Il reprend la section du CHANGELOG avec `--release-notes` :

```yaml title=".github/workflows/release.yml"
      - name: Extract release notes
        if: steps.bump.outputs.bumped == 'true'
        env:
          TAG: ${{ steps.bump.outputs.tag_name }}
        run: awk "/^## .*${TAG#v}/{found=1; next} found && /^- - -/{exit} found{print}" CHANGELOG.md > "$RUNNER_TEMP/notes.md"

      - name: Run GoReleaser
        if: steps.bump.outputs.bumped == 'true'
        uses: goreleaser/goreleaser-action@f06c13b6b1a9625abc9e6e439d9c05a8f2190e94 # v7.2.3
        with:
          version: '~> v2'
          args: release --clean --release-notes ${{ runner.temp }}/notes.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Le CHANGELOG de cocogitto reste ainsi la seule source des notes de release, comme le recommande [l'article GoReleaser](goreleaser.md#le-changelog-vit-dans-la-release-github). Les autres prérequis (setup-go, cosign, syft, permissions) sont ceux de [son workflow complet](goreleaser.md#le-workflow-complet).

### Migrer cocogitto-action de v3 à v4

L'action est publiée sous `cocogitto/cocogitto-action`. Les exemples trouvés en ligne référencent souvent `oknozor/cocogitto-action`, ancien nom du même dépôt avant son transfert du compte du mainteneur vers l'organisation. Seule la redirection GitHub fait encore fonctionner cet ancien nom et il vaut mieux pointer le nom canonique.

La v4 casse la compatibilité avec la v3 :

| v3 | v4 |
|---|---|
| `check: true` (défaut) | `command: check` - **obligatoire** |
| `check-latest-tag-only: true` | `args: --from-latest-tag` |
| `release: true` | `command: bump` + `args` |

Un input inconnu ne produit qu'un warning dans GitHub Actions, mais l'absence de `command` fait échouer le script avec `Error: No command specified`. Le job release échoue alors à chaque push sur `main`.

La version de cog dépend aussi du tag de l'action : v3.11.0 installe cog 6.3.0, v4.0.0 installe 6.4.0 et v4.2.0 installe 7.0.0. À la date du 2026-10-23, le tag flottant `v4` pointe encore sur un commit qui installe 6.4.0. Épingler le SHA d'une version précise fixe aussi la version de cog qui calcule le bump.

## Choisir les commits qui publient une release

| Commit | Bump |
|--------|------|
| `fix:` | patch (`1.2.3 → 1.2.4`) |
| `feat:` | minor (`1.2.3 → 1.3.0`) |
| `feat!:` ou `BREAKING CHANGE` | major (`1.2.3 → 2.0.0`) |
| `perf:`, `refactor:` | aucun bump ([configurable](#un-push-perf-seul-ne-publie-rien)) |
| `chore:`, `docs:`, `ci:` | aucun bump ([configurable](#faire-bumper-chore)) |

### Un push `perf:` seul ne publie rien

Seuls `feat` et `fix` bumpent par défaut. Un push qui ne contient que des commits `perf:` donne un job de release vert, sans tag :

```text
No conventional commits for your repository that required a bump.
```

Tout semble fonctionner. Le job `release` réussit, puis les jobs conditionnés par `bumped == 'true'` (le build et le push de l'image) sont ignorés. L'optimisation reste sur `main` et n'est publiée qu'avec le prochain `fix:`, même sans rapport.

Pour qu'un type déclenche un bump, `[commit_types]` accepte `bump_patch` et `bump_minor` :

```toml title="cog.toml"
[commit_types]
perf = { bump_patch = true }
```

Un type que cocogitto connaît déjà garde son titre de section sans qu'on le redéclare. En 7.0.0, `perf = { bump_patch = true }` reste sous « Performance Improvements » et `chore = { bump_patch = true }` sous « Miscellaneous Chores ». Un type propre au projet n'a pas de titre par défaut et reste hors du CHANGELOG tant qu'on ne lui donne pas de `changelog_title`.

### Faire bumper `chore:`

En pratique, le type qu'on veut faire bumper est plutôt `chore:` que `perf:`. Renovate et Dependabot rangent sous ce type tout ce qui n'est pas une dépendance de production. Un tel commit arrive sur `main` sans produire de tag, comme l'optimisation plus haut. La dépendance corrigée n'est alors pas reconstruite quand l'image est conditionnée à `bumped == 'true'`. Elle est à jour dans le lockfile mais absente de ce qui tourne.

```toml title="cog.toml"
[commit_types]
chore = { bump_patch = true }
```

Le réglage `bump_patch` convient mieux que `bump_minor`. Un bot qui vérifie les dépendances tous les jours produit plusieurs merges par semaine. En minor, le numéro augmente de plusieurs unités chaque mois sans qu'aucune fonctionnalité soit livrée et le minor perd son sens le jour où une fonctionnalité arrive. En patch, le numéro reste cohérent avec le contenu, qui évolue sans surface nouvelle.

!!! warning "La règle vaut pour tous les `chore:`"
    La table `[commit_types]` est indexée par type et non par scope. Le réglage s'applique donc à `chore(docs)` comme à `chore(deps)` et un rangement de documentation déclenche lui aussi une release, avec son image.

!!! tip "Vérifier avant de pousser"
    Avant de pousser, `cog bump --auto --dry-run` affiche la version calculée ou `No conventional commits...` et confirme qu'un changement de `[commit_types]` produit l'effet attendu. La commande refuse de tourner sur un arbre de travail sale et affiche un `git status` à la place du résultat. Il faut committer le changement avant de la lancer.

## Voir aussi

- [GoReleaser](goreleaser.md) - publier binaires et images dans le même job que le bump
- [CI GitHub Actions pour un projet Go](go-ci.md) - les jobs qui doivent passer avant qu'un bump ait un sens
- [Durcir une CI GitHub Actions](hardening.md) - protéger le token qui pousse le tag et la release
- [Renovate : valider la config et son silence sur les forks](renovate-config.md) - garder les commits automerge conformes à la convention
