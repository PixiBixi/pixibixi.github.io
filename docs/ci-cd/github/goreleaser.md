---
description: Publier des binaires Go multi-arch, images OCI et charts Helm en une commande avec GoReleaser — build flags, UPX, ko, ghcr.io, GitHub Actions.
tags:
  - GitHub Actions
  - Go
  - GoReleaser
  - CI/CD
  - Release
---

# Releases Go avec GoReleaser

GoReleaser génère changelog, binaires multi-arch, archives, images Docker et charts Helm depuis un fichier de config. Tout se déclenche sur `git push --tags`.

## Flow

![Flow GoReleaser](release-flow.svg)

## Installation

```bash
# macOS
brew install goreleaser

# Linux (binaire direct)
curl -sfL https://goreleaser.com/static/run | bash
```

## Configuration de base

```yaml title=".goreleaser.yml"
version: 2

before:
  hooks:
    - go mod tidy
    - go mod verify

builds:
  - id: mon-binaire
    binary: mon-binaire
    env:
      - CGO_ENABLED=0
    goos:
      - linux
      - darwin
      - windows
    goarch:
      - amd64
      - arm64
    ignore:
      - goos: windows
        goarch: arm64
    flags:
      - -trimpath
    ldflags:
      - -s -w
      - -X main.version={{.Version}}
      - -X main.commit={{.Commit}}
      - -X main.date={{.Date}}

archives:
  - formats: [tar.gz]
    name_template: "{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}"
    format_overrides:
      - goos: windows
        formats: [zip]
    files:
      - README.md
      - LICENSE*

checksum:
  name_template: checksums.txt

release:
  draft: false
  prerelease: auto
```

## Réduire la taille des binaires

Trois flags suffisent pour gagner ~33% :

| Flag | Effet |
|------|-------|
| `-s` | Supprime la table des symboles |
| `-w` | Supprime les infos de debug DWARF |
| `-trimpath` | Supprime les chemins locaux embarqués dans le binaire |
| `CGO_ENABLED=0` | Désactive CGO → binaire statique pur |

