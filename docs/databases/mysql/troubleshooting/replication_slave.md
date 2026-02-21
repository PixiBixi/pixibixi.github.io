# Debug sa replication Master-Slave

## Introduction

Il se peut que vous ayez a debug une replication qui a planté

```bash
Error: Last_SQL_Errno: 1594 Last_SQL_Error: Relay log read failure: Could not parse relay log event entry.
```

Dans cet exemple, nous assumerons que **10.0.0.1** est le **master** et
**10.0.0.2** est le **slave**.

Tout d'abord, nous devons d'abord observer nos différents éléments (à
lancer sur la slave) :

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

Premièrement, nous allons vérifier que le log est lisible sur le master.
Nous parlons ici du _Master_Log_File_.

```bash
mysqlbinlog mysql-bin.000244
```

Si cette commande marche, alors nous pouvons rejouer les transactions et
reset le slave. Action à effectuer sur le master

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

Normalement, vous devriez désormais avoir votre replication
fonctionnelle

## IO Replication: NO

Généralement, on est juste pas a la bonne position. Sur le master,
effectuer

```bash
SMS=/tmp/show_master_status.txt
mysql -ANe "SHOW MASTER STATUS" > ${SMS}
CURRENT_LOG=`cat ${SMS} | awk {print $1}`
CURRENT_POS=`cat ${SMS} | awk {print $2}`
echo ${CURRENT_LOG} ${CURRENT_POS}
```

Et remplir avec les bonnes infos ;-)
