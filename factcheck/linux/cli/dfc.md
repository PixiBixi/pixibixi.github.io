---
article: docs/linux/cli/dfc.md
checked: '2026-11-11'
commit: 3f5dc7d3ecd43e94905e627a1299850bed97e5a0
sources: []
unpinned: 4
---

# docs/linux/cli/dfc.md

## Findings

- L40 OUTDATED corrigé ("nous sommes à la 3.0.5") : paragraphe supprimé avec la section Wheezy, l'installation indique la 3.1.1 comme dernière version. Preuve : ~/Documents/work/src/dfc (Rolinh/dfc) `git tag --sort=-v:refname` -> v3.1.1 en tête ; build v3.1.1 -> `dfc -v` = "dfc 3.1.1-e5f8c3b".
- L40 OUTDATED corrigé ("La version téléchargé est la 2.5.0") : section Wheezy fusionnée dans une section Installation unique (`apt install dfc`). Preuve : sources.debian.org/api/src/dfc : wheezy 2.5.0-1, stretch 3.0.5-0.1, buster/bullseye 3.1.1-1, bookworm 3.1.1-1.2, trixie 3.1.1-2 ; conteneurs : bookworm candidate 3.1.1-1.2, trixie 3.1.1-2+b1.
- L81 IMPRECISE corrigé : `sudo make install` + phrase sur l'installation dans /usr/local/bin. Preuve : build dans debian:trixie, `make install` -> "Installing: /usr/local/bin/dfc".
- L86 IMPRECISE rejeté : la chronologie de l'article est juste, dfc était dans Wheezy, absent de Jessie, revenu en Stretch. Preuve : sources.debian.org/api/src/dfc liste wheezy (2.5.0-1) et stretch (3.0.5-0.1), aucune entrée jessie. La nouvelle section le dit en une phrase.

## En plus

- L57 corrigé : `git-core` remplacé par `git` (plus de candidat `git-core` sur trixie : `apt-cache policy git-core` -> "Candidate: (none)") et ajout de `build-essential` (sans compilateur, `make` ne peut rien construire ; build testé avec ce jeu de paquets).

## Modernisation

- Sections Wheezy et Jessie supprimées : appliqué (Debian EOL), la compilation reste comme section "Compiler depuis les sources" pour les distributions sans paquet.
- cmake + gettext/NLS : appliqué, mention de `-DNLS_ENABLED=false`. Preuve : README.md@origin/HEAD (Rolinh/dfc) L46-50. Le Makefile racine du README n'est pas mentionné (pas utile au lecteur, le chemin cmake fonctionne).

## Tests

- Docker : debian:bookworm-20251020, debian:trixie-20251020 (apt-cache policy dfc) ; build v3.1.1 sur trixie avec cmake 3.31.6, `dfc -v` OK.

## À signaler

- Les captures `_img/df.webp` et `_img/dfc.webp` datent probablement d'une vieille version, non vérifiées.
