---
description: Agréger ses flux RSS avec selfoss - installation depuis la release, vhost nginx, configuration MySQL, mise à jour des flux et options utiles
tags:
  - selfoss
  - RSS
variables:
  - name: selfoss_build
    default: 2.20-3f56000
---

# selfoss, son Reader RSS self-hosted

## Introduction

Tout d'abord, un RSS est un fichier texte qui est automatiquement mis à jour via l'ajout de contenu. La technologie semble aujourd'hui désuète, mais pourtant, je l'utilise encore comme beaucoup d'autres, car elle me permet de ne rien louper de l'actualité de mes sites préférés.

Cependant, pour en profiter pleinement, il faut ce que l'on appelle un « Reader RSS », sans quoi, un flux RSS est totalement inexploitable.

Il en existe aujourd'hui une multitude, que ce soit Online (Feedly, Inoreader), self-hosted (FreshRSS, selfoss), ou bien même en local sur son PC (Reeder sur Mac), chacun trouvera chaussure à son pied.

Pour moi, il s'agit de selfoss. Ce petit reader RSS disponible sur [GitHub](https://github.com/fossar/selfoss) a pour mérite d'être libre, léger et facilement configurable...

Non seulement il permet d'exploiter au mieux les RSS via un système de tags... mais on peut également suivre d'autres sources via ses spouts : YouTube, Reddit, GitHub, deviantArt, Tumblr... Les spouts Twitter reposent sur l'API v1 de Twitter, qui n'est plus accessible gratuitement : on oublie.

Voici donc comment l'installer

## Installation

Pour faire fonctionner selfoss, il faut tout d'abord une stack nginx + PHP-FPM correctement configurée (voir [l'article dédié](../web/nginx/installation.md)), avec l'extension `gd`.

La dernière release stable est la 2.19, qui date de 2022 : sa recherche plante sur PHP 8.4, celui de Debian 13 ([#1516](https://github.com/fossar/selfoss/issues/1516)), corrigé seulement dans la branche de développement. Le projet est toujours maintenu, mais la 2.20 n'est pas sortie : on prend un [build de dev](https://cloudsmith.io/~fossar/repos/selfoss-git/packages/), qui demande PHP 8.2 ou plus. Le lien `latest` de Cloudsmith pointe sur un vieux build, on reprend la version la plus récente de la liste.

Côté maintenance, selfoss tient à une seule personne sur son temps libre : des correctifs arrivent encore régulièrement, mais aucune release depuis 2022, et pas de nouvelles fonctionnalités à attendre. Pour un reader plus actif, FreshRSS est l'alternative self-hosted évidente.

<div class="steps" markdown>

1. On télécharge l'archive. Pas de `git clone` : le dépôt ne contient ni les dépendances PHP (`composer install`) ni le client compilé (`npm run build`), on se retrouve avec une page blanche.

    ```bash
    cd /var/www
    wget https://dl.cloudsmith.io/public/fossar/selfoss-git/raw/names/selfoss.zip/versions/<selfoss_build>/selfoss-<selfoss_build>.zip
    unzip selfoss-<selfoss_build>.zip
    mv selfoss rss
    ```

2. Puis l'on crée le server-block sur nginx. Les règles `location` reprennent le `.nginx.conf` livré avec selfoss.

    ```nginx
    server {
        server_name rss.domain.tld;
        listen 80;
        listen [::]:80;

        location /.well-known/acme-challenge/ {
            alias /var/www/challenges/;
            try_files $uri =404;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    upstream backend {
        server unix:/run/php/php8.4-fpm.sock;
    }

    server {
        server_name rss.domain.tld;

        listen 443 ssl;
        listen [::]:443 ssl;
        http2 on;

        include /etc/nginx/conf.d/static/ssl.conf;
        root /var/www/rss/;

        access_log /var/log/nginx/rss.access.log;
        error_log /var/log/nginx/rss.error.log;

        location ~* \.(gif|jpg|png)$ {
            expires 30d;
        }
        location ~ ^/(favicons|thumbnails)/.*$ {
            try_files $uri /data/$uri;
        }
        location ~* ^/(data\/logs|data\/sqlite|config\.ini|\.ht) {
            deny all;
        }
        location / {
            index index.php;
            try_files $uri /public/$uri /index.php$is_args$args;
        }

        location ~ \.php$ {
            fastcgi_pass backend;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }
    ```

3. Une fois ceci fait, on n'oublie pas d'appliquer les bons droits à selfoss (il écrit dans `data/`), puis on recharge nginx

    ```bash
    chown -R www-data:www-data /var/www/rss
    nginx -t && systemctl reload nginx
    ```

4. Enfin, selfoss ne rafraîchit pas les flux tout seul : il faut appeler `cliupdate.php` régulièrement, ici toutes les 15 minutes

    ```bash
    echo '*/15 * * * * www-data php /var/www/rss/cliupdate.php > /dev/null' > /etc/cron.d/selfoss
    ```

</div>

On a désormais un selfoss installé, mais sans rien de configuré, nous allons maintenant voir comment le configurer

## Configuration de selfoss

Toute la configuration de selfoss se fait dans le fichier `config.ini`. Il n'est pas obligatoire : sans lui, selfoss tourne avec ses valeurs par défaut.

L'archive fournit `config-example.ini` (l'ancien `defaults.ini`, qui n'existe plus depuis la 2.19), qu'on copie comme base :

```bash
cd /var/www/rss
cp config-example.ini config.ini
```

On n'y garde que les lignes qu'on veut changer. Je ne vois ici que les paramètres que je juge utiles, toutes les options sont sur la [documentation officielle](https://selfoss.aditu.de/docs/administration/options/).

* db_type
* db_host
* db_database
* db_username
* db_password

Comme leur nom l'indique, tous ces champs concernent la base de données. Par défaut, une base SQLite est utilisée (`db_type=sqlite`), mais je préfère utiliser une base MySQL (`db_type=mysql`). Les tables sont créées automatiquement au premier lancement : l'utilisateur MySQL doit avoir le droit de créer des triggers.

Il existe d'autres champs pour la base de données, mais généralement, il n'est pas utile de les modifier.

* username
* password

Ces 2 champs activent le login sur selfoss. Le hash du mot de passe se génère **obligatoirement** sur la page */password* de son selfoss. Le champ `salt` est déprécié : il ne sert plus pour les mots de passe générés depuis la 2.19, inutile d'y toucher.

* items_perpage

Nombre d'éléments affichés par page. Par défaut de 50, je conseille de le passer à 100 minimum

* auto_mark_as_read

Option très intéressante qui permet de marquer automatiquement un article comme « Lu » une fois qu'on l'a ouvert (désactivée par défaut)

* load_images_on_mobile

Sur mobile, selfoss ne charge pas les images des articles tant qu'on ne les demande pas. À `1`, elles sont chargées automatiquement comme sur desktop (désactivé par défaut)

* base_url

URL de base de selfoss, à renseigner quand un reverse proxy SSL modifie ce que PHP voit de l'URL (le chemin d'installation surtout) : sans elle, les CSS & co sont chargés depuis une mauvaise adresse.
