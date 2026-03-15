---
description: Déployer un cluster Galera MySQL haute disponibilité — réplication synchrone multi-maître avec détection de défaillance
tags:
  - MySQL
  - Galera
  - HA
---

# Créer son cluster Galera

Réseau high speed (Gbps minimum) non routé, latence minimale, disques SSD — c'est la base.
Chaque nœud est master : réplication multi-master synchrone. On ne load-balance **pas** les écritures,
uniquement les lectures.

## Résolution de noms

2 solutions : DNS ou `/etc/hosts`. Même fichier sur tous les nœuds.

```bash
# /etc/hosts
10.0.0.1 node1
10.0.0.2 node2
10.0.0.3 node3
```

## Ports firewall

Ouvrir entre tous les nœuds :

| Port | Proto | Usage |
| ---- | ----- | ----- |
| 3306 | TCP | MySQL client |
| 4444 | TCP | SST (State Snapshot Transfer) |
| 4567 | TCP+UDP | Galera replication |
| 4568 | TCP | IST (Incremental State Transfer) |

## Configuration MariaDB

Installer le package galera, puis créer `/etc/mysql/mariadb.conf.d/60-galera.cnf` sur chaque nœud :

```ini
[mysqld]
binlog_format=ROW
bind-address=10.0.0.1
default_storage_engine=innodb
innodb_autoinc_lock_mode=2
innodb_flush_log_at_trx_commit=0
wsrep_on=ON
wsrep_provider=/usr/lib/libgalera_smm.so
wsrep_cluster_name="MyCluster"
wsrep_cluster_address="gcomm://node1,node2,node3"
wsrep_node_address="10.0.0.1"
wsrep_sst_method=rsync
```

`wsrep_node_address` n'est pas obligatoire mais évite que Galera devine la mauvaise IP.
Adapter `bind-address` et `wsrep_node_address` sur chaque nœud.

## Bootstrap

On initialise le cluster depuis node1 :

```bash
node1$ galera_new_cluster
```

On vérifie que le cluster est bien démarré :

<!-- markdownlint-disable MD046 -->
```sql
SHOW STATUS LIKE 'wsrep_cluster_size';

+--------------------+-------+
| Variable_name      | Value |
+--------------------+-------+
| wsrep_cluster_size | 1     |
+--------------------+-------+
```
<!-- markdownlint-enable MD046 -->

Puis on démarre les autres nœuds :

```bash
node2$ systemctl start mariadb
node3$ systemctl start mariadb
```

`wsrep_cluster_size` doit passer à 3.

!!! warning "InnoDB uniquement"
    Galera fonctionne **uniquement** en InnoDB. MyISAM est encore expérimental — à éviter en production.

## Troubleshooting

### Reset d'un nœud

Si un nœud est trop désynchronisé, on le recrée de 0 :

```bash
rm -rf /var/lib/mysql && systemctl start mariadb
```

Tout est re-importé depuis le nœud primary actuel via SST.

### Cluster arrêté proprement — safe_to_bootstrap

Si tous les nœuds sont arrêtés proprement (ex: maintenance), Galera refuse de redémarrer
sans savoir quel nœud a les données les plus récentes.

```bash
# Identifier le dernier nœud arrêté (seqno le plus élevé)
node1$ cat /var/lib/mysql/grastate.dat
# safe_to_bootstrap: 0  ← si tous les nœuds ont 0, en forcer un

node1$ sed -i 's/safe_to_bootstrap: 0/safe_to_bootstrap: 1/' /var/lib/mysql/grastate.dat
node1$ galera_new_cluster
```

Puis redémarrer les autres nœuds normalement.

Toutes les infos sur [le site Galera](https://galeracluster.com/library/training/tutorials).
