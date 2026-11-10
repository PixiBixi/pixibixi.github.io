---
description: Explorer le contenu de Memcached - lister les clés avec lru_crawler metadump et lire les stats par slab
tags:
  - Memcached
tested_with:
  - "Memcached 1.6.39"
---

# Memcached : debug et commandes utiles

Pas de client sous la main ? Bash suffit, via `/dev/tcp`. Pour lister les clés présentes dans le cache (avec expiration, taille et slab class), on passe par `lru_crawler metadump all`, qui ne bloque pas le cache :

    exec {memcache}<>/dev/tcp/localhost/11211
    printf "lru_crawler metadump all\r\n" >&${memcache}
    sed '/^END/q' <&${memcache} > keys.txt

Le serveur ignore un `quit` envoyé après le metadump et garde la connexion ouverte : c'est le `sed` qui coupe à la ligne `END`, un simple `cat` attendrait indéfiniment.

On lit ensuite la valeur d'une clé avec un `get` :

    exec {memcache}<>/dev/tcp/localhost/11211
    printf "get foo\r\nquit\r\n" >&${memcache}
    cat <&${memcache}

`stats items` ne dumpe pas le contenu : il donne des compteurs par slab class (nombre d'items, âge, évictions...), utile pour voir où part la mémoire :

    exec {memcache}<>/dev/tcp/localhost/11211
    printf "stats items\r\nquit\r\n" >&${memcache}
    cat <&${memcache} > stats_items.txt

L'ancienne méthode `stats cachedump <classid> <limit>` marche encore, mais verrouille la LRU de la slab class pendant le dump et plafonne la réponse à 2 Mo : à éviter en prod.

## Voir aussi

* [Déployer un Redis en High Availability](../redis/cluster_ha.md)
* [Log des slow queries de Elasticsearch](../elasticsearch/log_slow_queries.md)
