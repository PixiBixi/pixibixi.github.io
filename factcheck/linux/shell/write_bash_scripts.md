---
article: docs/linux/shell/write_bash_scripts.md
checked: '2026-11-10'
commit: b2f921214fe56dba31753e10b9f942438d2c3ad4
sources: []
unpinned: 7
---

# docs/linux/shell/write_bash_scripts.md

## Findings

- L210 ERROR corrigé : `-e` décrit avec ses exceptions (`if`, `while`, `!`, liste `&&`/`||`), conseil `|| exit 1` ou `trap ... ERR` pour les commandes critiques. Preuve : bash:5.2.37, `set -euo pipefail; false && true; if false; then :; fi; ! true; echo still-running` affiche `still-running`. Le cas `while` vient du manuel bash (The Set Builtin), non testé.
- L280 ERROR corrigé : `grep -q 'command not found'`, phrase sur les quotes et la locale. Preuve : bash:5.2.37, version originale : `grep: not: No such file or directory`, `grep: found: ...`, rc=2; version quotée : affiche `oops`.
- L294 ERROR corrigé : cible `example.com:80`, ajout de `Connection: close`, explication du blocage keep-alive et de l'absence de TLS avec `/dev/tcp`. Preuve : bash:5.2.37, avec `Connection: close` `cat` sort en rc=0 (`HTTP/1.1 200 OK`); sans, `timeout 15 cat` tue cat (rc=143).
- L70 IMPRECISE corrigé : "une seule façon" devient "la forme de base est `NOM=valeur`", avec `declare`, `local`, `read`, `printf -v`. Preuve : builtins bash connus, non re-testés un par un.
- L79 IMPRECISE corrigé (nuance) : majuscules gardées comme conseil de l'auteur, ajout du risque d'écraser `PATH`/`HOME`/`USER` et de la convention minuscules pour les variables locales. Preuve : convention de style, pas de spécification; à arbitrer par l'auteur.
- L158 IMPRECISE corrigé : phrase avant le bloc indiquant que le pas demande bash 4+. Preuve : `/bin/bash` macOS 3.2.57 : `echo {0..10..2}` affiche `{0..10..2}`; bash:5.2.37 : `0 2 4 6 8 10`.
- L274 IMPRECISE corrigé : `:` présenté comme builtin no-op dont les arguments sont développés. Preuve : bash:5.2.37, `echo avant && : $(echo side >&2) && echo apres` affiche `side`.

## En plus

- L65 corrigé : `$?` = code retour de la dernière commande (pas "de votre programme script...").
- L128 corrigé : la ligne `${FOO:2:2}` seule exécutait le résultat comme une commande; devient `echo "${FOO:2:2}"`.
- L286 corrigé : typo `2&'>1` en `2>&1`.

## Modernisation

- Appliqué : `trap ERR` / `|| exit` mentionnés dans l'explication de `-e`.
- Appliqué : `echo -e` remplacé par `printf` dans le snippet `/dev/tcp`.
- Non appliqué : shellcheck en pre-commit/CI, hors du périmètre de l'article tel qu'écrit.

## Tests

- bash:5.2.37 (Docker/OrbStack), `/bin/bash` 3.2.57 de macOS.

## À signaler

- La section "Tests conditionnels" (L144) est vide.
- Les blocs de la section Boucles n'ont pas de phrase d'introduction (règle AGENTS.md), seul celui avec le pas en a reçu une.
