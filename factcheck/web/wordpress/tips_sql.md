---
article: docs/web/wordpress/tips_sql.md
checked: '2026-11-11'
commit: e786146dd7e4e6a4dc14181152eebfa752334914
sources: []
unpinned: 3
---

# docs/web/wordpress/tips_sql.md

## Findings

- L18 OUTDATED corrigé : le filtre `autoload = 'yes'` remplacé par `autoload IN ('yes', 'on', 'auto-on', 'auto')` dans une requête SELECT de repérage, avec la mention "depuis WordPress 6.6". Preuve : wordpress-develop `src/wp-includes/option.php` @origin/trunk (7.1.x), `wp_autoload_values_to_autoload()` `@since 6.6.0`, `$autoload_values = array( 'yes', 'on', 'auto-on', 'auto' );` (L3351).
- L11 IMPRECISE corrigé en partie : phrase ajoutée avant le bloc, WordPress a déjà `KEY post_id` et `KEY meta_key(191)` séparés sur `wp_postmeta`, l'index ajouté est le composite. Preuve : `src/wp-admin/includes/schema.php` @origin/trunk L150-157. La mention "Par exemple plugin Yoast" reste non vérifiée (pas de source trouvée), laissée telle quelle.
- L18 IMPRECISE corrigé : le `UPDATE` en masse sur `LENGTH(option_value) > 4096` (seuil non sourcé) est remplacé par un repérage SELECT puis un `UPDATE ... WHERE option_name = '...'` option par option, avec l'avertissement sur `active_plugins`/`rewrite_rules` et un dump avant. Valeur `off` au lieu de `no` (valeur 6.6+, `no` reste reconnue comme non autoloadée). Preuve : option.php L627 (`alloptions` ne charge que les valeurs de `wp_autoload_values_to_autoload()`), test SQL ci-dessous.

## En plus

- L21 "Désactive les tables à autoload trop grosses" : ce sont des options (lignes de `wp_options`), pas des tables. Phrase réécrite.

## Modernisation

- Appliqué, avec correction : la commande proposée `wp option autoload set <name> off` n'existe pas, la vraie est `wp option set-autoload <name> off`. Preuve : wp-cli/entity-command `src/Option_Command.php` @origin/HEAD L476-523 (`@subcommand set-autoload`, valeurs on/off/yes/no).
- Non appliqué : `wp option list --autoload=on`, car il ne filtre que `autoload='on' OR autoload='yes'` (Option_Command.php L297) et rate `auto-on`/`auto`, trompeur pour ce cas.
- Appliqué : Site Health, seuil 800000 octets. Preuve : `src/wp-admin/includes/class-wp-site-health.php` @origin/trunk L2709 (`site_status_autoloaded_options_size_limit`, 800000). `wp doctor` (package tiers) non ajouté.

## Tests

- `mysql:8.4.3` en Docker : schéma `wp_options`/`wp_postmeta` de schema.php, `CREATE INDEX post_id_meta_key` OK, le SELECT remonte bien les lignes `yes`/`on`/`auto-on`/`auto` et exclut `off`, l'`UPDATE` ciblé passe la ligne à `off`.

## À signaler

- Le lien Kinsta n'a pas été revérifié.
