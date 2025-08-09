# Selfoss, son Reader RSS self-hosted

## Introduction

Tout d'abord, un RSS est un fichier texte qui est automatiquement mis à
jour via l'ajout de contenu. La technologie semble aujourd'hui
désuète, mais pourtant, je l'utilise encore comme beaucoup d'autres,
car elle me permet de ne rien louper de l'actualité de mes sites
préférés.

Cependant, pour en profiter tellement, il faut ce que l'on appelle un
'"Reader RSS'", sans quoi, un flux RSS est totalement inexploitable.

Il en existe aujourd'hui une multitude, que ce soit Online (Feedly,
Google Reader), self-hosted (FreshRSS, SelfOss), ou bien même en local
sur son PC (Reeder sur Mac), chacun trouvera chaussure à son pied.

Pour moi, il s'agit de SelfOss. Ce petit reader RSS disponible sur
[Github](https://github.com/SSilence/selfoss/) à pour mérite d'être
libre, facilement configurable, compatible PHP7...

Non seulement il vous permettra d'exploiter au mieux les RSS via un
système de tags... mais vous pourrez également importer d'autres flux
tels que Twitter, deviantArt, Tumblr...

Voici donc comment l'installer

## Installation

Pour faire fonctionner votre selfoss, il vous faudra tout d'abord une
stack LAMP ou autre correctement configuré (Voir
[ici](http://wiki.domain.tld/doku.php?id=nginxphpsql) pour plus
d'informations.

Une fois ceci fait, nous devons cloner notre repository GitHub

```bash
$ cd /var/www
$ git clone https://github.com/SSilence/selfoss rss
```

Puis l'on créé le server-block sur nginx

```nginx
server {
    server_name rss.domain.tld;
    listen 80;
    listen [::]:80;
    return 301 https://$host$request_uri;

    location /.well-known/acme-challenge/ {
        alias /var/www/challenges/;
        try_files $uri =404;
    }

}

upstream backend {
    server unix:/run/php/php7.0-fpm.sock;
}

server {
    server_name rss.domain.tld;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    include /etc/nginx/conf.d/static/ssl.conf;
    root /var/www/rss/;

    access_log /var/log/nginx/rss.access.log;
    error_log /var/log/nginx/rss.error.log;

    location ~* ' (gif|jpg|png) {
        expires 30d;
    }
    location ~ ^/favicons/.*$ {
        try_files $uri /data/$uri;
    }
    location ~ ^/thumbnails/.*$ {
        try_files $uri /data/$uri;
    }
    location ~* ^/(data'/logs|data'/sqlite|config'.ini|'.ht) {
        deny all;
    }
    location / {
        index index.php index.html index.htm;
        try_files $uri /public/$uri /index.php$is_args$args;
    }

    #include /etc/nginx/conf.d/file_protect;
    include /etc/nginx/conf.d/cache;

    location ~ '.php$ {
        fastcgi_pass backend;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root/$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

Une fois ceci fait, nous n'oublions pas d'appliquer les bons droits à
selfoss, ainsi que de redémarrer nginx

```bash
$ chown -R www-data:www-data rss
$ systemctl restart nginx
```

Vous avez désormais un selfoss installé, mais sans rien de configuré,
nous allons maintenant voir comment le configurer

## Configuration de SelfOss

Toute la configuration de SelfOss se fait dans le fichier config.ini

Par défaut, SelfOss est livré avec le fichier defaults.ini, nous allons
le copier afin de ne pas l'altérer

```bash
cp defaults.ini config.ini
```

Nous allons voir ici seulement les paramètres que je juge utile, pour
plus d'informations, aller sur la [page
officielle](https://selfoss.aditu.de/) de SelfOSS

  * db_type
  * db_host
  * db_database
  * db_username
  * db_password

Comme leur nom l'indique, tous ces champs concernent la base de donnée.
Par défaut, une base de donnée SQLite est utilisée, mais je préfère
utilisée une base de donné MySQL.

Il existe d'autre champs pour la base de donnée, mais généralement, il
n'est pas utile de les modifier.

  * username
  * password
  * salt

Ces 3 champs servent à configurer la sécurité sur SelfOss. Je vous
conseille de modifier la valeur du champ salt afin d'avoir un salt
unique.

Pour générer un password, il faut se rendre sur la page */password* de
votre SelfOss **obligatoirement**

  * items_perpage

Nombre d'élément automatiquement affichés. Par défaut de 50, je
conseille de le passer à 100 minimum

  * auto_mark_as_read

Option très intéréssante qui vous permet de mettre automatiquement un
article comme '"Lu'" une fois que vous l'avez ouvert (Désactivé par
défaut)

  * load_images_on_mobile

Permet d'activer le LazyLoad des images sur mobile

  * base_url

Option très utile qui force généralement le chargement des CSS & co
depuis votre sous-domaine.
