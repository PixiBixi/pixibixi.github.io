---
article: docs/databases/postgres/upgrade_version.md
checked: '2026-11-10'
commit: f47036319f9f8d83f7edc92ec7dd48812a7b8e61
sources: []
unpinned: 5
---

# docs/databases/postgres/upgrade_version.md

## Findings

- L33 ERROR corrigé partiellement, rejeté sur un point : syntaxe corrigée en `--old-options '-c config_file=...'` / `--new-options '-c config_file=...'` (quotée). Rejeté : "les --old-bindir/--old-datadir ou PGBINOLD/PGDATAOLD suffisent" est faux sur Debian, où postgresql.conf vit dans /etc et pas dans le data directory. Preuve : test Debian 13 + PGDG 17 vers 18 : commande d'origine (`-config_file=`) -> "could not connect to source postmaster" ; sans options -> même échec ; avec `-c config_file=` quoté -> "*Clusters are compatible*". Doc : pgupgrade.sgml@REL_18_0:158-161.
- L39 ERROR corrigé : `--link` ajouté à la commande `--check`, avec la raison (contrôles propres au mode). Preuve : pgupgrade.sgml@REL_18_0:601-603 "should use the option --link, --clone, --copy-file-range, or --swap with --check to enable mode-specific checks".
- L55 OUTDATED corrigé : `analyze_new_cluster.sh` retiré, étape vacuumdb ajoutée (`--analyze-in-stages --missing-stats-only` puis `--analyze-only`, et la variante pré-18), `;` remplacé par `&&` et delete_old_cluster.sh déplacé après validation. Preuve : src/bin/pg_upgrade/.gitignore@REL_13_0 vs @REL_14_0 (analyze_new_cluster.sh disparaît) ; pgupgrade.sgml@REL_18_0:851-853 ; test : pg_upgrade 18 ne génère que delete_old_cluster.sh dans ~ et affiche les deux commandes vacuumdb, qui passent ; vacuumdb.c@REL_17_0 sans `missing-stats-only`, @REL_18_0 avec.
- L45 IMPRECISE corrigé : le tiret typographique devant `link` devient `--link` (ou `-k`), l'avertissement passe à l'étape d'exécution et précise que le rollback reste possible tant que le nouveau cluster n'a pas démarré (en copie, l'ancien reste intact). Preuve : pgupgrade.sgml@REL_18_0:135 et :878-907 (Reverting to old cluster).
- L48 IMPRECISE corrigé : le texte explique que Debian a mis le nouveau cluster sur 5433 car l'ancien occupe 5432, que l'ancien reste sur 5432 et ne doit plus être démarré ; alternative pg_upgradecluster mentionnée. Preuve : test : après install, pg_lsclusters -> 17 sur 5432, 18 sur 5433 ; après le sed, les deux confs ont `port = 5432`. pg_upgradecluster non testé (comportement Debian connu, non vérifié ici).

## En plus

- Data checksums : depuis PG18, initdb les active par défaut, et pg_upgrade --check d'un 17 sans checksums vers un 18 Debian par défaut échoue. Bloc ajouté avec `pg_createcluster <new> main -- --no-data-checksums`. Preuve : test : "old cluster does not use data checksums but the new one does / Failure, exiting", puis OK après recréation avec --no-data-checksums.
- Étape finale : `pg_dropcluster 17 main` cité pour retirer la config dans /etc (après delete_old_cluster.sh, `pg_lsclusters` montrait encore le cluster 17 en `<unknown>`). La commande pg_dropcluster elle-même n'a pas été testée dans cet état.

## Modernisation

- Cibler une version récente : appliqué, exemple passé de 11 vers 13 à 17 vers 18, avec `variables: old / new` et `tested_with`.
- vacuumdb --missing-stats-only et transfert des stats en PG18 (`--no-statistics`) : appliqué. Preuve : pgupgrade.sgml@REL_18_0:834-853 ; @REL_17_0 sans no-statistics.
- --jobs et --clone : appliqués (--clone PG12+, preuve pgupgrade.sgml@REL_12_0 vs @REL_11_0, description à @REL_18_0:221-228). --copy-file-range et --swap (PG18) non mentionnés : moins utiles au lecteur visé, à ajouter si l'auteur veut.

## Tests

- Docker debian:trixie-20251020 + paquets PGDG postgresql-17 et postgresql-18 (18.6-1.pgdg13+2) : pg_upgrade --check (3 variantes d'options), échec checksums, pg_upgrade --link --jobs=2, sed du port, démarrage, vacuumdb x2, count(*) sur une table de test (1000 lignes OK), delete_old_cluster.sh. Conteneur supprimé.

## À signaler

- Les variables ne sont substituées que dans les blocs de code (jd-vars.js cible `.highlight code`) : en prose et en code inline j'ai écrit 17 / 18 en dur.
- `tested_with` : "PostgreSQL 17 vers 18 (Debian 13, paquets PGDG)", seule combinaison testée.
