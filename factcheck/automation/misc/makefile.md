---
article: docs/automation/misc/makefile.md
checked: '2026-11-10'
commit: 4ce516a3e15369c1f465b47b29e24be32a261134
sources: []
unpinned: 3
---

# docs/automation/misc/makefile.md

## Findings

- L77 ERROR corrigé : ajout d'une phrase avant le bloc strict : GNU make 3.82+ requis, le make de macOS (3.81) ignore `.SHELLFLAGS` et `.ONESHELL` sans rien dire, `brew install make` puis `gmake`. Preuve : `/usr/bin/make` local = GNU Make 3.81 ; Makefile de test avec le bloc : `false | true; echo after` affiche `after`, rc=0, et `cd /` ne tient pas sur la ligne suivante ; même Makefile sous make 4.3 : échec sur `false | true` (Error 1) et `cd /` tient.
- L41 IMPRECISE corrigé : mention de `::=` et `!=` dans l'intro de la section, le tableau garde les 4 courantes. Preuve : make 4.3 (debian:12.8) : `A != echo bang` et `B ::= posix` donnent `bang posix`.
- L146 IMPRECISE corrigé : réécrit : les flags passent via `MAKEFLAGS`, seule une ligne avec `$(MAKE)` est exécutée sous `-n` ; un `make` en dur est seulement affiché en dry-run, et retombe en `-j1` jusqu'à make 4.3. Preuve : `make -n` sur cible `make -C . inner` : seulement affiché ; sur `$(MAKE) -C . inner` : sous-make lancé (`Entering directory`, echo affiché sans exécution). `make -j4` avec make en dur : 4.3 affiche `warning: jobserver unavailable: using -j1`, 4.4.1 non (MAKEFLAGS contient `--jobserver-auth=fifo:...`, partagé avec tout sous-make).

## En plus

- L76 : `SHELL := /usr/bin/env bash` avec `.ONESHELL` casse toute recette : `make: /usr/bin/env bash: No such file or directory` (Error 127), reproduit sur make 4.3 et 4.4.1 ; sans `.ONESHELL` ça marche. Remplacé par `SHELL := bash` (testé OK sur 3.81, 4.3, 4.4.1) et ajout d'une phrase qui l'explique.
- L99 : « C'est là que » (mot interdit par le hook wordlist-guard) reformulé en « Sur ce point, ».

## Modernisation

- Version requise (3.82+, gmake via Homebrew) : appliqué.
- `!=` et `::=` : appliqué.
- `tested_with` ajouté : GNU Make 4.3, GNU Make 4.4.1.

## Tests

- `/usr/bin/make` 3.81 (macOS) ; Docker debian:12.8 (GNU Make 4.3) et debian:13.1 (GNU Make 4.4.1), conteneurs `--rm`. Makefiles de test dans fc/mk.

## À signaler

- Le paragraphe L123 (« décripter », « strier », « commencant ») garde ses fautes d'origine, hors périmètre.
