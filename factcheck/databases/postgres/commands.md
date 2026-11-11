---
article: docs/databases/postgres/commands.md
checked: '2026-11-11'
commit: adf958aaffe8c18d45d085a73957b97c80ea55ab
sources: []
unpinned: 2
---

# docs/databases/postgres/commands.md

## Findings

- L34 ERROR corrigé : la recette `\f '|'` + `\a` est remplacée par `\pset format csv` (psql 12+) et une variante `\copy (SELECT ...) TO '/tmp/output.csv' CSV HEADER`, avec une phrase sur pourquoi l'ancienne ne produit pas du CSV. Preuve : postgres:17.6, table avec `a|b`, `say "hi"` et un retour ligne : ancienne recette -> champs non quotés, ligne cassée et pied `(3 rows)` dans le fichier ; `\pset format csv` et `\copy ... CSV HEADER` -> CSV correctement quoté.
- L17 IMPRECISE corrigé : filtre `WHERE i.schemaname='public' AND i.relname='uploads'`. Preuve : postgres:17.6 avec `public.uploads` et `app.uploads` : ancienne requête -> 2 lignes, nouvelle -> 1.

## En plus

- Ajout d'une phrase avant chacun des blocs (il n'y en avait pas), suppression de la puce « Pour voir les informations détaillées d'une table. » devenue redondante avec l'intro.
- Le pied `(N rows)` de l'ancienne recette, non signalé par le fact-check, est mentionné.

## Modernisation

- `\pset format csv` / `\copy ... CSV HEADER` : appliqué.
- `pg_stat_user_indexes` : non appliqué, inutile une fois le filtre sur schéma + table en place (aucun catalogue système ne s'appelle `public.uploads`).

## Tests

- Docker postgres:17.6 (psql 17.6), conteneur supprimé.

## À signaler

- La requête part de `pg_stat_all_indexes` : une table sans aucun index ne renvoie rien. Non modifié.
