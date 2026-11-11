---
article: docs/ci-cd/gitlab/ci/optimize.md
checked: '2026-11-10'
commit: a76bf1e1430f727914ce11b0a3c48d00c52af768
sources: []
unpinned: 10
---

# docs/ci-cd/gitlab/ci/optimize.md

## Findings

- L73 ERROR corrigé : `FF_ENABLE_BASH_EXIT_CODE_CHECK` décrit comme vérification du code retour après chaque commande, sans lien avec les pipes; mention que le runner active déjà `pipefail`. Preuve : gitlab-runner `docs/configuration/feature-flags.md:53` @origin/main (défaut `false`, "check for a non-zero exit code after each script command"), `shells/bash.go:453` (`case "$(set -o)" in *"pipefail"*) set -o pipefail;; esac; set -o errexit`).
- L61 OUTDATED corrigé : Fastzip présenté comme actif par défaut depuis 19.4, flag déprécié, `FF_USE_FASTZIP` gardé seulement pour un runner < 19.4 et retiré des blocs YAML. Preuve : feature-flags.md absent @v13.5.0, `false` @v13.6.0 et @v19.3.0, `true` @v19.4.0. Le fact-check annonçait une suppression en 19.7 : c'est 19.7 @v19.5.3 mais 19.9 sur origin/main, donc l'article ne cite pas de version de suppression.
- L72 OUTDATED corrigé : `FF_TIMESTAMPS` actif par défaut depuis le runner 19.0, retiré du bloc YAML. Preuve : feature-flags.md `false` @v18.6.0, `true` @v19.0.0 et origin/main:77.
- L14 IMPRECISE corrigé : chiffres 30-50% et 95% retirés (aucune source), ajout du défaut 20 des nouveaux projets. Preuve : docs.gitlab.com/ci/pipelines/settings/ ("Newly created projects have a default git depth value of 20", "If most of your jobs do not need history, set the value to 1"). Le risque d'échec des jobs rejoués avec `GIT_DEPTH: 1` avancé par le fact-check est non vérifié (absent de cette page), pas ajouté.
- L31 IMPRECISE corrigé : `interruptible` lié à l'option projet *Auto-cancel redundant pipelines*, ajout du comportement `conservative` par défaut et d'un exemple `workflow:auto_cancel:on_new_commit`. Preuve : docs.gitlab.com/ci/yaml/ ("conservative: Cancel the pipeline, but only if no jobs with interruptible: false have started yet", défaut).
- L54 IMPRECISE corrigé : un `buildah push` par tag, "syntaxe identique" devient "très proche". Preuve : quay.io/buildah/stable:v1.38.0 + registry:2.8.3, build avec `-t ...:prod -t ...:latest` puis `buildah push <image>` : `tags/list` = `["latest"]` uniquement. La remarque `--storage-driver vfs` en conteneur non privilégié est non vérifiée (test fait en `--privileged`), pas ajoutée.
- L128 IMPRECISE corrigé : `.pip` devient `.cache/pip`. Preuve : le snippet de l'article (`PIP_CACHE_DIR`).
- L169 IMPRECISE corrigé : 5 uploads économisés, pas 4. Preuve : docs.gitlab.com/ci/yaml/ (`pull-push` par défaut), chaque job de test en pull-push ferait un upload.
- L173 IMPRECISE corrigé : "ça ralentit" remplacé par l'exposition des secrets aux jobs. Preuve : aucune source pour un gain de temps.
- L198 IMPRECISE corrigé : ajout d'un job lent `e2e-tests` dans le stage test que `build` n'attend pas. Preuve : le snippet de l'article (lint et unit-tests étaient les seuls jobs du stage).

## En plus

- `## Divers` : phrase ajoutée avant le bloc de code (règle AGENTS.md).

## Modernisation

- Appliqué : `CACHE_COMPRESSION_FORMAT: "zipzstd"`. Preuve : `commands/helpers/cache_archiver.go` @v19.3.0 (`zip, tarzstd, zipzstd`, seulement `zip, tarzstd` @v19.2.0), recommandation `zipzstd` pour gros caches multi-cœurs dans `docs/configuration/speed_up_job_execution.md:204` @origin/main.
- Appliqué : `workflow:auto_cancel:on_new_commit`.
- Appliqué : `buildah login --password-stdin` (option présente : `buildah login --help` dans quay.io/buildah/stable:v1.38.0).
- Appliqué : lien de doc caching passé en `docs.gitlab.com/ci/caching/` (ancre `#cache-nodejs-dependencies` non vérifiée sur la nouvelle URL).

## Tests

- quay.io/buildah/stable:v1.38.0, registry:2.8.3, curlimages/curl:8.11.1 (OrbStack).
- Clone gitlab-org-gitlab-runner, tags v13.5.0 à v19.5.3 et origin/main.

## À signaler

- L'image `quay.io/buildah/stable:latest` du snippet n'est pas épinglée : à épingler si l'auteur le souhaite.
