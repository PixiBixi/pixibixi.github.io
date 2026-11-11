---
article: docs/linux/misc/mancolor.md
checked: '2026-11-11'
commit: b02008cc85caa8463a8eb9cc771cbe191ad2bef7
sources: []
unpinned: 3
---

# docs/linux/misc/mancolor.md

## Findings

- L46 ERROR corrigé : bloc réécrit avec `<< 'EOF'` et `$'\e[01;31m'` (échappement et quote fermant restaurés), plus une phrase sur le rôle du `'EOF'` quoté. Preuve : debian:trixie-20251020, le bloc d'origine dans ~/.bashrc donne `bash: 31m: command not found` à l'ouverture d'un shell ; le bloc corrigé ne donne aucune erreur et `man ls` via less affiche `^[[01;31mSYNOPSIS^[[0m` (couleur LESS_TERMCAP_md appliquée).
- L22 IMPRECISE corrigé : "fait totalement pareil" remplacé par : on garde less avec ses couleurs, most est un autre pager avec sa navigation et ses couleurs. Preuve : most 5.2.0 est un pager distinct (`man most` : `-s` = squeeze des lignes vides).
- L53 IMPRECISE rejeté : GROFF_NO_SGR n'est pas nécessaire sur Debian 13. Preuve : debian:trixie-20251020 (man-db 2.13.1, less 668, groff 1.23.0), avec le bloc corrigé et `PAGER=less`, `man ls` est coloré sans GROFF_NO_SGR (même sortie avec ou sans). Autres distributions (Arch, Fedora) non testées : l'image archlinux n'existe pas en arm64.

## En plus

- Paragraphe d'intro des 2 méthodes passé sur une ligne (réécrit).

## Modernisation

- Lignes `export LESS_TERMCAP_xx=$'\e[...]'` dans un heredoc quoté : appliqué.
- `bat` comme MANPAGER : non appliqué, pas testé.

## Tests

- Docker debian:trixie-20251020 : man-db 2.13.1, less 668, groff 1.23.0, most 5.2.0 ; rendu capturé avec `script` + `cat -v`.

## À signaler

- Observation : via man-db, `GROFF_NO_SGR=1` n'a eu aucun effet dans mes tests (grotty émet toujours du SGR, mais less 668 applique quand même LESS_TERMCAP_md), alors que `MANROFFOPT="-P -c"` force bien l'ancien format. Si un lecteur sur une autre distro n'a pas les couleurs, c'est `MANROFFOPT="-P -c"` qu'il faudrait proposer plutôt que GROFF_NO_SGR. Non ajouté à l'article faute de reproduire le problème.
