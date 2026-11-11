---
article: docs/databases/redis/decode_function.md
checked: '2026-11-11'
commit: 870293c460526089b4cf22a74e5509023f69df14
sources:
- repo: redis
  path: src/functions.c
  lines: 432-470
  ref: origin/unstable
  commit: 86561a0f4367f8dd20d436701b41822afd1c1f54
unpinned: 0
---

# docs/databases/redis/decode_function.md

## Findings

- L43 ERROR corrigé : `FUNCTION STATS` décrit comme "script en cours (nom, commande, durée) et nombre de librairies et de fonctions par engine". Ajout de `INFO commandstats` (ligne `cmdstat_fcall`, toutes fonctions confondues) pour les appels et le temps. Preuve : `src/functions.c:432-470 @origin/unstable` (`running_script`, `duration_ms`, `libraries_count`, `functions_count`) ; test redis:7.4.6 : `FUNCTION STATS` renvoie `running_script (nil) engines LUA libraries_count 1 functions_count 1`, `INFO commandstats` renvoie `cmdstat_fcall:calls=1,usec=38,...`.

## En plus

- Rien. Exemple de sortie de `FUNCTION LIST WITHCODE` vérifié conforme en 7.4.6.

## Modernisation

- Aucune suggestion.

## Tests

- Docker redis:7.4.6 (FUNCTION LOAD, LIST WITHCODE, STATS, FCALL, INFO commandstats, DUMP). Pas de `tested_with` ajouté (article générique 7.0+).

## À signaler

- La note "les fonctions remplacent les scripts EVAL" est un peu forte : EVAL n'est pas déprécié, les fonctions en sont l'évolution. Laissé tel quel, à reformuler si l'auteur le souhaite.
