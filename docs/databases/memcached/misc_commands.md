---
description: Accéder et dumper le contenu de Memcached — commandes utiles pour explorer et vider les données en cache
tags:
  - Memcached
---

# Memcached : debug et commandes utiles

    exec {memcache}<>/dev/tcp/localhost/11211
    printf "stats items\nquit\n" >&${memcache}
    cat <&${memcache} > myfile.txt

Dump le contenu local du memcached

## Voir aussi

* [Déployer un Redis en High Availability](../redis/cluster_ha.md)
* [Log des slow queries de ElasticSearch](../elasticsearch/log_slow_queries.md)
