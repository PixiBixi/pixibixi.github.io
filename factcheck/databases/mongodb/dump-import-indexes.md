---
article: docs/databases/mongodb/dump-import-indexes.md
checked: '2026-11-10'
commit: e2e3ac1c6f03341b9719ddb535e94ffa8c895422
sources: []
unpinned: 6
---

# docs/databases/mongodb/dump-import-indexes.md

## Findings

- L33 ERROR corrigé : boucle sur `db.getCollectionInfos({ type: "collection", name: { $not: /^system\./ } })` au lieu de `getCollectionNames()`, avec la phrase qui explique pourquoi. Preuve : test mongo:8.0.4, avec une view dans la base le script de l'article échoue en entier (`MongoServerError: Namespace src.users_view is a view, not a collection`, sortie vide). En plus du finding : un filtre `type: "collection"` seul ramène `system.views`, d'où le filtre sur le nom.
- L55 ERROR corrigé : réimport réécrit en script `restore_indexes.js` qui lit le dump avec `require('fs')`, lancé avec `DUMP_FILE=... mongosh --file`. Preuve : test mongosh 2.3.8, le script lit le fichier et recrée les 8 indexes.
- L95 ERROR corrigé : le script rejoue la spec brute (`{ v, ns, ...spec }` puis commande `createIndexes`) au lieu d'une liste blanche d'options ; tableau réécrit. Preuve : test mongo:8.0.4 sur 8 indexes (unique, TTL, partial+collation, text avec weights/default_language, wildcard avec wildcardProjection, hidden, 2dsphere, hashed) : l'ancien script perd `hidden: true` et `wildcardProjection` (diff des getIndexes), le nouveau donne des indexes identiques à la source.
- L10 IMPRECISE corrigé : intro reformulée (mongodump écrit les indexes dans metadata.json) + nouvelle section "Alternative native, collection par collection". Nuance au finding et à la modernisation : le dump vide via `--query` n'est possible qu'avec `--collection`. Preuve : mongo-tools mongodump/mongodump.go@origin/master:95-96 (`cannot dump using a query without a specified collection`), reproduit en test ; avec `--collection users`, mongorestore recrée des indexes identiques à la source (0 document).
- L18 IMPRECISE corrigé : "une fois retirés `v` et `ns`, c'est le format que prend la commande `createIndexes`", et le réimport utilise bien cette commande. Nuance : l'index texte (clé `_fts`/`_ftsx`) passe aussi avec l'ancien `createIndex(key, opts)` (test : [OK], index identique hors options perdues citées plus haut).
- L97 IMPRECISE corrigé : le script distingue `[EXISTE]` (index identique, `numIndexesBefore === numIndexesAfter`) et `[ERREUR]` (conflit ou autre erreur, message serveur affiché) ; tableau mis à jour. Preuve : test, l'ancien script affiche `[OK]` en rejouant un index identique ; le nouveau affiche `[EXISTE]` au second passage et `[ERREUR] ... An existing index has the same name as the requested index` sur un conflit de nom.

## En plus

- Le chemin du fichier différait entre la section "Sauvegarder" (`indexes_dump.json` relatif) et le réimport (`/tmp/indexes_dump.json`) : unifié sur `/tmp/indexes_dump.json`.

## Modernisation

- mongodump `--query` vide : appliqué, limité à une collection (voir L10).
- `require('fs')` : appliqué.

## Tests

- Docker mongo:8.0.4 (mongosh 2.3.8, mongodump/mongorestore de l'image), deux mongod (27017/27018). Les blocs "Sauvegarder", "Réimport", "Alternative native" et "Exemple complet" ont été extraits de l'article et exécutés tels quels (hôtes remplacés par localhost) : indexes cible identiques à la source. Le premier jet avait des quotes simples dans un `--eval '...'` (cassé), corrigé en guillemets doubles et retesté. `tested_with` ajouté : MongoDB 8.0, mongosh 2.3.

## À signaler

- Rien.
