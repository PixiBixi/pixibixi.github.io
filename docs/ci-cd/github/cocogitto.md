---
description: Automatiser le versioning sémantique et les releases avec cocogitto — cog check, cog bump, CHANGELOG, GitHub Actions. Comparaison avec release-please.
tags:
  - GitHub Actions
  - CI/CD
  - Release
  - Conventional Commits
  - Semver
---

# Releases automatiques avec cocogitto

Cocogitto valide les conventional commits, bumpe le semver automatiquement et génère un CHANGELOG. Tout se déclenche sur `git push` vers master — sans PR intermédiaire.

## Cocogitto vs release-please

Les deux outils s'appuient sur les [Conventional Commits](https://www.conventionalcommits.org/) et automatisent le versioning. Ils ont des philosophies opposées.

| | cocogitto | release-please |
|---|---|---|
| **Déclencheur** | Push direct sur master | Merge d'une Release PR |
| **Validation locale** | `cog check`, hook pre-commit | Aucune |
| **Bump** | Immédiat au push | À la merge de la PR |
| **CHANGELOG** | Format cog (`- - -`) | Keep a Changelog |
| **GitHub Release** | `gh release create` à ajouter | Créée automatiquement |
| **Config** | `cog.toml` | `release-please-config.json` |
| **Mainteneur** | Communauté | Google |

### Workflow release-please

```text
push feat → CI ouvre une "Release PR" → review → merge → GitHub Release créée
```

Release-please accumule les commits depuis la dernière release dans une PR. La release n'a lieu que si quelqu'un merge manuellement. C'est un gate humain intégré.

### Workflow cocogitto

```text
push feat → CI valide + bumpe + tag + GitHub Release → Docker/Helm buildés
```

Chaque push sur master qui contient un `feat:` ou `fix:` déclenche un bump immédiat. Zéro friction, mais zéro gate : il faut de la discipline sur les branches.

!!! warning "Bumps à répétition"
    Pousser plusieurs commits `fix:` directement sur master = autant de patch bumps. Travailler sur une branche feature et merger en une fois produit un seul bump.

## Installation

```bash
# macOS
brew install cocogitto

# Linux (binaire direct)
curl -L https://github.com/cocogitto/cocogitto/releases/latest/download/cocogitto-x86_64-unknown-linux-musl.tar.gz \
  | tar xz -C ~/.local/bin
```

## Configuration

```toml title="cog.toml"
ignore_merge_commits = true
tag_prefix = "v"          # obligatoire si vos tags existants sont en v*

[commit_types]
# Types custom pour le changelog
refacto = { changelog_title = "Refactoring" }

[changelog]
path = "CHANGELOG.md"
template = "remote"
remote = "github.com"
repository = "mon-repo"
owner = "mon-org"
authors = []
```

!!! note "tag_prefix"
    Sans `tag_prefix = "v"`, cocogitto cherche des tags `1.2.3` (sans `v`). Si vos tags existants sont `v1.2.3` (format release-please, goreleaser…), ce champ est obligatoire.

## CHANGELOG.md

Cocogitto requiert un séparateur `- - -` pour savoir où insérer chaque nouvelle section. Le fichier minimal :

```markdown
# Changelog

- - -
```

À chaque bump, cog insère le nouveau bloc entre le header et le `- - -` précédent :

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
    Le CHANGELOG généré par release-please n'a pas de `- - -`. Il faut en ajouter un manuellement avant le premier `cog bump` sinon l'erreur `cannot find default separator` bloque le CI.

## Validation locale

```bash
# Valider tous les commits depuis le dernier tag
cog check

# Valider uniquement depuis le dernier tag (plus rapide)
cog check --from-latest-tag

# Voir ce que le prochain bump produirait
cog bump --auto --dry-run

# Bumper manuellement
cog bump --patch   # 1.2.3 → 1.2.4
cog bump --minor   # 1.2.3 → 1.3.0
cog bump --major   # 1.2.3 → 2.0.0
```

## Hook pre-commit

Cog peut valider le message de commit avant qu'il soit enregistré :

```yaml title=".pre-commit-config.yaml"
repos:
  - repo: local
    hooks:
      - id: cog-verify
        name: Conventional commit check
        language: system
        entry: cog verify
        stages: [commit-msg]
        args: ["--file", ".git/COMMIT_EDITMSG"]
```

## GitHub Actions

```yaml title=".github/workflows/release.yml"
name: Release

on:
  push:
    branches: [master]

permissions:
  contents: write
  packages: write

jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      bumped: ${{ steps.bump.outputs.bumped }}
      tag_name: ${{ steps.bump.outputs.tag_name }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # obligatoire — cog a besoin de tout l'historique
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: oknozor/cocogitto-action@v3
        with:
          git-user: github-actions[bot]
          git-user-email: github-actions[bot]@users.noreply.github.com
          check-latest-tag-only: true   # ne valide que les commits depuis le dernier tag

      - name: Bump version
        id: bump
        run: |
          BEFORE=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
          cog bump --auto || true
          AFTER=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
          if [ "$BEFORE" != "$AFTER" ]; then
            git push
            git push origin "$AFTER"
            echo "bumped=true" >> "$GITHUB_OUTPUT"
            echo "tag_name=$AFTER" >> "$GITHUB_OUTPUT"
          else
            echo "bumped=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Create GitHub release
        if: steps.bump.outputs.bumped == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG="${{ steps.bump.outputs.tag_name }}"
          NOTES=$(awk "/^## .*${TAG#v}/{found=1; next} found && /^- - -/{exit} found{print}" CHANGELOG.md)
          gh release create "$TAG" \
            --title "$TAG" \
            --notes "${NOTES:-Release $TAG}" \
            --verify-tag

  build-push:
    needs: release
    if: needs.release.outputs.bumped == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ needs.release.outputs.tag_name }}

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}},value=${{ needs.release.outputs.tag_name }}
            type=semver,pattern={{major}}.{{minor}},value=${{ needs.release.outputs.tag_name }}
            type=raw,value=latest   # non généré automatiquement hors push de tag natif
            type=sha,prefix=sha-

      - uses: docker/build-push-action@v6
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

!!! note "tag latest non automatique"
    `docker/metadata-action` ne génère `latest` automatiquement que sur un push de tag GitHub (`on: push: tags: ['v*']`). Ici le trigger est un push de branche, donc il faut `type=raw,value=latest` explicitement.

## Logique de bump

| Commit | Bump |
|--------|------|
| `fix:` | patch — `1.2.3 → 1.2.4` |
| `feat:` | minor — `1.2.3 → 1.3.0` |
| `feat!:` ou `BREAKING CHANGE` | major — `1.2.3 → 2.0.0` |
| `chore:`, `docs:`, `ci:` | aucun bump |

## Quand choisir quoi

**Cocogitto** si :

- Projet solo ou petite équipe, merge direct sur main
- Tu veux valider les commits localement avant push
- Tu veux des releases immédiates sans étape manuelle

**release-please** si :

- Équipe avec review obligatoire avant release
- Tu veux un gate humain explicite sur chaque release
- Tu travailles déjà avec les PR GitHub comme unité de travail
