---
description: Commandes utiles PostgreSQL - inspecter les index, les tailles de table et exporter les résultats en CSV
tags:
  - PostgreSQL
---

# Postgres : les commandes qui servent

Pour voir la taille d'une table, de ses index et son nombre de lignes estimé, on filtre sur le schéma et le nom de la table (sans le schéma, les tables homonymes des autres schémas remontent aussi) :

```sql
 SELECT i.relname "Table Name",indexrelname "Index Name",
 pg_size_pretty(pg_total_relation_size(relid)) As "Total Size",
 pg_size_pretty(pg_indexes_size(relid)) as "Total Size of all Indexes",
 pg_size_pretty(pg_relation_size(relid)) as "Table Size",
 pg_size_pretty(pg_relation_size(indexrelid)) "Index Size",
 reltuples::bigint "Estimated table row count"
 FROM pg_stat_all_indexes i JOIN pg_class c ON i.relid=c.oid
 WHERE i.schemaname='public' AND i.relname='uploads'
 ```

Il y a un tools open-source GitHub permettant d'avoir une multitudes de commandes utiles rapidement : [Postgres DBA](https://github.com/NikolayS/postgres_dba)

---

Pour sortir le résultat d'une requête en vrai CSV (séparateur `,`, champs contenant une virgule, un guillemet ou un retour ligne quotés), psql 12+ a un format dédié :

```sql
psql> \pset format csv
psql> \o '/tmp/output.csv'
psql> SELECT * from users;
psql> \q
```

On peut aussi passer par `\copy`, en une ligne, qui écrit le fichier côté client avec l'en-tête :

```sql
psql> \copy (SELECT * FROM users) TO '/tmp/output.csv' CSV HEADER
```

L'ancienne recette `\f '|'` + `\a` ne produit pas du CSV : aucun quoting (un `|` ou un retour ligne dans un champ casse le fichier) et un pied `(N rows)` en fin de fichier.

## Voir aussi

* [PostgreSQL Replication](postgresql_replication.md)
* [Upgrade sa version de PostgreSQL](upgrade_version.md)
