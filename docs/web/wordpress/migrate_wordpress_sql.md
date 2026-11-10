---
description: Migrer WordPress vers une nouvelle URL avec des requêtes SQL - mise à jour des posts, meta et options
tags:
  - WordPress
  - MySQL
variables:
  - name: old_url
    default: http://www.old.example.com
  - name: new_url
    default: https://www.new.example.com
---

# Requêtes SQL pour migrer son WordPress

Quelques requêtes pour migrer son WordPress d'URL. Assez chiantes à trouver, donc je note ici.

Avant toute chose, on fait un dump de la base :

```bash
wp db export avant-migration.sql
```

## Avec WP-CLI (recommandé)

Un `REPLACE` SQL brut sur `wp_options` et `wp_postmeta` casse les données PHP sérialisées : WordPress, les thèmes et les widgets y stockent la longueur de chaque chaîne (`s:14:"http://old_url"`), et une URL qui change de longueur rend la valeur illisible. `wp search-replace` désérialise, remplace et resérialise proprement. On lance d'abord un `--dry-run` pour voir ce qui va bouger :

```bash
wp search-replace '<old_url>' '<new_url>' --skip-columns=guid --dry-run
wp search-replace '<old_url>' '<new_url>' --skip-columns=guid
```

Il travaille sur les tables enregistrées par WordPress, donc avec le bon prefix tout seul.

## En SQL pur

Si WP-CLI n'est pas dispo, on se limite aux colonnes qui ne contiennent pas de données sérialisées :

```sql
UPDATE wp_options SET option_value = '<new_url>' WHERE option_name IN ('siteurl', 'home');
UPDATE wp_posts SET post_content = REPLACE(post_content, '<old_url>', '<new_url>') WHERE post_content LIKE '%<old_url>%';
UPDATE wp_links SET link_url = REPLACE(link_url, '<old_url>', '<new_url>') WHERE link_url LIKE '%<old_url>%';
```

On repasse les mêmes requêtes pour la variante avec ou sans `www.` si besoin.

On ne touche pas à `wp_posts.guid` : c'est un identifiant, pas une URL, et les lecteurs RSS s'en servent pour savoir quels articles ils ont déjà vus. La doc WordPress est claire, "Never, ever, change the contents of the GUID column". Les URLs restantes dans `wp_postmeta` et le reste de `wp_options` passent par `wp search-replace`.

Penser à modifier le prefix `wp_` si vous avez modifier le prefix de
votre site
