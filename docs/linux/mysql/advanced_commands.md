# MySQL : Commandes avancées

La plupart de ces commandes sont disponibles pour MySQL ou MariaDB.

## InnoDB

``` sql
SELECT  ENGINE,
        ROUND(SUM(data_length) /1024/1024, 1) AS "Data MB",
        ROUND(SUM(index_length)/1024/1024, 1) AS "Index MB",
        ROUND(SUM(data_length + index_length)/1024/1024, 1) AS "Total MB",
        COUNT(*) "Num Tables"
    FROM  INFORMATION_SCHEMA.TABLES
    WHERE  table_schema not in ("information_schema", "PERFORMANCE_SCHEMA", "SYS_SCHEMA", "ndbinfo")
    GROUP BY  ENGINE;
```

de

Nous permet de déterminer la taille de chaque moteur de stockage. Ainsi,
nous pouvons dimensionner **innodb_buffer_pool_size** au plus juste (20%
en plus de la valeur retournée)

``` sql
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

``` bash
Q=` ; mysql --skip-column-names -Be "select concat(alter table ${Q}, table_schema,${Q}.${Q}, table_name, ${Q} engine=innodb;)
from information_schema.tables where engine = MyISAM and table_schema not in (mysql)" | mysql
```

Cette commande nous sert à convertir toutes les tables MyISAM en InnoDB.
Un use case parmis tant d'autres, une cluster Galera.

## Misc

``` sql
MariaDB [(none)]> SHOW (FULL) PROCESSLIST 'G;
```

Permet de lister les process SQL tournant d'une manière '"propre'"
(''G), on peut également aller plus loin en détail en ajoutant FULL

``` sql
MariaDB [(none)]>  KILL xxxx
```

Permet de kill le process MySQL xxxx (Attention, rollback de la
transaction, peut également être long)

``` sql
pt-show-grants
mysql --silent --skip-column-names --execute "select concat(',User,'@',Host,') as User from mysql.user" | sort | '
while read u
 do echo "-- $u"; mysql --silent --skip-column-names --execute "show grants for $u" | sed s/$/;/
done
```

-   Permet de dump la liste des users SQL (commande mysql si
    pt-show-grants pas dispo)

``` sql
SELECT ENGINE,
       concat(TABLE_SCHEMA, ., TABLE_NAME) AS TABLE_NAME,
       round(DATA_LENGTH/1024/1024, 2) AS data_length,
       round(INDEX_LENGTH/1024/1024, 2) AS index_length,
       round(DATA_FREE/1024/1024, 2) AS data_free,
       (data_free/(index_length+data_length)) AS frag_ratio
FROM information_schema.tables
WHERE DATA_FREE > 0
ORDER BY data_free DESC LIMIT 10;
```

-   Permet de voir la fragmentation des tables MySQL. Il est possible de
    récuperer l'espace en faisant un **OPTIMIZE TABLE**

``` sql
SELECT information_schema.system_variables.variable_name,
       information_schema.system_variables.default_value,
       global_variables.variable_value
FROM information_schema.system_variables,
     information_schema.global_variables
WHERE system_variables.variable_name=global_variables.variable_name
  AND system_variables.default_value <> global_variables.variable_value
  AND system_variables.default_value <> 0
```

-   Permet de lister les variables qui n'ont pas les valeurs par défaut
