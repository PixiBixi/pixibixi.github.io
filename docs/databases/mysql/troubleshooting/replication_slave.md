---
description: Déboguer et réparer une réplication MySQL primaire/réplica — résoudre les erreurs de relay log et relancer la synchronisation
tags:
  - MySQL
  - Replication
---

# Debug d'une réplication primaire/réplica

La réplication peut planter avec ce genre d'erreur :

```bash
Error: Last_SQL_Errno: 1594 Last_SQL_Error: Relay log read failure: Could not parse relay log event entry.
```

Dans cet exemple, **10.0.0.1** est le primaire et **10.0.0.2** est le réplica.

## Relay log corrompu

On commence par observer l'état de la réplication (à lancer sur le réplica) :

```bash
MariaDB [(none)]> SHOW SLAVE STATUS \G;
*************************** 1. row ***************************
                Slave_IO_State:
                   Master_Host: 192.168.0.11
                   Master_User: replication
                   Master_Port: 3306
                 Connect_Retry: 60
               Master_Log_File: mysql-bin.000244
           Read_Master_Log_Pos: 43725948
                Relay_Log_File: mysqld-relay-bin.000325
                 Relay_Log_Pos: 4521579
         Relay_Master_Log_File: mysql-bin.000234
                        .....
           Exec_Master_Log_Pos: 4521284
```

On vérifie que le binlog est lisible sur le primaire (`Master_Log_File`) :

```bash
mysqlbinlog mysql-bin.000244
```

Si ça passe, on peut rejouer les transactions et reset le réplica. À effectuer sur le réplica :

```mysql
mysql> STOP SLAVE;
Query OK, 0 rows affected (0.14 sec)

mysql> RESET SLAVE ALL;
Query OK, 0 rows affected (0.43 sec)

mysql>  CHANGE MASTER TO MASTER_HOST=master.host.com, MASTER_USER=masteruser, MASTER_PASSWORD=masterpass, MASTER_LOG_FILE=mysqld-relay-bin.000325, MASTER_LOG_POS=4521284;
Query OK, 0 rows affected (0.93 sec)

mysql> START SLAVE;
Query OK, 0 rows affected (0.00 sec)
```

## IO Replication: NO

Généralement, on est juste pas à la bonne position. Sur le primaire, on récupère la position courante :

```bash
SMS=/tmp/show_master_status.txt
mysql -ANe "SHOW MASTER STATUS" > ${SMS}
CURRENT_LOG=$(awk '{print $1}' ${SMS})
CURRENT_POS=$(awk '{print $2}' ${SMS})
echo ${CURRENT_LOG} ${CURRENT_POS}
```

Et on remplit le `CHANGE MASTER TO` avec les bonnes valeurs.
