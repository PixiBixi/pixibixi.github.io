# Commandes utiles Postgres

```sql
 SELECT i.relname "Table Name",indexrelname "Index Name",
 pg_size_pretty(pg_total_relation_size(relid)) As "Total Size",
 pg_size_pretty(pg_indexes_size(relid)) as "Total Size of all Indexes",
 pg_size_pretty(pg_relation_size(relid)) as "Table Size",
 pg_size_pretty(pg_relation_size(indexrelid)) "Index Size",
 reltuples::bigint "Estimated table row count"
 FROM pg_stat_all_indexes i JOIN pg_class c ON i.relid=c.oid
 WHERE i.relname='uploads'
 ```

  * Pour voir les informations détaillées d'une table.

Il y a un tools open-source Github permettant d'avoir une multitudes de commandes utiles rapidement : [Postgres DBA](https://github.com/NikolayS/postgres_dba)
