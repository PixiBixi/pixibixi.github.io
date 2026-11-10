---
description: Optimiser les performances de WordPress avec des index MySQL et la gestion de l'autoload
tags:
  - WordPress
  - MySQL
---

# Requêtes SQL afin d'optimiser son site

WordPress pose déjà un index sur `post_id` et un autre sur `meta_key` dans `wp_postmeta`, mais pas d'index composite sur les deux. On l'ajoute :

```sql
CREATE INDEX post_id_meta_key ON wp_postmeta (post_id, meta_key(191));
```

Certaines requêtes sont lentes à cause de la manière dont WordPress
construit ses queries. (Par exemple plugin Yoast)

Côté `wp_options`, toutes les options autoloadées sont chargées à chaque page. Depuis WordPress 6.6, une option est autoloadée si `autoload` vaut `yes`, `on`, `auto-on` ou `auto`, pas seulement `yes`. On commence par lister les plus grosses :

```sql
SELECT option_name, LENGTH(option_value) AS size_bytes, autoload
FROM wp_options
WHERE autoload IN ('yes', 'on', 'auto-on', 'auto')
ORDER BY size_bytes DESC
LIMIT 20;
```

On désactive ensuite l'autoload option par option, sur celles qui ne servent pas à chaque requête (un reliquat de plugin désinstallé, un cache, des logs). Pas de `UPDATE` en masse sur un seuil de taille : `active_plugins`, `rewrite_rules` ou les options du thème sont lues à chaque page, les sortir de l'autoload ajoute une requête SQL par option au lieu d'accélérer quoi que ce soit. On fait un dump de `wp_options` avant :

```sql
UPDATE wp_options SET autoload = 'off' WHERE option_name = 'nom_de_l_option';
```

En WP-CLI, `wp option set-autoload nom_de_l_option off` fait la même chose. Le test Site Health de WordPress signale le problème dès que le total autoloadé dépasse 800 Ko.

Beaucoup plus d'informations sont disponibles
[ici](https://kinsta.com/knowledgebase/wp-options-autoloaded-data/)
