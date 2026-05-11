---
description: GitLab CI/CD — optimisation des pipelines, scan d'images et CLI glab.
tags:
  - GitLab CI
  - CI/CD
  - GitLab
---

# CI/CD

Une CI lente ou mal configurée, ça coûte du temps et de l'argent. 3 articles ici, mais denses : optimisation des pipelines GitLab, scan de sécurité d'images, et la CLI `glab` pour ne plus toucher l'interface web.

## Contenus

### GitHub Actions

- [GoReleaser](github/goreleaser.md) — binaires multi-arch, images Docker, Helm OCI, UPX, GitHub Actions
- [Cocogitto](github/cocogitto.md) — versioning sémantique automatique, CHANGELOG, GitHub Releases — comparaison avec release-please

### GitLab

- [Optimiser sa CI GitLab](gitlab/ci/optimize.md) — clone superficiel, cache, DAG et feature flags
- [Scanner les images](gitlab/ci/scan_image.md) — intégrer un scan de vulnérabilités dans la CI
- [GitLab CLI](gitlab/cli.md) — `glab` pour gérer MRs, pipelines et issues en ligne de commande
