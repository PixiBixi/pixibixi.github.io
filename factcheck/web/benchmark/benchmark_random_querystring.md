---
article: docs/web/benchmark/benchmark_random_querystring.md
checked: '2026-11-11'
commit: 2bed5623ba2de142ea17dd5f352ba6665bf4f412
sources: []
unpinned: 6
---

# docs/web/benchmark/benchmark_random_querystring.md

## Findings

- L14/L42 ERROR corrigé : le script ajoute maintenant `?` + 20 caractères (vraie query string) au lieu de coller la chaîne au chemin; une liste explique les 2 écarts avec le script d'origine. Preuve : test wrk 4.2.0 contre nginx:1.27-alpine, le script d'origine envoie `GET /6tRtoB7ZJruefd5VVvG3` et sort `Non-2xx or 3xx responses: 21547` sur 21547 requêtes.
- L53 ERROR corrigé : `-s add_random_alpha.lua` + précision que wrk prend le chemin tel quel. Preuve : wg/wrk src/script.c:93 `luaL_dofile(L, file)`; test : `add_random_alpha: cannot open add_random_alpha: No such file or directory`.
- L56 ERROR corrigé : 100 connexions au total, 25 par thread, `-c400` pour 100 par thread. Preuve : wg/wrk src/wrk.c:107 `t->connections = cfg.connections / cfg.threads;`.
- L10 IMPRECISE corrigé : "un équivalent à ab" remplacé par "même cour que ab, mais multi-thread et asynchrone (epoll)", tag `ab` remplacé par `wrk`. Preuve : bannière `wrk [epoll]` du binaire testé, src/wrk.c (threads).
- L17 IMPRECISE corrigé : seed par thread dans `init()` (id posé dans `setup()`; `os.time()` seul donnerait la même graine à tous les threads lancés dans la même seconde). Preuve : test sans seed, les 4 threads sortent la même séquence (`/?6tRtoB7ZJruefd5VVvG3`, `/?BDpVFTU18uRuN5QF669j` répétés) et un second run la rejoue; avec le seed, `sort | uniq -c` ne montre aucun doublon.
- L43 IMPRECISE corrigé : `print()` retiré du script + phrase d'avertissement. Preuve : le `print` n'existe pas dans le script upstream (RosarioGrosso/wrk-lua-random-requests add_random_alpha.lua @4e2fe19), test 4t/100c/3s : 59k req/s avec print contre 119k sans (mesure biaisée aussi par les 404, ordre de grandeur seulement).

## En plus

- Lien "ici" vers le script devenu "adapté de celui-ci", typos "écris" -> "écrit", "lancons" -> "lançons", "connections" -> "connexions". Phrase ajoutée sur l'intérêt (forcer un cache miss).
- `removeTrailingSlash` (jamais appelée) retirée du script.

## Modernisation

- Appliqué : seed (voir plus haut).
- Appliqué : une ligne sur wrk figé depuis 2021 (dernier tag 4.2.0, dernier commit a211dd5 du 2021-02-06) et wrk2 / oha / k6 pour un débit constant. Capacité "débit constant" de ces 3 outils non retestée ici.

## Tests

- Docker : alpine:3.20 avec `apk add wrk` (wrk 4.2.0-r1, luajit 2.1_p20240314), cible nginx:1.27-alpine. Conteneurs et réseau supprimés.
- `tested_with: "wrk 4.2.0 (LuaJIT 2.1)"` ajouté.

## À signaler

- Le tag `ab` disparaît de cet article : vérifier qu'il n'était pas le seul à le porter si la page de tags compte dessus.
