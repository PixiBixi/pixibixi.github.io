---
article: docs/linux/cli/sed.md
checked: '2026-11-11'
commit: af114f6fcb1fe2b48ac732dcd21a8bba9fb6f988
sources: []
unpinned: 6
---

# docs/linux/cli/sed.md

## Findings

- L49 IMPRECISE corrigé : flag `I` annoté "(extension GNU, pas POSIX)". Preuve : `/usr/bin/sed 's/foo/bar/gI'` sur macOS 26.7.1 donne `bar bar` (accepté), mais POSIX ne liste que g, p, n, w (source du fact-check, non relue).
- L66 IMPRECISE corrigé : table des options précise que `-i` seul est GNU (`-i ''` sur BSD) et que `-i.bak` marche partout ; exemple `sed -i '' ...` ajouté dans le bloc. Preuve : `/usr/bin/sed -i 's/old/new/g' u.txt` -> `sed: 1: "u.txt": invalid command code u`, rc=1 ; `/usr/bin/sed -i ''` et `-i.bak` passent (rc=0, `v.txt.bak` créé).
- L167 IMPRECISE corrigé : phrase ajoutée avant le bloc (formes une ligne = GNU) et forme portable `3i\` + retour à la ligne après le bloc. Preuve : `/usr/bin/sed '3i\nouvelle ligne'` -> `extra characters after \ at the end of i command` ; forme portable OK sur `/usr/bin/sed` ; `gsed` 4.10 affiche bien `nouvelle ligne` pour `3i\` et `3a\`.
- L204 IMPRECISE rejeté : la commande marche à l'identique sur gsed 4.10 et sur le sed de macOS 26 (`\t` interprété, sortie `1\tFoo foo`, `2\ta`, ligne vide, `4\tb`), et l'article cible GNU (avertissement en tête). Aucun changement.
- L211 IMPRECISE corrigé : `sed -i ... $(find /etc -name "*.conf")` remplacé par `find /etc -name "*.conf" -exec sed -i 's/old/new/g' {} +`, avec une phrase sur les espaces. Preuve : fichier `etc/a b.conf` : la forme `$(gfind ...)` donne `gsed: can't read etc/a` et `can't read b.conf` (rc=2), la forme `-exec {} +` modifie les deux fichiers.
- L242 IMPRECISE rejeté : `\x1B` marche sur gsed et sur le sed de macOS 26 (`printf '\033[31mred\033[0m'` -> `red`). Busybox ou BSD ancien non testés ; l'article vise GNU. Aucun changement.

## En plus

- Rien.

## Modernisation

- `sed -i ''` / `-i.bak` / `gsed` : appliqué (voir L66).
- `I`, `\t`, `\x1B` sur sed BSD récent : appliqué seulement pour `I` (note GNU), le reste fonctionne sur les 2 cibles testées.

## Tests

- `/usr/bin/sed` de macOS 26.7.1, `gsed` (GNU sed) 4.10, `gfind`. Testé aussi sans changement : dédoublonnage `$!N; /^\(.*\)\n\1$/!P; D` et trim `[[:space:]]` (OK sur les 2).

## À signaler

- "Numéroter les lignes non vides" affiche le numéro de ligne d'origine (les lignes vides comptent : `4` après une ligne vide), pas un compteur des lignes non vides. Laissé tel quel, à préciser si ce n'est pas l'intention.
