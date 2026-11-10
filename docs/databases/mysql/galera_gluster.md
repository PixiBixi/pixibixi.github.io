---
description: Déployer un cluster MariaDB Galera haute disponibilité - réplication synchrone multi-maître avec détection de défaillance
tags:
  - MariaDB
  - Galera
  - HA
tested_with:
  - "MariaDB 11.8.3 (Galera 26.4.23)"
---

# Créer son cluster Galera

Réseau high speed (Gbps minimum) non routé, latence minimale, disques SSD - c'est la base.
Chaque nœud est master : réplication multi-master synchrone. On ne load-balance **pas** les écritures,
uniquement les lectures.

Tout ce qui suit vise **MariaDB** (paquets Debian, `galera_new_cluster`). MySQL Community n'embarque pas Galera : côté MySQL, il faut passer par Percona XtraDB Cluster, dont la configuration diffère.

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
| 4567 | TCP (+UDP en multicast) | Galera replication |
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

<div class="steps" markdown>

1. On initialise le cluster depuis node1 :

    ```bash
    node1$ galera_new_cluster
    ```

2. On vérifie que le cluster est bien démarré :

    ```sql
    SHOW STATUS LIKE 'wsrep_cluster_size';

    +--------------------+-------+
    | Variable_name      | Value |
    +--------------------+-------+
    | wsrep_cluster_size | 1     |
    +--------------------+-------+
    ```

3. Puis on démarre les autres nœuds :

    ```bash
    node2$ systemctl start mariadb
    node3$ systemctl start mariadb
    ```

    `wsrep_cluster_size` doit passer à 3.

</div>

!!! warning "InnoDB uniquement"
    Galera fonctionne **uniquement** en InnoDB. MyISAM est encore expérimental - à éviter en production.

## Troubleshooting

### Reset d'un nœud

Si un nœud est trop désynchronisé, on le recrée de 0 :

```bash
rm -rf /var/lib/mysql && systemctl start mariadb
```

Tout est re-importé depuis le nœud primary actuel via SST.

### Redémarrer tout le cluster - safe_to_bootstrap

Après un arrêt propre de tout le cluster (ex: maintenance), le dernier nœud arrêté porte `safe_to_bootstrap: 1` dans son `grastate.dat` : on lance `galera_new_cluster` sur lui, directement. Sur les autres, Galera refuse de bootstrapper (`It may not be safe to bootstrap the cluster from this node`).

Après un crash ou un arrêt brutal de tous les nœuds, ils sont tous à `safe_to_bootstrap: 0` avec `seqno: -1` : le fichier ne dit plus qui est le plus avancé. On récupère la position réelle sur **chaque** nœud :

```bash
node1$ cat /var/lib/mysql/grastate.dat
# seqno:   -1
# safe_to_bootstrap: 0

node1$ sudo -u mysql mariadbd --wsrep-recover 2>&1 | grep 'Recovered position'
# ... WSREP: Recovered position: 6e66d976-dbcd-11f1-bef0-332dc50e8624:11
```

On force ensuite `safe_to_bootstrap` uniquement sur le nœud au seqno (le nombre après `:`) le plus élevé. Forcer un nœud en retard fait perdre les transactions qu'il n'a pas reçues :

```bash
node1$ sed -i 's/safe_to_bootstrap: 0/safe_to_bootstrap: 1/' /var/lib/mysql/grastate.dat
node1$ galera_new_cluster
```

Puis redémarrer les autres nœuds normalement.

Toutes les infos sur [le site Galera](https://galeracluster.com/library/training/tutorials).

## Voir aussi

* [MySQL : Commandes avancées](advanced_commands.md)
* [Gérer ses users MySQL](users.md)
* [Debug d'une réplication primaire/réplica](troubleshooting/replication_slave.md)
