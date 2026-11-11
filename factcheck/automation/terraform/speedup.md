---
article: docs/automation/terraform/speedup.md
checked: '2026-11-11'
commit: 665edf59c63c106768e32e45ed4c03b8c3c6ce20
sources: []
unpinned: 4
---

# docs/automation/terraform/speedup.md

## Findings

- L13 IMPRECISE corrigé : précisé que `-parallelism` se passe à `plan`, `apply` et `destroy`, pas à `init`, avec un exemple `terraform apply -parallelism=20`. La valeur 10 était juste. Preuve : hashicorp/terraform `internal/command/arguments/extended.go` @v1.17.1 L21 (`DefaultParallelism = 10`) et L278 (flag des opérations plan/apply), `import.go` L76, `test.go` L73 ; aucun flag `parallelism` côté init.
- L26 IMPRECISE corrigé : admonition ajoutée, depuis Terraform 1.4 le cache n'est utilisé que si le checksum figure dans `.terraform.lock.hcl`, avec l'opt-out `TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE` / `plugin_cache_may_break_dependency_lock_file`. Preuve : CHANGELOG.md @v1.4.0 L10 ; `internal/command/cliconfig/cliconfig.go` @v1.17.1 L32 (variable d'env) ; test Docker ci-dessous.
- L46 IMPRECISE corrigé : "keyword cache de Terraform" devient "keyword `cache` de GitLab CI". Évident, pas de test.
- L51 IMPRECISE corrigé : `terraform:latest` remplacé par `hashicorp/terraform:1.17.1` + `entrypoint: [""]`. Preuve : `docker manifest inspect terraform:latest` échoue (pas d'image library), `hashicorp/terraform` existe (tags 1.17.1, 1.17, latest) ; `docker image inspect hashicorp/terraform:1.17.1` donne `Entrypoint ["/bin/terraform"]` (build.Dockerfile @v1.17.1 L59). Le besoin de vider l'entrypoint dans GitLab CI vient de la doc GitLab, pas testé sur un runner.

## En plus

- Bloc de config CLI tagué `ini` alors que `~/.terraformrc` est du HCL : tag passé en `hcl`, fichier nommé. `${HOME}` y est bien développé (cliconfig.go L193, `os.ExpandEnv`).
- Ajout : le dossier de cache doit exister. Preuve : `TF_PLUGIN_CACHE_DIR=/nope terraform init` sous 1.17.1 affiche `Error: The specified plugin cache dir /nope cannot be opened`.

## Modernisation

- Appliqué : `plugin_cache_may_break_dependency_lock_file` (dans l'admonition lock file).
- Appliqué : monter `-parallelism` par paliers (ajouté au warning existant).

## Tests

- hashicorp/terraform:1.17.1 en Docker, provider hashicorp/null 3.2.4, cache partagé : 1er init "Installed", 2e repo sans lock file "Installed" à nouveau (cache ignoré), 3e repo avec le lock file copié "Using ... from the shared cache directory". Avec `TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE=true` sans lock file : "Using ... from the shared cache directory" + warning "Incomplete lock file information for providers".

## À signaler

- Le template GitLab a un bloc `artifacts:` avec seulement `expire_in`, sans `paths` : il ne sert à rien en l'état, laissé tel quel (choix de l'auteur).
- `tested_with: "Terraform 1.17"` ajouté (version testée dans ce passage).
