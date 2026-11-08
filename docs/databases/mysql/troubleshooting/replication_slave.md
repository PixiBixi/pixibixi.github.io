---
description: Déboguer et réparer une réplication MySQL primaire/réplica - relay log corrompu, IO thread arrêté, reprise à la bonne position avec CHANGE REPLICATION SOURCE TO
tags:
  - MySQL
  - MariaDB
  - Replication
tested_with:
  - "MySQL 8.4"
---

# Debug d'une réplication primaire/réplica

La réplication peut planter avec ce genre d'erreur :

```text
Last_SQL_Errno: 1594
Last_SQL_Error: Relay log read failure: Could not parse relay log event entry.
```

Dans cet exemple, **10.0.0.1** est le primaire et **10.0.0.2** est le réplica.

Les commandes sont celles de MySQL 8.4 : `SLAVE` et `MASTER` y ont disparu (`SHOW SLAVE STATUS`, `CHANGE MASTER TO`, `SHOW MASTER STATUS` renvoient une erreur de syntaxe). Les équivalents `REPLICA`/`SOURCE` marchent depuis MySQL 8.0.22 (8.0.23 pour `CHANGE REPLICATION SOURCE TO`). Sur MariaDB, `SHOW REPLICA STATUS`, `STOP REPLICA` et `START REPLICA` passent depuis la 10.5.1, mais on garde `CHANGE MASTER TO` avec les options `MASTER_*` et les champs s'appellent `Relay_Master_Log_File`, `Exec_Master_Log_Pos`.

## Relay log corrompu

On commence par observer l'état de la réplication (à lancer sur le réplica) :

```console
mysql> SHOW REPLICA STATUS\G
*************************** 1. row ***************************
             Replica_IO_State:
                  Source_Host: 10.0.0.1
                  Source_User: replication
                  Source_Port: 3306
                Connect_Retry: 60
              Source_Log_File: mysql-bin.000244
          Read_Source_Log_Pos: 43725948
               Relay_Log_File: mysqld-relay-bin.000325
                Relay_Log_Pos: 4521579
        Relay_Source_Log_File: mysql-bin.000234
                        .....
          Exec_Source_Log_Pos: 4521284
```

3 paires de champs se ressemblent, une seule sert ici :

- `Source_Log_File` / `Read_Source_Log_Pos` : jusqu'où l'IO thread a **lu** le binlog du primaire
- `Relay_Log_File` / `Relay_Log_Pos` : le relay log local du réplica, celui qui est corrompu
- `Relay_Source_Log_File` / `Exec_Source_Log_Pos` : la dernière transaction **exécutée**, dans le binlog du primaire. C'est le point de reprise

Avant de toucher au réplica, on vérifie sur le primaire que ce binlog (`mysql-bin.000234`, pas le `000244` déjà lu) existe toujours et se lit à partir de la position :

```bash
mysql -e "SHOW BINARY LOGS" | grep mysql-bin.000234
mysqlbinlog --start-position=4521284 /var/lib/mysql/mysql-bin.000234 > /dev/null && echo OK
```

S'il a été purgé, pas de reprise possible : on re-seed le réplica (voir plus bas).

Sinon, sur le réplica, on repositionne sur la dernière transaction exécutée :

```console
mysql> STOP REPLICA;
mysql> CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='mysql-bin.000234', SOURCE_LOG_POS=4521284;
mysql> START REPLICA;
```

Avec les 2 threads arrêtés, `CHANGE REPLICATION SOURCE TO` supprime les relay logs existants (corrompus compris) et l'IO thread re-télécharge depuis le primaire à partir de cette position. Pas de `RESET REPLICA ALL` : il efface aussi l'host, l'user et le mot de passe, qu'il faudrait alors repasser.

En GTID avec `SOURCE_AUTO_POSITION=1`, pas de fichier ni de position à donner (c'est refusé) : `STOP REPLICA`, `CHANGE REPLICATION SOURCE TO SOURCE_AUTO_POSITION=1`, `START REPLICA`, et le réplica redemande au primaire les transactions qui lui manquent.

On vérifie que `Replica_IO_Running` et `Replica_SQL_Running` repassent à `Yes` et que `Seconds_Behind_Source` redescend.

## IO thread à No

`Replica_IO_Running: No` vient le plus souvent d'un problème de connexion ou d'auth (réseau, user de réplication, mot de passe), ou d'un binlog purgé sur le primaire. On lit l'erreur avant de toucher à quoi que ce soit :

```bash
mysql -e "SHOW REPLICA STATUS\G" | grep -E 'Replica_IO_Running|Last_IO_Errno|Last_IO_Error'
```

- `Access denied` ou `error connecting to source` : on teste à la main `mysql -h 10.0.0.1 -u replication -p` depuis le réplica, puis le grant `REPLICATION SLAVE` de l'user
- `Got fatal error 1236 from source when reading data from binary log` : le binlog demandé n'existe plus sur le primaire (purgé par `binlog_expire_logs_seconds`) ou la position est invalide

Pour une 1236, ne **jamais** repositionner le réplica sur la position courante du primaire (`SHOW BINARY LOG STATUS`) : il sauterait toutes les transactions entre sa dernière position exécutée et maintenant, et divergerait du primaire sans aucune erreur. On re-seed : dump ou snapshot cohérent du primaire, qui donne sa propre position de départ.

```bash
mysqldump --single-transaction --source-data=2 --all-databases > dump.sql
grep -m1 'CHANGE REPLICATION SOURCE TO' dump.sql
```

On restaure le dump sur le réplica, puis on reprend la position écrite en commentaire dans le `CHANGE REPLICATION SOURCE TO`.

## Voir aussi

- [MySQL : Commandes avancées](../advanced_commands.md)
- [Créer son cluster Galera](../galera_gluster.md)
- [Générer des INSERT INTO depuis un SELECT](generate_insert_into.md)
