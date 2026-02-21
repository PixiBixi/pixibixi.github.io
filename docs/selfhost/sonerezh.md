# Sonerezh

![Sonerezh](./_img/sonerezh.webp)

## Introduction

Sonerezh est une application web développée par Guillaume Leduc (Son
[blog](https://www.guillaume-leduc.fr/)) et son ami Itomiix (Son
[twitter](https://twitter.com/itomiix).

Tout comme les célébrissimes Deezer ou Spotify, nous pourrons écouter de
la musique en streaming, faire nos propres playlist... Mais pour cela,
nous devrons auparavant télécharger nos musiques sur nos serveurs.

Il s'agit d'un projet que je suis d'avant sa création via le blog de
Guillaume Leduc. Je l'ai toujours suivi avec attention, car il me
semblait excellent.

Le fait est qu'aujourd'hui, le projet a presque 450 stars sur Github,
et a dépassé de loin les attentes des développeurs

## Pré-requis

Pour installer Sonerezh, il nous faut bien évidemment un **environnement
LAMP** ou équivalent. Je vous invite à aller voir la page sur [le
wiki](../web/nginx/installation.md) que j'ai fais à cet effet.

Nous aurons également besoin du package **libav-tools** pour convertir
les FLAC en MP3

Depuis la version beta 1.1.0 de Sonerezh, celui-ci est compatible avec
PHP7 (Passage à CakePHP 2.8)

## Installation

Avant toute chose, nous devrons préparer la BDD à recevoir notre
Sonerezh :

```mysql
mysql> CREATE DATABASE sonerezh;
mysql> GRANT ALL PRIVILEGES ON sonerezh.* TO sonerezh@localhost IDENTIFIED BY password;
mysql> FLUSH PRIVILEGES;
mysql> exit;
```

N'oubliez pas de remplacer password par son mot de passe

Une fois cela fait, nous pourrons cloner le repo de Sonerezh sur notre
serveur web :

```bash
cd /var/www
sudo git clone https://github.com/Sonerezh/sonerezh.git music
```

Et nous n'oublions pas de lui appliquer les droits et propriétaires
appropriés

```bash
sudo chown -R www-data: music/ && sudo chmod -R 775 music/
```

Une fois cela, nous passons au server-block de notre nginx

```nginx
server {
    listen 80;
    listen [::]:80;
    return 301 https://$host$request_uri;
    server_name music.ndd.tld;
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name music.ndd.tld;
    root /var/www/music/app/webroot;

    access_log /var/log/nginx/music.access.log;
    error_log /var/log/nginx/music.error.log;

    location / {
        try_files $uri $uri/ /index.php?$args;
        expires 14d;
        add_header Cache-Control public;
    }

    # Serve static images from resized folder
    location ~* '/([^'/]+_[0-9]+x[0-9]+'.[a-z]+) {
        try_files /img/resized/$1 /index.php?$args;
        expires 14d;
        add_header Cache-Control public;
    }

    include /etc/nginx/conf.d/file_protect;
    include /etc/nginx/conf.d/cache;
    include /etc/nginx/conf.d/php;
}
```
