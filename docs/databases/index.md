---
description: MySQL, PostgreSQL, Redis, Elasticsearch et Memcached — administration, réplication et troubleshooting.
tags:
  - MySQL
  - PostgreSQL
  - Redis
  - Elasticsearch
---

# Databases

Les bases de données, c'est là où tout se passe quand ça plante. Cette section couvre l'essentiel : MySQL en cluster Galera, PostgreSQL avec sa réplication, Redis en HA, et quelques outils pour Elasticsearch et Memcached.

## Contenus

- [MySQL — Commandes avancées](mysql/advanced_commands.md) — requêtes et opérations admin
- [MySQL — Base](mysql/db_mysql.md) — restaurer la DB système, premiers secours
- [MySQL — Galera/Gluster](mysql/galera_gluster.md) — cluster multi-primary
- [MySQL — Utilisateurs](mysql/users.md) — gestion des droits et comptes
- [MySQL — Générer des INSERT INTO](mysql/troubleshooting/generate_insert_into.md) — exporter des données sous forme de statements
- [MySQL — Réplication slave](mysql/troubleshooting/replication_slave.md) — debug et reconfiguration
- [PostgreSQL — Commandes](postgres/commands.md) — psql et administration courante
- [PostgreSQL — Réplication](postgres/postgresql_replication.md) — mise en place streaming replication
- [PostgreSQL — Upgrade de version](postgres/upgrade_version.md) — pg_upgrade pas à pas
- [Redis — Cluster HA](redis/cluster_ha.md) — Sentinel et Redis Cluster
- [Redis — Decode function](redis/decode_function.md) — décoder les données sérialisées
- [Elasticsearch — Slow queries](elasticsearch/log_slow_queries.md) — activer et lire les slow logs
- [Memcached — Commandes](memcached/misc_commands.md) — stats et debug via telnet
