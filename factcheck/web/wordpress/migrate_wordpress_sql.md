---
article: docs/web/wordpress/migrate_wordpress_sql.md
checked: '2026-11-10'
commit: 1331cc2b1ff2fc2a84ae1e2498ffdae6c32d77d9
sources: []
unpinned: 4
---

# docs/web/wordpress/migrate_wordpress_sql.md

## Findings

- L13 ERROR (sérialisation) corrigé : les REPLACE sur wp_postmeta et wp_options retirés, remplacés par `wp search-replace ... --skip-columns=guid` (dry-run d'abord) ; en SQL pur on ne garde que siteurl/home, post_content et wp_links. Preuve : test php:8.3.13-cli : `serialize(["home"=>"http://old_url"])` puis str_replace vers https -> `s:14:"https://new_url"`, `unserialize()` -> false ; wp-cli/search-replace-command src/Search_Replace_Command.php@6afd69b6:140 "Search/replace intelligently handles PHP serialized data" ; doc WordPress Migrating : "some themes and widgets store values with the length of your URL marked".
- L13 ERROR (guid) corrigé : toutes les requêtes sur guid supprimées, paragraphe expliquant pourquoi. Preuve : developer.wordpress.org/advanced-administration/upgrade/migrating/ : "Never, ever, change the contents of the GUID column, under any circumstances."
- L13 ERROR (quotes) corrigé : littéraux quotés dans toutes les requêtes. Preuve : test mysql:8.4.3 : requête d'origine -> `ERROR 1064 (42000) ... near '://old_url, https://new_url) WHERE ...'` ; version quotée -> ligne mise à jour (`see https://new_url/x`).
- L28 IMPRECISE rejeté : la phrase dit d'adapter le nom des tables au prefix, ce qui est juste ; wp_user_roles / wp_usermeta concernent un changement de prefix, pas une migration d'URL, hors sujet de l'article. Texte laissé tel quel.

## En plus

- Bloc `www.` dupliqué remplacé par une phrase (repasser les requêtes pour la variante avec ou sans www) et des variables `old_url` / `new_url` en front matter, `<old_url>` / `<new_url>` dans les blocs.
- Mention que `wp search-replace` cible les tables enregistrées par WordPress, donc le bon prefix. Preuve : src/Search_Replace_Command.php@6afd69b6:181-185 (options --all-tables-with-prefix / --all-tables, défaut = tables WordPress).

## Modernisation

- `wp search-replace --skip-columns=guid --dry-run` : appliqué (méthode recommandée). Preuve : wordpress:cli-2.11.0, `wp help search-replace` liste --dry-run, --skip-columns, --precise ; exemple `--skip-columns=guid` à src/Search_Replace_Command.php:267.
- `wp db export` avant migration : appliqué. Preuve : `wp help db export` dans wordpress:cli-2.11.0.

## Tests

- php:8.3.13-cli (unserialize après REPLACE), mysql:8.4.3 (syntaxe non quotée vs quotée), wordpress:cli-2.11.0 (aide des commandes). Aucun search-replace lancé sur une vraie base WordPress. Conteneurs supprimés.

## À signaler

- La description et le titre parlent toujours de "requêtes SQL" alors que la méthode recommandée est désormais WP-CLI : à renommer si l'auteur le souhaite (un renommage de fichier demande une redirection dans properdocs.yml).
- Clone ajouté : ~/Documents/work/src/wp-cli-search-replace-command (blob:none).
