---
description: Configurer les logs des slow queries sur Elasticsearch — définir les seuils de performance et analyser les requêtes lentes
---

# Log des slow queries de ElasticSearch

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

Puis on applique les seuils que l'on veut :

```bash
curl -X PUT "localhost:9200/x_search_results_20210402185209/_settings?pretty" -H Content-Type: application/json -d
{
  "index.search.slowlog.threshold.query.warn": "3s",
  "index.search.slowlog.threshold.query.info": "1s",
  "index.search.slowlog.threshold.query.debug": "2s",
  "index.search.slowlog.threshold.query.trace": "500ms",
  "index.search.slowlog.threshold.fetch.warn": "1s",
  "index.search.slowlog.threshold.fetch.info": "800ms",
  "index.search.slowlog.threshold.fetch.debug": "500ms",
  "index.search.slowlog.threshold.fetch.trace": "200ms"
}

```

Les logs seront dans **/var/log/elasticsearch/** et les options propres
aux slowlog dans le fichier log4j2.properties
