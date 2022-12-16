# Requêtes SQL pour migrer son WordPress

Quelques requêtes pour migrer son WordPress d'URL :

``` sql
UPDATE wp_posts SET guid = REPLACE(guid, http://old_url, https://new_url) WHERE guid LIKE %http://old_url%;
UPDATE wp_postmeta SET meta_value = REPLACE(meta_value, http://old_url, https://new_url) WHERE meta_value LIKE %http://old_url%;
UPDATE wp_options SET option_value = REPLACE(option_value, http://old_url, https://new_url) WHERE option_value LIKE %http://old_url%;
UPDATE wp_posts SET post_content = replace(post_content, http://old_url, https://new_url) WHERE post_content LIKE %http://old_url%;
UPDATE wp_links SET link_url = replace(link_url, http://old_url, https://new_url) WHERE link_url LIKE %http://old_url%;

UPDATE wp_posts SET guid = REPLACE(guid, http://www.old_url, https://www.new_url) WHERE guid LIKE %http://www.old_url%;
UPDATE wp_postmeta SET meta_value = REPLACE(meta_value, http://www.old_url, https://www.new_url) WHERE meta_value LIKE %http://www.old_url%;
UPDATE wp_options SET option_value = REPLACE(option_value, http://www.old_url, https://www.new_url) WHERE option_value LIKE %http://www.old_url%;
UPDATE wp_posts SET post_content = replace(post_content, http://www.old_url, https://www.new_url) WHERE post_content LIKE %http://www.old_url%;
UPDATE wp_links SET link_url = replace(link_url, http://www.old_url, https://www.new_url) WHERE link_url LIKE %http://www.old_url%;
```

Assez chiantes à trouver, donc je note ici

Penser à modifier le prefix **wp'_** si vous avez modifier le prefix de
votre site
