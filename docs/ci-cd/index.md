---
description: CI/CD GitHub Actions et GitLab - durcissement supply-chain, releases automatisées, optimisation des pipelines, scan d'images et CLI glab.
tags:
  - GitHub Actions
  - GitLab CI
  - CI/CD
  - GitLab
---

# CI/CD

Une CI lente ou mal configurée, ça coûte du temps et de l'argent. Une CI mal durcie, ça coûte bien plus. 8 articles : durcissement supply-chain des workflows GitHub Actions, releases automatisées et côté GitLab l'optimisation des pipelines, le scan d'images et la CLI `glab`.

## Contenus

### GitHub Actions

- [Durcir une CI GitHub Actions](github/hardening.md) - SHA pinning, permissions least-privilege, injection de template, zizmor, actionlint, cooldown Renovate et Dependabot, provenance SLSA
- [CI pour un projet Go](github/go-ci.md) - `go test -race`, build multi-plateforme, golangci-lint, gocritic, govulncheck, release calculée par svu
- [GoReleaser](github/goreleaser.md) - binaires multi-arch, images Docker, Helm OCI, UPX, signature cosign et provenance SLSA
- [Cocogitto](github/cocogitto.md) - versioning sémantique automatique, CHANGELOG, GitHub Releases - comparaison avec release-please
- [Valider une config Renovate](github/renovate-config.md) - `renovate-config-validator`, clés inconnues, `github-runners` qui n'est pas un manager et `forkProcessing` sur un fork

### GitLab

- [Optimiser sa CI GitLab](gitlab/ci/optimize.md) - clone superficiel, cache, DAG et feature flags
- [Scanner les images](gitlab/ci/scan_image.md) - intégrer un scan de vulnérabilités dans la CI
- [GitLab CLI](gitlab/cli.md) - `glab` pour gérer MRs, pipelines et issues en ligne de commande
