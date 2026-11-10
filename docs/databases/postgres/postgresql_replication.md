---
description: Configurer la réplication streaming PostgreSQL - setup primary/replica, pg_hba.conf et surveillance de la réplication.
tags:
  - PostgreSQL
  - Replication
---

# PostgreSQL Replication

## Replication

La réplication sur PostgreSQL est un bordel. Je note donc ici pour les prochaines fois

### Creation

#### Users

Pour créer une réplication PostgreSQL, il y a plusieurs choses à savoir

Tout d'abord, nous devons créer un utilisateur dédié pour exécuter la réplication (sur le nœud master) :

```bash
psql -c "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'Iej7choobeinohJa8shieNg4iev5dien'"
```

Ensuite, nous devons configurer `pg_hba.conf` sur le primary pour autoriser la connexion à cet utilisateur depuis le standby (`172.29.49.11` est l'IP du standby, `172.19.49.11` celle du primary). On met `scram-sha-256`, le défaut de `password_encryption` depuis PostgreSQL 14 (en 13 le défaut est encore `md5` : le mot de passe doit avoir été créé en SCRAM, sinon on garde `md5`) :

```psql
host  replication          replicator         172.29.49.11/32         scram-sha-256
```

Puis on reload la configuration

```bash
psql -c "select pg_reload_conf()"
```

#### Configuration

C'est la partie délicate, quelques paramètres à adapter en fonction de votre workload :

* **max_wal_senders** : Nombre de processus d'expéditeur WAL qui peuvent être démarrés sur le maître. Un pour chaque réplique. pg_basebackup peut utiliser un ou deux WAL senders. `max_wal_senders` vaut 10 par défaut depuis PostgreSQL 10. Ainsi, ce paramètre n'a pas besoin d'être modifié, sauf si on dépasse 10 connexions de réplication simultanées sur un maître (standby, `pg_basebackup` en cours et connexions de réplication logique comprises).

```bash
postgres=# ALTER SYSTEM SET max_wal_senders TO '10';
```

* **listen_addresses** : Ce paramètre détermine les interfaces IP par lesquelles les connexions sont autorisées. Par défaut, il s'agit de localhost. Il peut être défini sur l'interface IP publique ou privée ou par tout en utilisant (\*). Avec `*`, PostgreSQL écoute sur toutes les interfaces : le filtrage repose alors sur `pg_hba.conf` et le firewall.

```bash
postgres=# ALTER SYSTEM SET listen_addresses TO '*';
```

* **archive_mode** : Ce paramètre doit être défini sur 'ON' pour activer l'archivage. Lorsque l'archivage est activé, les segments WAL sont copiés vers l'emplacement d'archivage, avant d'être recyclés (archive_mode n'est pas un paramètre obligatoire mais suggéré pour les bases de données de production).

```bash
postgres=# ALTER SYSTEM SET archive_mode TO 'ON';
```

* **archive_command** : La commande shell ou un script à l'aide duquel l'archiveur doit effectuer l'archivage d'un segment WAL complet. Voici un exemple de configuration qui utilise la commande cp sous linux. Par exemple

```bash
postgres=# ALTER SYSTEM SET archive_command TO 'cp %p /archives/%f';
```

* → **%p** est substitué par postgres avec le chemin d'accès au segment WAL réel.
* → **%f** est substitué par postgres avec le nom du fichier WAL.

* **wal_keep_size** : Quantité de segments WAL qui doivent être au moins conservés dans le répertoire pg_wal avant d'être recyclés.

```bash
postgres=# ALTER SYSTEM SET wal_keep_size TO '1GB';
```

→ Le défaut est 0, et cet espace est gardé en permanence dans `pg_wal`. Avec un slot de réplication (créé plus bas par `pg_basebackup`), c'est le slot qui retient les WAL dont le standby a besoin : inutile de gonfler `wal_keep_size` à des centaines de Go. Par contre un slot sans plafond peut remplir le disque du primary si le standby tombe, on le borne avec `max_slot_wal_keep_size` (PostgreSQL 13+, `-1` par défaut = illimité) :

```bash
postgres=# ALTER SYSTEM SET max_slot_wal_keep_size TO '300GB';
```

Une fois que toutes ces valeurs sont correctement éditées, il faut **redémarrer** PostgreSQL : `max_wal_senders`, `listen_addresses` et `archive_mode` ne sont lus qu'au démarrage, un `pg_reload_conf()` ne les applique pas (ils apparaissent avec `pending_restart = t` dans `pg_settings`). Seuls `archive_command`, `wal_keep_size` et `max_slot_wal_keep_size` passent avec un reload.

```bash
systemctl restart postgresql
```

Et enfin, **sur le noeud standby** (PostgreSQL arrêté, data directory vide), nous exécutons une sauvegarde de base pour activer la réplication. `--write-recovery-conf` crée `standby.signal` et écrit `primary_conninfo` et `primary_slot_name` dans `postgresql.auto.conf`, il n'y a plus de `recovery.conf` depuis PostgreSQL 12.

```bash
/usr/lib/postgresql/13/bin/pg_basebackup --create-slot --slot=data_slot_s1 --host=172.19.49.11 --username=replicator --write-recovery-conf --wal-method=stream --pgdata=/data/pgsql/13/data/ --progress --checkpoint=fast
```

### Deletion

C'est la seule tâche facile dans PostgreSQL, nous devons seulement supprimer le slot de réplication.

```bash
postgres=# SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE slot_name = 'data_slot_s1';
```

