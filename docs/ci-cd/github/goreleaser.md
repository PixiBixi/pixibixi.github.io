---
description: Publier des binaires Go multi-arch, images OCI et charts Helm en une commande avec GoReleaser - build flags, UPX, ko, ghcr.io, signature cosign, provenance SLSA, GitHub Actions.
tags:
  - GitHub Actions
  - Go
  - GoReleaser
  - CI/CD
  - Release
---

# Releases Go avec GoReleaser

GoReleaser génère changelog, binaires multi-arch, archives, images Docker et charts Helm depuis un fichier de config. Tout se déclenche sur `git push --tags`.

!!! tip "Avant le release, le CI"
    GoReleaser intervient une fois le tag poussé. Ce qui tourne *avant*, sur chaque push et PR (test, lint, scan de vulnérabilités, durcissement des workflows), est détaillé dans [CI GitHub Actions durcie pour un projet Go](go-ci.md).

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
    main: .   # défauté par GoReleaser, mais ko lit la valeur brute (voir plus bas)
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
      - -s   # implique -w, voir plus bas
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

3 flags suffisent pour gagner ~33% :

| Flag | Effet |
|------|-------|
| `-s` | Supprime la table des symboles, et le DWARF avec |
| `-trimpath` | Supprime les chemins locaux embarqués dans le binaire |
| `CGO_ENABLED=0` | Désactive CGO → binaire statique pur |

