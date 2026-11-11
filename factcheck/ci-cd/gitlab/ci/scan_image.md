---
article: docs/ci-cd/gitlab/ci/scan_image.md
checked: '2026-11-10'
commit: 117cd6b415760fef7341ce3fae160efd6a5b7221
sources: []
unpinned: 6
---

# docs/ci-cd/gitlab/ci/scan_image.md

## Findings

- L31 ERROR corrigé : tout le `before_script` (récupération de version sans `v`, install.sh, curl du template) est supprimé, le job part de l'image `aquasec/trivy:0.76.2` qui embarque `/contrib/gitlab.tpl`. Preuve : reproduit dans alpine:3.20, `TRIVY_VERSION=0.76.2` puis install.sh -> "crit unable to find '0.76.2'" (rc=1) ; Dockerfile @v0.76.2 `COPY contrib/*.tpl contrib/`.
- L35 ERROR corrigé : même correction (plus de téléchargement du template). Preuve : même test, curl de `raw/0.76.2/contrib/gitlab.tpl` -> HTTP 404 et page HTML écrite dans le fichier.
- L22 OUTDATED corrigé : `alpine:3.11` remplacé par `aquasec/trivy:0.76.2` (base alpine:3.24.3 selon le Dockerfile du tag). Fin de vie Alpine 3.11 non revérifiée, sans objet après le changement d'image.
- L50 OUTDATED corrigé : lien -> <https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/> (HTTP 200), et mention de l'intégration native GitLab 15.0 avec le bloc `include`. Preuve : docs/tutorials/integrations/gitlab-ci.md @origin/main "GitLab 15.0 includes free integration with Trivy" ; travis-ci.md et circleci.md toujours présents dans docs/tutorials/integrations/.
- L24 IMPRECISE corrigé : commentaire Clair recopié du template supprimé. Preuve : contrib/Trivy.gitlab-ci.yml @origin/main (texte identique).
- L33 IMPRECISE corrigé : `docker login -p` remplacé par `TRIVY_USERNAME` / `TRIVY_PASSWORD`. Preuve : pkg/flag/registry_flags.go @v0.76.2 (flags `username`/`password`, mappés en TRIVY_*), contrib/Trivy.gitlab-ci.yml utilise `trivy registry login`.

## En plus

- L10 typo "créé" -> "crée".
- Phrase ajoutée sur le piège `allow_failure: true` + `--exit-code 0` (le job cassé passait inaperçu, cf. risk_note).

## Modernisation

- Template GitLab `Security/Container-Scanning.gitlab-ci.yml` : appliqué (bloc `include` en tête de section).
- Image `aquasec/trivy` avec entrypoint vidé : appliqué.
- TRIVY_USERNAME/TRIVY_PASSWORD : appliqué.
- Template `/contrib/gitlab.tpl` de l'image : appliqué.
- `tested_with: "Trivy 0.76.2"` ajouté.

## Tests

- alpine:3.20 : reproduction de l'ancien snippet (échec install.sh, 404 template).
- aquasec/trivy:0.76.2 (entrypoint vidé) : `trivy image --exit-code 0 --format template --template "@/contrib/gitlab.tpl" -o r.json alpine:3.20` -> rapport JSON GitLab valide (scanner trivy, version 0.76.2). Pas testé dans un vrai runner GitLab ni contre une registry privée.

## À signaler

- `IMAGE: "$CI_REGISTRY_IMAGE"` gardé comme dans l'original (scanne le tag `latest`). Le contrib officiel utilise `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA`, à choisir selon le flux de build.
- Le tag `aquasec/trivy:0.76.2` est épinglé : Renovate ne le bumpera pas dans un article.
