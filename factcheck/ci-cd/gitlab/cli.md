---
article: docs/ci-cd/gitlab/cli.md
checked: '2026-11-11'
commit: 7718eef08a243cab77af08048a75d2f405f526c9
sources: []
unpinned: 2
---

# docs/ci-cd/gitlab/cli.md

## Findings

- L23 IMPRECISE corrigé : ajout d'une phrase avant le bloc et mention que `--fill` pousse la branche, `--push=false` pour l'éviter. Preuve : gitlab-org/cli `internal/commands/mr/create/mr_create.go` L214/L218 @ v1.128.0 ("Pushes the branch unless --push=false is set").
- L48 IMPRECISE corrigé : "en 2023" -> "moderne", ajout de PowerShell dans les shells. Preuve : `internal/commands/completion/completion.go` L148 @ v1.128.0 ("Shell type: bash, zsh, fish, powershell").

## En plus

- L12 "intérêt principale" -> "principal", L18 "non archiver en concernant" -> "non archivés en conservant", "je serai potentiellement être amené" -> "je suis potentiellement amené".
- Vérifiés sans changement : `repo clone -g/--archived/--paginate/-p`, `ssh-key add -t` (flag `title` obligatoire), `repo search -s`, `GL_HOST`/`GITLAB_HOST`, ligne compdef zsh.

## Modernisation

- Appliqué : `--exclude-subgroup` (présent depuis v1.123.0).
- Non appliqué : `--wiki`, exclusif avec `--group` (`MarkFlagsMutuallyExclusive("group", "wiki")`), sans intérêt pour le clonage récursif ; `--active` redondant avec `--archived=false` ici.

## Tests

- Lecture source glab v1.128.0, clone créé dans `~/Documents/work/src/glab` (le clone `src/cli` existant est GitHub CLI).

## À signaler

- Rien.