Résultat mesuré sur [gopen](https://github.com/PixiBixi/gopen) : **3,0 Mo → 2,0 Mo (-33%)**.

### `-s -w` : le `-w` ne sert à rien

On voit `-s -w` partout, dans la doc GoReleaser comme dans la moitié des projets Go. Le
`-w` est redondant : le linker le dérive de `-s` sauf s'il est passé explicitement.

```go title="$GOROOT/src/cmd/link/internal/ld/main.go:274"
*FlagW = *FlagS // -s implies -w if not explicitly set
```

Mesuré sur le contrôleur d'ingress HAProxy, `linux/amd64`, `-trimpath` sur les 4 builds :

| ldflags | Taille | `.symtab` | Sections `.debug*` |
|---|---|---|---|
| aucun | 103 276 329 o | oui | 8 |
| `-s` | 72 913 056 o | non | 0 |
| `-w` | 83 023 367 o | oui | 0 |
| `-s -w` | 72 913 056 o | non | 0 |

`-s` seul et `-s -w` sortent la même taille à l'octet près, avec les mêmes sections.
L'inverse n'est pas vrai : `-w` seul ne retire que le DWARF et garde la table des symboles,
soit 10 Mo de moins que `-s`. Écrire `-s` seul dit exactement ce qu'on demande.

### Ce que le strip ne coûte pas

L'objection habituelle, c'est la perte des stack traces. Elle ne tient pas : une trace Go
se lit dans le `pclntab`, que le linker conserve quels que soient les flags, et ni `-s` ni
`-w` n'y touchent. Le même panic sur 2 binaires, avec et sans `-s`, sort 2 traces
identiques, noms de fonctions et numéros de ligne compris. `net/http/pprof` est intact pour
la même raison, la symbolisation se fait dans le runtime.

Ce qu'on perd réellement : le debug source-level avec delve sur un process vivant,
`go tool nm` et l'analyse de core dump sous gdb.

!!! warning "Ce n'est pas du durcissement"
    `-s` ne complique pas sérieusement le reverse engineering d'un binaire Go, le `pclntab` reste lisible et porte les noms de fonctions. C'est un gain de taille, pas une mesure de sécurité, et le vendre autrement fait prendre de mauvaises décisions.

## Compression UPX (Linux uniquement)

UPX compresse le binaire ; il se décompresse au lancement.

Gains mesurés sur la layer binaire de [kubearch](https://github.com/PixiBixi/kubearch) (`ghcr.io/pixibixi/kubearch`) :

| Arch | Sans UPX (v0.2.0) | Avec UPX (v0.3.1) | Gain |
|------|-------------------|-------------------|------|
| amd64 | 14,91 MB | 8,34 MB | **-44%** |
| arm64 | - | 6,61 MB | - |

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

### GitHub Actions - permissions requises

2 ajouts par rapport au workflow de base :

```yaml
permissions:
  contents: write
  packages: write
  id-token: write   # requis pour la signature OIDC keyless
```

```yaml
      - name: Install cosign
        uses: sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2
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

### Attester la provenance des artefacts

La signature dit **qui** a publié, pas **comment** l'artefact a été construit. C'est ce que couvre l'attestation SLSA, détaillée dans [Durcir une CI GitHub Actions](hardening.md#attester-comment-lartefact-a-ete-construit) - elle n'a rien de spécifique à Go ni à GoReleaser. Le seul détail propre à ce pipeline, c'est ce qu'on lui donne à attester : GoReleaser écrit tout dans `dist/`, donc les archives et le `checksums.txt` déjà signé par cosign.

```yaml title=".github/workflows/release.yml"
      - name: Attest build provenance
        uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4.2.2
        with:
          subject-path: 'dist/*.tar.gz,dist/*.zip,dist/checksums.txt'
```

Si le pipeline pousse aussi une image (via `kos:` plus bas), son digest se récupère dans `dist/artifacts.json`, que GoReleaser écrit en fin de run avec une entrée par artefact produit.

## Images OCI multi-arch (ko)

[ko](https://ko.build) est un builder d'images OCI natif Go : il cross-compile le binaire et l'emballe dans une image distroless **sans Dockerfile, sans Docker daemon, sans buildx**. GoReleaser v2 l'intègre nativement via la clé `kos:`.

```yaml
kos:
  - id: mon-binaire
    main: .   # obligatoire depuis Go 1.27, voir l'avertissement plus bas
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

Ko génère automatiquement un manifest multi-arch et publie des SBOMs par image. Il utilise le `GITHUB_TOKEN` pour s'authentifier sur `ghcr.io` - aucun `docker login` ni step buildx requis dans le workflow CI.

!!! note "Pas de Dockerfile nécessaire"
    Pour un binaire Go pur (`CGO_ENABLED=0`), ko remplace entièrement le duo `Dockerfile.release` + `docker_manifests`. Pour les builds locaux de développement (avec un vrai Dockerfile multi-stage), on peut garder un `Dockerfile` séparé.

!!! warning "Visibilité GHCR"
    La première image publiée est privée par défaut sur GHCR, même pour un repo public. À rendre public manuellement : **GitHub → Packages → mon-image → Package settings → Change visibility**.

!!! warning "Go 1.27 impose un `main:` explicite"
    GoReleaser défaute `kos[].main` sur le `main:` du build correspondant, qui vaut `""` tant qu'on ne l'a pas écrit, et ko passe cette chaîne vide à `go list`. Go 1.26 la résolvait silencieusement en répertoire courant, Go 1.27 la rejette avec `go: invalid package: ""`. Le symptôme est trompeur : les binaires, les archives, les checksums et la formule Homebrew se construisent normalement, puis le run meurt à la toute fin sur `ko: does not contain a valid local import path ()`, sans release GitHub ni image. Poser `main: .` dans `kos:` et dans `builds:` referme le trou des 2 côtés.

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
  packages: write        # push vers ghcr.io
  id-token: write        # signature cosign keyless
  attestations: write    # provenance SLSA

jobs:
  goreleaser:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0   # GoReleaser a besoin de l'historique complet pour le changelog
          persist-credentials: false

      - uses: actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e # v7.0.0
        with:
          go-version-file: go.mod

      - name: Install cosign
        uses: sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@f06c13b6b1a9625abc9e6e439d9c05a8f2190e94 # v7.2.3
        with:
          version: '~> v2'
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Les actions sont épinglées par SHA et le checkout ne garde pas le token, pour les raisons détaillées dans [l'article durcissement](hardening.md) : un workflow de release détient `contents: write`, c'est le dernier endroit où laisser traîner un tag mutable.

Le step `Install cosign` est à garder **même dans un pipeline qui ne signe rien**. `goreleaser-action` télécharge le binaire GoReleaser depuis les releases GitHub, vérifie son checksum, puis contrôle la signature cosign du `checksums.txt` d'où vient ce checksum et sans cosign dans le `PATH` elle abandonne ce second contrôle sur une simple ligne de log :

```text
Checksum verified for goreleaser_Linux_x86_64.tar.gz
cosign not found in PATH, skipping signature verification
```

Le run reste vert, donc ça passe inaperçu pendant des mois. Le checksum seul ne prouve que la cohérence entre 2 fichiers servis par la même release : c'est la signature keyless qui rattache ce `checksums.txt` au pipeline de release de GoReleaser. Poser l'étape avant `Run GoReleaser` referme le trou pour le prix d'une action de plus :

```yaml title=".github/workflows/release.yml"
      # goreleaser-action verifies the cosign signature of the goreleaser
      # binary it downloads; without cosign on PATH it silently skips that check.
      - name: Install cosign
        if: github.ref_type == 'tag' || steps.tag.outputs.new_tag != ''
        uses: sigstore/cosign-installer@6f9f17788090df1f26f669e9d70d6ae9567deba6 # v4.1.2

      - name: Run GoReleaser
        if: github.ref_type == 'tag' || steps.tag.outputs.new_tag != ''
        uses: goreleaser/goreleaser-action@f06c13b6b1a9625abc9e6e439d9c05a8f2190e94 # v7.2.3
```

La condition `if:` est celle du pipeline piloté par svu décrit dans [l'article CI](go-ci.md#le-workflow-taguer-puis-publier-en-un-seul-job) : cosign porte la même que GoReleaser, sinon on l'installe sur chaque push qui ne release rien. Sur un workflow déclenché uniquement par un tag, elle saute.

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

GoReleaser génère le changelog entre 2 tags. On peut filtrer et regrouper :

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
