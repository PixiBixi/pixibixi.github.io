---
article: docs/databases/postgres/cnpg_cdc.md
checked: '2026-11-11'
commit: dd6cf2f14c0cc54c0e1be3ae81380db3895dd023
sources:
- repo: cloudnative-pg
  path: pkg/postgres/configuration.go
  lines: 575-582
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: cloudnative-pg
  path: docs/src/postgresql_conf.md
  lines: 376-425,605-630
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: cloudnative-pg
  path: docs/src/replication.md
  lines: 766-860
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: cloudnative-pg
  path: config/manager/default-monitoring.yaml
  lines: 135-162
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: cloudnative-pg
  path: pkg/management/postgres/webserver/metricserver/pg_collector.go
  lines: 220-232
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: cloudnative-pg
  path: docs/src/labels_annotations.md
  lines: 104-115
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: cloudnative-pg
  path: docs/src/release_notes/v1.29.md
  lines: 676-679
  ref: v1.30.1
  commit: 2a35abb4628f209d149825ef3c38011e0701ff2f
- repo: postgres
  path: src/backend/replication/logical/logical.c
  lines: 637
  ref: origin/REL_16_STABLE
  commit: 209846f1e35038dfc24fa2b0149c813517663ef6
- repo: postgres
  path: src/backend/replication/slot.c
  lines: 683
  ref: origin/REL_18_STABLE
  commit: a1635642e81125a5e7b8a2e717b9c4dd2f66896b
- repo: postgres
  path: doc/src/sgml/system-views.sgml
  lines: 2458-2505
  ref: origin/REL_16_STABLE
  commit: 209846f1e35038dfc24fa2b0149c813517663ef6
- repo: postgres
  path: doc/src/sgml/client-auth.sgml
  lines: 249-253
  ref: origin/REL_16_STABLE
  commit: 209846f1e35038dfc24fa2b0149c813517663ef6
- repo: postgres
  path: src/include/catalog/pg_proc.dat
  lines: 11155
  ref: origin/REL_17_STABLE
  commit: 74194d895e22da2a292598ea321c83b17505da95
unpinned: 8
---

# docs/databases/postgres/cnpg_cdc.md

## Findings

- L154 IMPRECISE corrigé : "Un `ALTER SYSTEM` ne ferait rien de propre ici : il écrit dans le `postgresql.auto.conf`". Sur un cluster récent, `spec.postgresql.enableAlterSystem` vaut `false` par défaut : avant PostgreSQL 17 le fichier est en lecture seule et la commande échoue avec `Permission denied`, depuis la 17 le GUC `allow_alter_system` la refuse. Reformuler en "refusé par défaut, et réservé au debug quand on l'active". Preuve : docs/src/postgresql_conf.md:605-630 @ v1.30.1
- L163 IMPRECISE corrigé : le message `This slot has been invalidated because it exceeded the maximum reserved size.` est celui de PostgreSQL 16 et 17. Sur PostgreSQL 18 il devient `This replication slot has been invalidated due to "wal_removed".`, donc un grep sur l'ancien texte ne trouve plus rien. Citer les 2 formes. Preuve : src/backend/replication/slot.c:683 @ origin/REL_18_STABLE

## Unpinned

- L80, L126, L281 : comportement de CloudNativePG 1.19 (pas de `managed.services`, slots logiques non copiés), pas de tag 1.19 relu
- L39 : création d'un slot avec `test_decoding` par un rôle `REPLICATION`, non rejoué
- L59, L61 : refus des `UPDATE` et `DELETE` sans identité de réplica, non rejoué
- L156 : motif du `wal_sender_timeout` à 5s ("couper les connexions inactives"), seule la valeur est dans le code
- L266, L268, L277 : chiffres du retour d'expérience (15GB sur 20Gi, 40GB sur 50Gi) et comportement de `local-path` ou de `allowVolumeExpansion`, plateforme et non code
- L282 : la mention "on ne l'a pas testé" avec un slot créé à la main est un aveu de l'auteur, non vérifiable
- L16, L193 : alertes PromQL de l'exemple (seuils, `for`), non exécutées contre une instance
- L227, L258 : noms de séries `cnpg_pg_logical_slot_budget_*` déduits du préfixe `cnpg_` plus le nom de la requête custom, non observés sur un exporter