Grâce au `SELECT ... FROM pg_replication_slots WHERE`, elle n'échoue pas dans le cas où le slot n'existe pas : aucune ligne, donc la fonction n'est jamais appelée. Un `pg_drop_replication_slot('data_slot_s1')` seul renvoie `replication slot "data_slot_s1" does not exist`. C'est utile si vous le scriptez ! Le slot doit être inactif (standby arrêté), sinon on prend `replication slot "..." is active for PID ...`.

### Troubleshooting

#### Master Node

Pour troubleshoot une réplication, quelques commandes utiles :

```psql
postgres=# SELECT * FROM pg_replication_slots;
-[ RECORD 1 ]-------+---------------
slot_name           | data_slot_s1
plugin              |
slot_type           | physical
datoid              |
database            |
temporary           | f
active              | t
active_pid          | 93620
xmin                | 390443541
catalog_xmin        |
restart_lsn         | 24A8E/76E161C8
confirmed_flush_lsn |
wal_status          | reserved
safe_wal_size       | 274879913528
```

Nous voyons ici que notre `data_slot_s1` est dans `wal_status` réservé et est actif, donc nous avons une réplication saine.

Pour rappel, voici ce que dit la documentation

Disponibilité des fichiers WAL revendiqués par ce slot. Les valeurs possibles sont :

* `reserved` signifie que les fichiers réclamés sont dans la limite de la taille `max_wal_size`.
* `extended` signifie que la taille `max_wal_size` est dépassée mais que les fichiers sont toujours conservés, soit par le slot de réplication, soit par `wal_keep_size`.
* `unreserved` signifie que le slot ne conserve plus les fichiers WAL requis et que certains d'entre eux doivent être supprimés au prochain checkpoint. Cet état peut revenir à `reserved` ou `extended`.
* `lost` signifie que certains fichiers WAL requis ont été supprimés et que ce slot n'est plus utilisable.

```psql
postgres=# select usename,application_name,client_addr,backend_start,state,sync_state from pg_stat_replication;
-[ RECORD 1 ]----+------------------------------
usename          | replicator
application_name | walreceiver
client_addr      | 172.29.49.11
backend_start    | 2022-11-30 23:13:43.810803+01
state            | streaming
sync_state       | async
```

Nous voyons ici que nous avons une réplication en tant que user replicator avec le serveur ayant comme IP `172.29.49.11`. Il s'agit d'une réplication ayant débuté le `30 novembre à 23:13`.

#### Standby Node

```psql
postgres=# select pg_is_in_recovery(),pg_is_wal_replay_paused(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), pg_last_xact_replay_timestamp();
-[ RECORD 1 ]-----------------+------------------------------
pg_is_in_recovery             | t
pg_is_wal_replay_paused       | f
pg_last_wal_receive_lsn       | 24A8E/9DBBBE48
pg_last_wal_replay_lsn        | 24A8E/9DBBBE48
pg_last_xact_replay_timestamp | 2022-12-01 11:46:05.427305+01
```

Nous voyons actuellement que le noeud client est en mode de récupération et qu'il n'est pas "en pause" de réplication. Il lit actuellement le dernier segment qu'il a reçu, qui est le segment du 1er décembre à 11h45.

Si `pg_last_wal_receive_lsn` et `pg_last_wal_replay_lsn` étaient différents. Nous pourrions déterminer combien de Go manquent au nœud de secours, par exemple :

```psql
postgres=# select pg_wal_lsn_diff('0/925D7E70','0/2705BDA0');
-[ RECORD 1 ]---+-----------
pg_wal_lsn_diff | 1800913104
```

Lets see how much is 1800913104

```psql
postgres=# select round(1800913104/pow(1024,3.0),2) missing_lsn_GiB;
 missing_lsn_gib
-----------------
            1.68
```

Il manque 1,68GB sur le noeud standby, ce qui peut être beaucoup, selon la taille de votre base de données.

```psql
postgres=# SELECT CASE WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn()
postgres-# THEN 0
postgres-# ELSE EXTRACT (EPOCH FROM now() - pg_last_xact_replay_timestamp())
postgres-# END AS log_delay;
-[ RECORD 1 ]
log_delay | 0
```

Bonne nouvelle, notre réplication est saine et n'a pas de retard !

```psql
postgres=# SELECT  * FROM pg_stat_wal_receiver;
-[ RECORD 1 ]---------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
pid                   | 211574
status                | streaming
receive_start_lsn     | 249B0/EC000000
receive_start_tli     | 1
written_lsn           | 24A8F/2AEAA10
flushed_lsn           | 24A8F/2AEAA10
received_tli          | 1
last_msg_send_time    | 2022-12-01 12:03:26.367879+01
last_msg_receipt_time | 2022-12-01 12:03:26.382725+01
latest_end_lsn        | 24A8F/2AEAA10
latest_end_time       | 2022-12-01 12:03:26.367879+01
slot_name             | data_slot_s1
sender_host           | 172.19.49.11
sender_port           | 5432
conninfo              | user=replicator passfile=/var/lib/postgresql/.pgpass channel_binding=prefer dbname=replication host=172.19.49.11 port=5432 fallback_application_name=walreceiver sslmode=prefer sslcompression=0 sslsni=1 ssl_min_protocol_version=TLSv1.2 gssencmode=prefer krbsrvname=postgres target_session_attrs=any
```

Autres informations utiles

## Voir aussi

* [Postgres : les commandes qui servent](commands.md)
* [Upgrade sa version de PostgreSQL](upgrade_version.md)
* [CDC sur CloudNativePG](cnpg_cdc.md) - réplication logique vers un outil de CDC, slots et rétention WAL
* [Debug d'une réplication MySQL primaire/réplica](../mysql/troubleshooting/replication_slave.md)
