---
description: Lister et inspecter les fonctions Lua stockées dans Redis avec FUNCTION LIST WITHCODE
tags:
  - Redis
---

# Décoder une fonction Redis

Redis supporte les fonctions Lua depuis Redis 7.0 (via `FUNCTION LOAD`). Pour inspecter ce qui est chargé :

```redis
FUNCTION LIST WITHCODE
```

`WITHCODE` inclut le code source de chaque fonction — pratique pour auditer ce qui tourne en prod.

Exemple de sortie :

```text
1) 1) "library_name"
   2) "mylib"
   3) "engine"
   4) "LUA"
   5) "functions"
   6) 1) 1) "name"
         2) "myfunc"
         3) "description"
         4) (nil)
         5) "flags"
         6) (empty array)
   7) "library_code"
   8) "#!lua name=mylib\nredis.register_function('myfunc', function(keys, args) return args[1] end)"
```

## Autres commandes utiles

Lister sans le code source :

```redis
FUNCTION LIST
```

Stats d'exécution (temps CPU, nombre d'appels) :

```redis
FUNCTION STATS
```

Supprimer une librairie :

```redis
FUNCTION DELETE mylib
```

Dump de toutes les fonctions (pour backup/restore) :

```redis
FUNCTION DUMP
```

!!! note "Redis 7.0+"
    Les fonctions (`FUNCTION LOAD`) remplacent les scripts Lua éphémères (`EVAL`/`EVALSHA`). Elles sont persistées en RDB/AOF et survivent aux redémarrages.

## Voir aussi

* [Déployer un Redis en High Availability](cluster_ha.md)
