# Sauvegarder ses vidéos avec YoutubeDL et sa GUI

![](/youtubedlwebui_main.png){.align-center}

youtube-dl est un outil formidable permettant de télécharger ses vidéos
en ligne de commande à partir d'une foule de providers (Youtube, Arte,
SoundCloud'...). ([Liste
complète](https://rg3.github.io/youtube-dl/supportedsites.html)).

Dans cet article, nous allons voir comment télécharger les vidéos à
d'une interface Web (Youtube-DL-WebUI, ([fork de
PixiBixi](https://github.com/PixiBixi/Youtube-dl-WebUI)))

Cette interface écrite en PHP permet de télécharger des vidéos,
musiques'... Le fork de PixiBixi permet également de les écouter en
ligne.

Pour installer cette WebUI, 2 manières sont disponibles. La manière
traditionnelle avec un nginx installé physiquement sur la machine. (Nous
devrons avoir suivi le tutoriel [Installer son Serveur Web : nGinx,
PHP-FPM et MariaDB](/linux/hosting/lemp/installation)), ou alors via
Docker. Nous allons voir les 2 manières

## Docker

Pour Docker, PixiBixi a également fait un excellent Dockerfile
disponible
[ici](https://hub.docker.com/r/bixidock/youtubedl-webui/~/dockerfile/)

## Physique

Etant donné que l'on a déjà suivi le tutoriel de configuration de
nginx, la seule opération à faire est le déploiement du sites-enabled (+
Installation et configuration du youtube-dl-webui évidemment).

On commence par clone le repository :

``` bash
$ cd /var/www
$ git clone https://github.com/PixiBixi/Youtube-dl-WebUI youtube
```

Et on lui applique les bons droits

``` bash
$ chown -R www-data:www-data youtube
```

(Le mot de passe par défaut est root, pour le changer, il suffit de
faire un sha256 de votre passphrase et modifier config.php)

Et le fichier nginx pour activer le site :

``` nginx
server {
    listen 80;
    listen [::]:80;

    server_name youtube.x.eu;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name youtube.x.eu;

    error_log /var/log/nginx/youtube.error.log;
    access_log /var/log/nginx/youtube.access.log;

    ssl_certificate /etc/letsencrypt/live/youtube.x.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/youtube.x.eu/privkey.pem;

    include /etc/nginx/conf.d/ssl.conf;
    include /etc/nginx/conf.d/letsencrypt.conf;
    include /etc/nginx/conf.d/cache.conf;
    include /etc/nginx/conf.d/php.conf;

    root /var/www/youtube/;

    autoindex on;
    index index.php;
}
```
