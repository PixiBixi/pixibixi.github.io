# Requêtes SQL afin d'optimiser son site

```sql
CREATE INDEX post_id_meta_key ON wp_postmeta (post_id, meta_key(191));
```

Certaines requêtes sont lentes à cause de la manière dont WordPress
construit ses queries. (Par exemple plugin Yoast)

```sql
UPDATE wp_options SET autoload = 'no' WHERE LENGTH(option_value) > 4096 AND autoload = 'yes';
```

Désactive les tables à autoload trop grosses, provoquant un
ralentissement global du WordPress

Beaucoup plus d'informations sont disponibles
[ici](https://kinsta.com/knowledgebase/wp-options-autoloaded-data/)
