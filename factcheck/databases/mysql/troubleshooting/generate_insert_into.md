---
article: docs/databases/mysql/troubleshooting/generate_insert_into.md
checked: '2026-11-11'
commit: fdae4593651136074b93c0f4417de4fbf835372e
sources: []
unpinned: 1
---

# docs/databases/mysql/troubleshooting/generate_insert_into.md

## Findings

- L16 IMPRECISE corrigé : ajout de la sortie réelle par défaut (un seul INSERT multi-lignes entouré de `LOCK TABLES` / `UNLOCK TABLES`, plus `DISABLE KEYS`) et de la variante `--skip-extended-insert --complete-insert`. Preuve : test mysql:8.4.6 (mysqldump 8.4.6), `mysqldump -t DB Tbl --where="champ in (280, 172);"` sort `LOCK TABLES \`Tbl\` WRITE; INSERT INTO \`Tbl\` VALUES (1,280,'a'),(2,172,'b'); UNLOCK TABLES;` et `/*!40000 ALTER TABLE \`Tbl\` DISABLE KEYS*/`.

## En plus

- L16-17 : "va simple générer" corrigé en "va simplement générer", "donné" accordé en "donnée".

## Modernisation

- Appliqué : `--skip-extended-insert --complete-insert` (testé : un INSERT par ligne avec `(\`id\`, \`champ\`, \`name\`)`), plus`--compact` (testé avec les deux : seules les 2 lignes INSERT sortent).
- Appliqué : `--no-tablespaces`. Testé avec un user sans PROCESS (GRANT SELECT, LOCK TABLES) : mysqldump affiche `Access denied; you need (at least one of) the PROCESS privilege(s) for this operation' when trying to dump tablespaces`, mais l'INSERT est quand même produit et le code retour vaut 0. Avec `--no-tablespaces`, plus d'erreur. L'article le dit tel quel.

## Tests

- Docker `mysql:8.4.6` (mysqldump Ver 8.4.6), conteneurs supprimés.

## À signaler

- Le `;` final dans `--where="...;"` de la commande d'origine fonctionne (testé sur 8.4.6), laissé tel quel ; la nouvelle commande ne l'a pas.
