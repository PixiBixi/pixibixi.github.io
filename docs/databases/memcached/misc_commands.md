---
description: Accéder et dumper le contenu de Memcached — commandes utiles pour explorer et vider les données en cache
---

# Commandes diverses avec memcached

    exec {memcache}<>/dev/tcp/localhost/11211
    printf "stats items\nquit\n" >&${memcache}
    cat <&${memcache} > myfile.txt

Dump le contenu local du memcached
