# Créer son cluster Galera

## Introduction

On va faire simple, sans trop de rédaction.

Tout d'abord, bien évidemment, il faut privilégier un réseau high speed
(Gbps minimum) non routé, avec le moins de latence possible, sur des
disques SSD.

L'intérêt d'un cluster Galera est que chaque noeud est master, il
s'agit donc d'une replication master-master. Cependant, pour garantir
une intégrité des données, attention à ne pas load-balancer les
écritures. Les lectures peuvent quant à elles balanced entre tous les
noeuds de votre cluster.

## Pré-requis

2 solutions, soit on utilise un domaine, soit un fichier hosts.

```bash
    node1$ cat /etc/hosts
    10.0.0.1 node1
    10.0.0.2 node2
    10.0.0.3 node2
```

Penser à bien avoir le même fichier hosts sur vos différents hosts

## Configuration MariaDB

Une fois que ceci est fait, 2-3 réglages sont nécessaires. Il faut bien
évidemment installe le package galera. Par défaut, les modifications
s'effectueront dans le fichier
**/etc/mysql/mariadb.conf.d/60-galera.cnf**

Voilà à quoi ce dernier doit ressembler (pour le node1)

```ini
    binlog_format=ROW
    bind-address=10.0.0.1
    default_storage_engine=innodb
    innodb_autoinc_lock_mode=2
    innodb_flush_log_at_trx_commit=0
    wsrep_provider=/usr/lib/libgalera_smm.so
    wsrep_cluster_name="MyCluster"
    wsrep_cluster_address="gcomm://node1,node2,node3"
    wsrep_node_address="10.0.0.1"
    wsrep_sst_method=rsync
```

Le wsrep_node_address n'est pas obligatoire, cependant, il se peut que
l'adresse soit mal '"devinée'", je préfère donc la fixer manuellement.

Une fois que ce fichier est bon sur votre cluster, il faut créer le
cluster depuis le serveur qui sera primaire.

```bash
    node1$ galera_new_cluster
```

Une fois l'initialisation passée, on vérife sur MySQL la variable
qu'il faut

<!-- markdownlint-disable MD046 -->
```sql
SHOW STATUS LIKE wsrep_cluster_size;

+--------------------+-------+
| Variable_name      | Value |
+--------------------+-------+
| wsrep_cluster_size | 1     |
+--------------------+-------+
```
<!-- markdownlint-enable MD046 -->

Et on ajoute les autres nodes

```bash
node2$ systemctl start mariadb
```

Si tout s'est bien passé, on revérifie la valeur de cette variable,
elle devrait passer a 3.

Attention, pour rappel, Galera fonctionne **uniquement** en InnoDB. Le
MyISAM est encore expérimental et est déconseillé en production.

Toutes les informations sont diponibles sur
[le site Galera](https://galeracluster.com/library/training/tutorials)

## Troubleshoting

Si pour quelconque raison on a un problème sur un node Galera, il peut
être plus rapide de le recréér de 0. Il faut bien évidemment regarder
les logs Galera et vérifier que les entrées FW soit OK.

Pour reset un node d'un cluster Galera :

```bash
λ yann ~ →  rm -rf /var/lib/mysql && service mysql start
```

Tout sera re-importé depuis le master actuel
