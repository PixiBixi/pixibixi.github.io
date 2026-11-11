---
article: docs/databases/postgres/postgresql_replication.md
checked: '2026-11-10'
commit: a83ed05f7867e6213d7409a35364081e002a973a
sources: []
unpinned: 7
---

# docs/databases/postgres/postgresql_replication.md

## Findings

- L77 ERROR corrigé : "recharger une autre fois" remplacé par un restart (`systemctl restart postgresql`), avec la liste des paramètres postmaster vs SIGHUP. Preuve : guc_tables.c@REL_18_0:3054 max_wal_senders PGC_POSTMASTER, :4656 listen_addresses PGC_POSTMASTER, :5177 archive_mode PGC_POSTMASTER, :2938 wal_keep_size PGC_SIGHUP, :4164 archive_command PGC_SIGHUP, :3075 max_slot_wal_keep_size PGC_SIGHUP ; test postgres:18.0 : ALTER SYSTEM max_wal_senders + pg_reload_conf() -> setting reste 10, pending_restart = t.
- L86 ERROR corrigé : binaire `pg_basebackup` ajouté, guillemet orphelin retiré, slot renommé `data_slot_s1` (cohérent avec la suite), `--user` remplacé par `--username` (forme longue officielle). Preuve : pg_basebackup.c@REL_18_0:2361-2385 ; test postgres:18.0 : pg_basebackup --create-slot --slot=data_slot_s1 --write-recovery-conf --wal-method=stream OK, standby.signal créé, `primary_slot_name = 'data_slot_s1'` dans postgresql.auto.conf.
- L29 IMPRECISE rejeté pour l'incohérence d'IP, corrigé pour md5 : pas d'incohérence, `172.29.49.11` est le standby (client_addr dans pg_stat_replication côté primary) et `172.19.49.11` le primary (sender_host côté standby), pg_hba autorise donc bien le standby. Rôles des deux IP explicités dans le texte. md5 remplacé par scram-sha-256 avec la nuance PG13. Preuve : postgresql.conf.sample@REL_14_0:96 `password_encryption = scram-sha-256`, @REL_13_0:91 `password_encryption = md5`.
- L42 IMPRECISE corrigé : seuil "plus de 5 standby" remplacé par "plus de 10 connexions de réplication (standby, pg_basebackup, réplication logique)". La partie "10 depuis PG12 (5 avant)" du finding est fausse : le défaut est 10 depuis PG10. Preuve : postgresql.conf.sample@REL_10_0:235 et @REL_11_0:239 `#max_wal_senders = 10`.
- L48 IMPRECISE corrigé : phrase ajoutée sur `*` qui expose toutes les interfaces (filtrage par pg_hba.conf et firewall) ; le restart est couvert par la correction L77. Preuve : postgresql.conf.sample@REL_18_0:60.
- L75 IMPRECISE corrigé : conseil "300GB de wal_keep_size" remplacé par l'explication du slot qui retient les WAL et un `max_slot_wal_keep_size` pour plafonner. Preuve : postgresql.conf.sample@REL_18_0:343-344 (wal_keep_size = 0, max_slot_wal_keep_size = -1).
- L97 IMPRECISE corrigé : explication de pourquoi la requête n'échoue pas, message d'erreur de l'appel direct, slot actif refusé. Preuve : slot.c@REL_18_0:580 "does not exist", :635 "is active for PID" ; test postgres:18.0 : requête filtrée sur slot absent -> 0 ligne sans erreur, appel direct -> `ERROR: replication slot "nope" does not exist`.

## En plus

- L94 : nom du slot dans la commande de suppression aligné sur `data_slot_s1` (même incohérence que L86).

## Modernisation

- scram-sha-256 dans pg_hba.conf : appliqué (avec nuance PG13).
- slot + max_slot_wal_keep_size plutôt qu'un gros wal_keep_size : appliqué.
- --write-recovery-conf pose standby.signal et primary_slot_name, plus de recovery.conf depuis PG12 : appliqué en une phrase. Preuve : src/fe_utils/recovery_gen.c@REL_13_0:94 et :148, test ci-dessus.

## Tests

- Docker postgres:18.0 (OrbStack) : reload vs pending_restart, pg_drop_replication_slot filtré et direct, pg_basebackup --create-slot --write-recovery-conf en local. Conteneur supprimé.

## À signaler

- L'article cible PG13 (chemins `/usr/lib/postgresql/13`), en fin de support. Je n'ai pas changé les chemins.
- Pas de `tested_with` ajouté : le test a été fait en 18.0 alors que les chemins de l'article sont en 13.
