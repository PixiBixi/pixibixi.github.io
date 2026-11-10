---
description: Configurer les logs des slow queries sur Elasticsearch - définir les seuils de performance et analyser les requêtes lentes
tags:
  - Elasticsearch
tested_with:
  - "Elasticsearch 9.2.0"
---

# Log des slow queries de Elasticsearch

Dans une optique d'optimisation des performances, il est intéressant de
log les slow queries afin de les optimiser si possible. Par défaut, rien
n'est log :(

Les options sont propres à chaque index.

Il faut d'abord lister les index :

```bash
curl 127.0.0.1:9200/_cat/indices
green open insee_and_postal_codes                      qA2bya4sRpu4WHlK3W5jgA 5 0   35856      0  21.9mb  21.9mb
green open x_images_20210402185809                     oAY_xCe0QjqMhpKg6WTcCg 5 0  103208     97  52.3mb  52.3mb
green open x_search_results_20210402185209             ouWAT_bBQKOPVNqXhumCGA 5 0 1584142 169124 972.3mb 972.3mb
```

Puis on applique les seuils que l'on veut. Ils doivent décroître de `warn` vers `trace` : une requête est loggée au niveau le plus sévère dont elle dépasse le seuil, un `debug` plus haut que `info` ne sert donc à rien.

```bash
curl -X PUT "localhost:9200/x_search_results_20210402185209/_settings?pretty" -H 'Content-Type: application/json' -d '
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.search.slowlog.threshold.query.debug": "2s",
  "index.search.slowlog.threshold.query.trace": "500ms",
  "index.search.slowlog.threshold.fetch.warn": "1s",
  "index.search.slowlog.threshold.fetch.info": "800ms",
  "index.search.slowlog.threshold.fetch.debug": "500ms",
  "index.search.slowlog.threshold.fetch.trace": "200ms"
}'
```

On peut aussi ajouter `"index.search.slowlog.include.user": true` pour savoir quel utilisateur a lancé la requête.

Les logs atterrissent dans `path.logs` (**/var/log/elasticsearch/** avec le paquet deb/rpm), dans un fichier JSON `*_index_search_slowlog.json`. Avec l'image Docker, tout part sur stdout (`docker logs`). Le fichier log4j2.properties ne gère que l'appender et le niveau du logger, les seuils restent des index settings.

## Voir aussi

* [Postgres : les commandes qui servent](../postgres/commands.md)
* [MySQL : Commandes avancées](../mysql/advanced_commands.md)
