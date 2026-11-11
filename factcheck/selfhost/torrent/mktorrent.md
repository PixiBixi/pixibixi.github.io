---
article: docs/selfhost/torrent/mktorrent.md
checked: '2026-11-10'
commit: be9bdd899cb3ba96aca091959546c2c2c35b6dac
sources:
- repo: mktorrent
  path: init.c
  lines: '597'
  ref: de7d011
  commit: de7d011b35458de1472665f50b96c9cf6c303f39
- repo: mktorrent
  path: init.c
  lines: '521'
  ref: v1.1
  commit: b20ef699b4ee5ded2f078ead776c7deac969e19a
- repo: mktorrent
  path: Makefile
  lines: 39-47
  ref: de7d011
  commit: de7d011b35458de1472665f50b96c9cf6c303f39
- repo: mktorrent
  path: init.c
  lines: '592'
  ref: de7d011
  commit: de7d011b35458de1472665f50b96c9cf6c303f39
- repo: mktorrent
  path: init.c
  lines: '515'
  ref: v1.1
  commit: b20ef699b4ee5ded2f078ead776c7deac969e19a
- repo: mktorrent
  path: init.c
  lines: 272-275
  ref: de7d011
  commit: de7d011b35458de1472665f50b96c9cf6c303f39
unpinned: 6
---

# docs/selfhost/torrent/mktorrent.md

## Findings

- L33 ERROR corrigé : les apostrophes de fin de ligne du `sed` remplacées par des continuations `\`. Preuve : test debian:bookworm, le `sed` corrigé décommente bien `USE_PTHREADS`, `USE_OPENSSL`, `USE_LONG_OPTIONS` puis `make && make install` rc=0.
- L66 ERROR corrigé : 8 MiB = 23. Preuve : init.c:597 @de7d011 (master) et init.c:521 @v1.1 `m->piece_length = 1 << m->piece_length;` ; test `-l 23` rc=0.
- L67 ERROR corrigé : 16 MiB = 24. Preuve : même ligne de code.
- L27 OUTDATED corrigé : clone sur `pobrn/mktorrent`, avec mention de la redirection. Preuve : `gh api repos/Rudde/mktorrent --jq .full_name` = `pobrn/mktorrent` ; le clone de l'URL Rudde donne le même HEAD de7d011 (2021-01-30) ; tags : dernière release v1.1.
- L21 IMPRECISE corrigé : `apt build-dep` remplacé par `apt install mktorrent` en première option, et `build-essential libssl-dev git` pour compiler. Preuve : test bookworm, paquet `mktorrent 1.1-3` installable, build master OK avec ces paquets.
- L36 IMPRECISE corrigé : `NO_HASH_CHECK` et `USE_LARGE_FILES` retirés du `sed`, une phrase dit pourquoi. Preuve : Makefile:39-47 @de7d011.
- L54 IMPRECISE rejeté : `-p` est exact, le fact-check le dit lui-même. Preuve : `mktorrent -h` (1.1-3) `-p, --private : set the private flag`.
- L55 IMPRECISE corrigé : ajout de la plage 15 à 28 et du défaut (18 en 1.1, calcul auto sur master). Preuve : init.c:592 @de7d011, init.c:515 @v1.1 ; test : sans `-l`, le paquet 1.1 coupe 50 Mo en 191 pièces (256 KiB), le build master en 1526 (32 KiB, auto).
- L59 IMPRECISE corrigé : le tableau est présenté comme une convention courante, pas une règle de mktorrent. Preuve : CHANGELOG.md [Unreleased] @de7d011 "Automatic piece length calculation".

## En plus

- Unités du tableau et de `-l` : "Kb"/"Mb" (kilobits/mégabits) remplacés par KiB/MiB/GiB, ce que mktorrent calcule réellement (puissances de 2 en octets).
- `-t` n'existe que si compilé avec `USE_PTHREADS` (précisé). Preuve : init.c:272-275 @de7d011 (`#ifdef USE_PTHREADS`).
- Phrase d'intro "nous devons le compiler" retirée, le paquet suffit.
- Ajout `tested_with: mktorrent 1.1`.

## Modernisation

- `apt install mktorrent` : appliqué.
- Taille auto et `-e` sur master non releasé : appliqué (mention dans l'intro et sous `-l`).

## Tests

- OrbStack, debian:bookworm-20251020 : paquet mktorrent 1.1-3, build de pobrn/mktorrent @de7d011 (qui se déclare 1.1), torrents créés sur un fichier de 50 Mo.

## À signaler

- Rien.
