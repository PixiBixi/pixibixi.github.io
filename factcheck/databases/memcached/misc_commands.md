---
article: docs/databases/memcached/misc_commands.md
checked: '2026-11-11'
commit: 52b9dad0270cfe3af41da9d0812e6fd74d8b9e40
sources:
- repo: memcached
  path: doc/protocol.txt
  lines: 1145-1150
  ref: origin/master
  commit: 2d51e364799bc9698bd4b11728ea978cea12da6e
- repo: memcached
  path: items.c
  lines: 639-651
  ref: origin/master
  commit: 2d51e364799bc9698bd4b11728ea978cea12da6e
unpinned: 0
---

# docs/databases/memcached/misc_commands.md

## Findings

- L13 ERROR corrigé : `stats items` ne dumpe pas le contenu, il donne des compteurs par slab class. L'article liste maintenant les clés avec `lru_crawler metadump all` (lu jusqu'à `END` avec `sed '/^END/q'`), lit une valeur avec `get`, et garde `stats items` décrit correctement. Preuve : test memcached:1.6.39, `stats items` renvoie `STAT items:1:number 1 ... END` sans clé ; `lru_crawler metadump all` renvoie `key=foo exp=-1 ... END` ; `doc/protocol.txt:1145-1150 @origin/master (1.6.45)` "Similar to cachedump, but does not lock the cache".

## En plus

- Le serveur ignore un `quit` envoyé après `lru_crawler metadump` et garde la connexion ouverte : un `cat` attendrait indéfiniment (testé : `timeout 3 cat` sort en rc=143). D'où le `sed '/^END/q'` (testé avec GNU sed dans l'image memcached, sort proprement ; BusyBox sed, lui, bloque) et la phrase qui l'explique.
- Description front matter : elle promettait de "vider les données" (aucun `flush_all` dans l'article). Réécrite pour coller au contenu.
- `\n` remplacé par `\r\n` (fin de ligne du protocole), les deux marchent en test.

## Modernisation

- Appliquée : `lru_crawler metadump all` comme méthode principale ; `stats cachedump` mentionné comme ancienne méthode, avec son verrou et sa limite. Preuve : `items.c:639-651 @origin/master` (`pthread_mutex_lock(&lru_locks[id])`, `memlimit = 2 * 1024 * 1024`).

## Tests

- Docker memcached:1.6.39, bash:5.2.37, busybox:1.36.1. `tested_with: Memcached 1.6.39` ajouté.

## À signaler

- Le `get foo` utilise une clé d'exemple `foo`, à remplacer par le lecteur.
