---
description: Commandes avancées MySQL et MariaDB pour l'administration - analyse des performances, gestion de la RAM, des connexions et optimisation des requêtes.
tags:
  - MySQL
tested_with:
  - "MySQL 8.4"
  - "MariaDB 11.4"
---

# MySQL : Commandes avancées

La plupart de ces commandes sont disponibles pour MySQL ou MariaDB. Quand ce n'est pas le cas (variables non-défaut), on donne une requête par moteur.

## RAM

```sql
SELECT ( @@key_buffer_size
+ @@innodb_buffer_pool_size
+ @@innodb_log_buffer_size
+ @@max_connections * (
    @@read_buffer_size
    + @@read_rnd_buffer_size
    + @@sort_buffer_size
    + @@join_buffer_size
    + @@binlog_cache_size
    + @@thread_stack
    + @@tmp_table_size )
) / (1024 * 1024 * 1024) AS MAX_MEMORY_GB;
```

Check la max RAM qui sera utilisée par MySQL. Il est important de bien prendre en compte la RAM pouvant être utilisée par chaque connection.

C'est une estimation pire cas, pas un plafond exact : `join_buffer_size` et `tmp_table_size` peuvent être alloués plusieurs fois par requête (une fois par jointure ou table temporaire), et la RAM du `performance_schema` et des structures internes n'est pas comptée.

Des sites existent tels que [MySQLCalculator](https://www.mysqlcalculator.com/), [MySQL DBA](https://www.abhinavbit.com/p/mysql-memory-calculator.html) ou encore le plus visuel [Avchinnikov](https://avchinnikov.com/utils/mysqlcalc)

## InnoDB

```sql
SELECT  ENGINE,
        ROUND(SUM(data_length) /1024/1024, 1) AS "Data MB",
        ROUND(SUM(index_length)/1024/1024, 1) AS "Index MB",
        ROUND(SUM(data_length + index_length)/1024/1024, 1) AS "Total MB",
        COUNT(*) "Num Tables"
    FROM  INFORMATION_SCHEMA.TABLES
    WHERE  table_schema NOT IN ('information_schema', 'performance_schema', 'sys', 'mysql', 'ndbinfo')
    GROUP BY  ENGINE;
```

Nous permet de déterminer la taille de chaque moteur de stockage, hors schémas système (sur MySQL 8 la comparaison sur `table_schema` est sensible à la casse, d'où les noms en minuscules). Ainsi, nous pouvons dimensionner **innodb_buffer_pool_size** au plus juste : en règle empirique, 20% en plus de la valeur retournée. Data + index sur disque est un majorant du working set, et le buffer pool n'est pas la seule RAM consommée (cf. section précédente).

```sql
MariaDB [(none)]> ...
+--------+---------+----------+----------+------------+
| ENGINE | Data MB | Index MB | Total MB | Num Tables |
+--------+---------+----------+----------+------------+
| CSV    |     0.0 |      0.0 |      0.0 |          2 |
| InnoDB |  1276.5 |    339.3 |   1615.7 |        172 |
| MyISAM |     0.5 |      0.1 |      0.6 |         25 |
+--------+---------+----------+----------+------------+
3 rows in set (0.007 sec)
```

Nous savons que dans notre exemple nous avons un moteur InnoDB utilisant
1.6G. Nous pouvons donc définir le pool à 2G.

On convertit toutes les tables MyISAM en InnoDB d'un coup en générant les `ALTER TABLE` et en les renvoyant dans `mysql` :

```bash
Q='`'
mysql --skip-column-names -Be "select concat('alter table ${Q}', table_schema, '${Q}.${Q}', table_name, '${Q} engine=innodb;') from information_schema.tables where engine = 'MyISAM' and table_schema not in ('mysql', 'information_schema', 'performance_schema', 'sys')" | mysql
```

Un use case parmis tant d'autres, une cluster Galera.

## Misc

```sql
MariaDB [(none)]> SHOW [FULL] PROCESSLIST\G
```

Permet de lister les process SQL tournant d'une manière « propre »
(`\G`), on peut également aller plus loin en détail en ajoutant FULL

```sql
MariaDB [(none)]>  KILL xxxx
```

Permet de kill le process MySQL xxxx (Attention, rollback de la
transaction, peut également être long)

Pour dump la liste des users SQL et leurs grants, `pt-show-grants` fait le travail :

```bash
pt-show-grants
```

Si `pt-show-grants` n'est pas dispo, on boucle sur `mysql.user` :

```bash
mysql --silent --skip-column-names --execute "select concat(quote(User), '@', quote(Host)) from mysql.user" | sort | \
while read -r u; do
  echo "-- $u"
  mysql --silent --skip-column-names --execute "show grants for $u" | sed 's/$/;/'
done
```

```sql
SELECT ENGINE,
       concat(TABLE_SCHEMA, '.', TABLE_NAME) AS TABLE_NAME,
       round(DATA_LENGTH/1024/1024, 2) AS data_length,
       round(INDEX_LENGTH/1024/1024, 2) AS index_length,
       round(DATA_FREE/1024/1024, 2) AS data_free,
       (data_free/(index_length+data_length)) AS frag_ratio
FROM information_schema.tables
WHERE DATA_FREE > 0
ORDER BY data_free DESC LIMIT 10;
```

* Permet de voir la fragmentation des tables MySQL. Il est possible de
    récuperer l'espace en faisant un **OPTIMIZE TABLE**
* Sur MySQL 8, ces statistiques sont mises en cache 24h (`information_schema_stats_expiry = 86400`) : on lance un `ANALYZE TABLE` ou un `SET SESSION information_schema_stats_expiry = 0;` avant pour avoir des valeurs fraîches. Pour une table dans un tablespace partagé (`innodb_file_per_table = OFF`), `DATA_FREE` est celui de tout le tablespace, pas de la table

Pour lister les variables qui n'ont pas les valeurs par défaut, la requête dépend du moteur. Sur MariaDB, `information_schema.system_variables` donne la valeur par défaut :

```sql
SELECT information_schema.system_variables.variable_name,
       information_schema.system_variables.default_value,
       global_variables.variable_value
FROM information_schema.system_variables,
     information_schema.global_variables
WHERE system_variables.variable_name=global_variables.variable_name
  AND system_variables.default_value <> global_variables.variable_value
  AND system_variables.default_value <> 0
```

Sur MySQL, cette table n'existe pas (`Unknown table 'SYSTEM_VARIABLES' in information_schema`). On passe par `performance_schema.variables_info` (MySQL 8.0+), dont `VARIABLE_SOURCE` vaut `COMPILED` tant que la variable n'a été changée nulle part (`my.cnf`, ligne de commande, `SET GLOBAL`, `SET PERSIST`) :

```sql
SELECT vi.VARIABLE_NAME, vi.VARIABLE_SOURCE, vi.VARIABLE_PATH, gv.VARIABLE_VALUE
FROM performance_schema.variables_info vi
JOIN performance_schema.global_variables gv USING (VARIABLE_NAME)
WHERE vi.VARIABLE_SOURCE <> 'COMPILED'
ORDER BY vi.VARIABLE_NAME;
```

## Voir aussi

* [Gérer ses users MySQL](users.md)
* [Créer son cluster Galera](galera_gluster.md)
* [Debug d'une réplication primaire/réplica](troubleshooting/replication_slave.md)