Résultat mesuré sur [gopen](https://github.com/PixiBixi/gopen) : **3,0 Mo → 2,0 Mo (-33%)**.

## Compression UPX (Linux uniquement)

UPX compresse le binaire ; il se décompresse au lancement.

Gains mesurés sur la layer binaire de [kubearch](https://github.com/PixiBixi/kubearch) (`ghcr.io/pixibixi/kubearch`) :

| Arch | Sans UPX (v0.2.0) | Avec UPX (v0.3.1) | Gain |
|------|-------------------|-------------------|------|
| amd64 | 14,91 MB | 8,34 MB | **-44%** |
| arm64 | — | 6,61 MB | — |

```yaml
upx:
  - enabled: true
    ids: [mon-binaire]
    compress: best
    lzma: true
    goos: [linux]
```

!!! warning "UPX et macOS/Windows"
    Sur macOS, UPX casse la notarisation Apple. Sur Windows, les antivirus le signalent. À limiter à `goos: [linux]`.

## Signature des artefacts (cosign)

[Cosign](https://github.com/sigstore/cosign) signe en mode keyless, sans clé à gérer. L'identité vient de l'OIDC GitHub Actions ; chaque signature est enregistrée dans le transparency log de [Sigstore](https://www.sigstore.dev/).

### .goreleaser.yml

```yaml
signs:
  - cmd: cosign
    signature: "${artifact}.sigstore.json"
    args:
      - sign-blob
      - "--bundle=${signature}"
      - "${artifact}"
      - "--yes"
    artifacts: checksum   # signe checksums.txt, qui couvre tous les binaires/archives

docker_signs:
  - cmd: cosign
    args:
      - sign
      - "--yes"
      - "${artifact}"
    artifacts: manifests   # signe les manifests multi-arch, pas les images individuelles
```

!!! note "Pourquoi signer le checksum plutôt que chaque archive ?"
    `checksums.txt` contient les SHA256 de tous les artefacts. Signer ce fichier couvre tout : on vérifie la signature une fois, puis le SHA256 de chaque archive.

### GitHub Actions — permissions requises

Deux ajouts par rapport au workflow de base :

```yaml
permissions:
  contents: write
  packages: write
  id-token: write   # requis pour la signature OIDC keyless
```

```yaml
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
```

### Vérifier les artefacts (côté utilisateur)

```bash
# 1. Vérifier la signature du checksum
cosign verify-blob \
  --certificate-identity 'https://github.com/monorg/mon-repo/.github/workflows/release.yml@refs/tags/vX.Y.Z' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --bundle checksums.txt.sigstore.json \
  checksums.txt

# 2. Vérifier l'intégrité des binaires
sha256sum --ignore-missing -c checksums.txt

# 3. Vérifier l'image Docker
cosign verify \
  --certificate-identity 'https://github.com/monorg/mon-repo/.github/workflows/release.yml@refs/tags/vX.Y.Z' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/monorg/mon-image:vX.Y.Z
```

## Images OCI multi-arch (ko)

[ko](https://ko.build) est un builder d'images OCI natif Go : il cross-compile le binaire et l'emballe dans une image distroless **sans Dockerfile, sans Docker daemon, sans buildx**. GoReleaser v2 l'intègre nativement via la clé `kos:`.

```yaml
kos:
  - id: mon-binaire
    repositories:
      - ghcr.io/monorg/mon-image
    base_image: gcr.io/distroless/static:nonroot
    platforms:
      - linux/amd64
      - linux/arm64
    tags:
      - "{{ .Version }}"          # 1.2.3
      - "{{ .Major }}.{{ .Minor }}" # 1.2
      - "{{ .Major }}"             # 1
      - '{{ if not .Prerelease }}latest{{ end }}'
    bare: true   # ghcr.io/monorg/mon-image:1.2.3 (sans suffixe binaire)
```

Ko génère automatiquement un manifest multi-arch et publie des SBOMs par image. Il utilise le `GITHUB_TOKEN` pour s'authentifier sur `ghcr.io` — aucun `docker login` ni step buildx requis dans le workflow CI.

!!! note "Pas de Dockerfile nécessaire"
    Pour un binaire Go pur (`CGO_ENABLED=0`), ko remplace entièrement le duo `Dockerfile.release` + `docker_manifests`. Pour les builds locaux de développement (avec un vrai Dockerfile multi-stage), on peut garder un `Dockerfile` séparé.

!!! warning "Visibilité GHCR"
    La première image publiée est privée par défaut sur GHCR, même pour un repo public. À rendre public manuellement : **GitHub → Packages → mon-image → Package settings → Change visibility**.

## Helm chart vers OCI

GoReleaser ne gère pas nativement le push Helm, mais on l'ajoute en step post-GoReleaser dans le workflow :

```yaml
- name: Push Helm chart to OCI
  run: |
    CHART_VERSION="${GITHUB_REF_NAME#v}"
    helm registry login ghcr.io \
      --username "${{ github.repository_owner }}" \
      --password "${{ secrets.GITHUB_TOKEN }}"
    helm package charts/mon-chart \
      --version "$CHART_VERSION" \
      --app-version "$CHART_VERSION"
    helm push "mon-chart-${CHART_VERSION}.tgz" oci://ghcr.io/monorg/charts
```

## GitHub Actions

```yaml title=".github/workflows/release.yml"
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  packages: write   # push vers ghcr.io
  id-token: write   # signature cosign keyless

jobs:
  goreleaser:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # GoReleaser a besoin de l'historique complet pour le changelog

      - uses: actions/setup-go@v5
        with:
          go-version: stable

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v6
        with:
          version: '~> v2'
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

!!! note "fetch-depth: 0"
    Sans `fetch-depth: 0`, GitHub Actions fait un clone superficiel. GoReleaser ne peut pas générer le changelog car il n'a pas accès aux commits précédents.

## Commandes utiles

```bash
# Valider la config sans déclencher de release
goreleaser check

# Tester localement (snapshot = pas de tag requis, pas de push)
goreleaser release --snapshot --clean

# Release manuelle (si pas de CI)
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

## Changelog

GoReleaser génère le changelog entre deux tags. On peut filtrer et regrouper :

```yaml
changelog:
  sort: asc
  filters:
    exclude:
      - '^docs:'
      - '^test:'
      - '^chore:'
  groups:
    - title: Features
      regexp: '^feat:'
      order: 0
    - title: Bug Fixes
      regexp: '^fix:'
      order: 1
    - title: Performance
      regexp: '^perf:'
      order: 2
    - title: Others
      order: 999
```
