---
article: docs/databases/mysql/advanced_commands.md
checked: '2026-11-10'
commit: 7293e130f519cef856fb2103736e5581bd427dc3
sources: []
unpinned: 6
---

# docs/databases/mysql/advanced_commands.md

## Findings

- L115 ERROR corrigé : la requête `information_schema.system_variables` est annoncée MariaDB only, ajout d'une requête MySQL 8.0+ via `performance_schema.variables_info` (`VARIABLE_SOURCE <> 'COMPILED'`) jointe à `performance_schema.global_variables`. Preuve : mysql:8.4.3 renvoie `ERROR 1109 (42S02) Unknown table 'SYSTEM_VARIABLES' in information_schema`, mariadb:11.4.4 renvoie les lignes ; la requête `variables_info` tourne sur 8.4.3 (datadir GLOBAL /etc/my.cnf...) et échoue sur MariaDB (`Table 'performance_schema.variables_info' doesn't exist`).
- L9 IMPRECISE corrigé : phrase d'intro complétée (une requête par moteur pour les variables non-défaut). Preuve : idem.
- L14 IMPRECISE corrigé : ajout d'une phrase "estimation pire cas" (join_buffer/tmp_table plusieurs fois par requête, performance_schema non compté). Preuve : formule exécutée sur les deux moteurs (2.84 GB MySQL 8.4, 3.06 GB MariaDB 11.4 avec les défauts) ; le reste est la sémantique documentée des variables, non relu en source.
- L41 IMPRECISE corrigé : filtre remplacé par `NOT IN ('information_schema', 'performance_schema', 'sys', 'mysql', 'ndbinfo')`. Preuve : sur mysql:8.4.3 l'ancien filtre laissait passer `mysql`, `performance_schema` (comparaison sensible à la casse, `PERFORMANCE_SCHEMA` ne matche pas) et `sys` (113 tables PERFORMANCE_SCHEMA + 100 vues NULL comptées) ; le nouveau ne renvoie que la table utilisateur, sur les deux moteurs.
- L46 IMPRECISE corrigé : les 20% sont présentés comme règle empirique, avec la mention que data+index est un majorant du working set et que le pool n'est pas la seule RAM. Preuve : aucune source (pas de chiffre officiel), reformulation seulement.
- L99 IMPRECISE corrigé : ajout du cache 24h des stats sur MySQL 8 (`ANALYZE TABLE` ou `SET SESSION information_schema_stats_expiry = 0`) et du cas tablespace partagé. Preuve : `SELECT @@information_schema_stats_expiry` = 86400 sur mysql:8.4.3, `SET SESSION ... = 0` accepté.

## En plus

- L65 corrigé : commande de conversion MyISAM vers InnoDB cassée (`Q=\``, chaînes SQL non quotées,`engine = MyISAM` sans quotes). Réécrite avec `Q='\`'` et les littéraux quotés, exclusion des schémas système. Preuve : table MyISAM `t.m` convertie en InnoDB sur mysql:8.4.3 et mariadb:11.4.4.
- L75 corrigé : `SHOW (FULL) PROCESSLIST 'G;` et `(''G)` remplacés par `SHOW [FULL] PROCESSLIST\G` et `` `\G` `` (artefact de conversion). Preuve : `SHOW FULL PROCESSLIST\G` exécuté sur 8.4.3.
- L88 corrigé : bloc `sql` contenant du shell aux quotes cassées ; séparé en `pt-show-grants` puis une boucle bash avec `quote(User)`/`quote(Host)` et `sed 's/$/;/'`. Preuve : boucle exécutée sur les deux moteurs, sort `-- 'bob'@'%'` puis `GRANT USAGE ... ;`.
- L101 corrigé : `concat(TABLE_SCHEMA, TABLE_NAME)` sans séparateur, ajout de `'.'`. Preuve : sortie `mysql.innodb_table_stats` sur 8.4.3.

## Modernisation

- Appliquée : requête `performance_schema.variables_info` pour MySQL 8.x (avec `VARIABLE_PATH` pour savoir quel fichier a changé la valeur). Le schéma `sys` n'a pas été ajouté, inutile ici.

## Tests

- Docker mysql:8.4.3 et mariadb:11.4.4 (supprimés à la fin). `tested_with` ajouté : MySQL 8.4, MariaDB 11.4.

## À signaler

- Rien.
