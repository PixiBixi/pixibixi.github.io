---
description: Installer une stack LEMP sous Debian - nginx, PHP-FPM et MariaDB en version récente. Configuration et optimisation d'un serveur web performant.
tags:
  - nginx
---

# Installer son Serveur Web : nginx, PHP-FPM et MariaDB

On va voir comment installer et configurer correctement nginx, PHP-FPM et MariaDB sur Debian, en ajoutant le dépôt officiel nginx pour obtenir une version à jour. Les exemples sont donnés pour Debian 13 (trixie).

| **Sites officiels**              | **Liens utiles**                                                   |
| -------------------------------- | ------------------------------------------------------------------ |
| [nginx](https://nginx.org/)      | [Doc nginx](https://nginx.org/en/docs/)                            |
| [PHP](https://www.php.net/)      | [Manuel PHP](https://www.php.net/manual/fr/)                       |
| [MariaDB](https://mariadb.org/)  | [Documentation MariaDB](https://mariadb.com/kb/en/documentation/)  |

## Installer et configurer nginx

Debian trixie fournit nginx **1.26**. Le dépôt officiel nginx.org en est à la **1.30** en stable et à la **1.31** en mainline, c'est pour ça qu'on ajoute ce dépôt pour obtenir une version à jour.

On commence par installer les prérequis :

```bash
sudo apt install curl gnupg2 ca-certificates lsb-release debian-archive-keyring
```

Il faut ensuite ajouter la **clé GPG** de nginx, sans quoi apt refusera le dépôt car il ne pourra pas vérifier les paquets :

```bash
curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null
```

On ajoute le dépôt stable. Pour la mainline, on remplace `packages/debian` par `packages/mainline/debian` :

```bash
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
https://nginx.org/packages/debian `lsb_release -cs` nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list
```

Afin d'être sûr qu'apt préfère les paquets nginx.org à ceux de Debian, on ajoute un pinning :

```bash
echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
    | sudo tee /etc/apt/preferences.d/99nginx
```

Et enfin, on effectue un `apt update` pour mettre à jour nos paquets disponibles. Si tout marche bien, le candidat vient de nginx.org et finit par `~trixie` :

```console
$ apt-cache policy nginx
nginx:
  Installé : (aucun)
  Candidat : 1.30.6-1~trixie
```

Si tout se passe comme il faut, on lance l'installation :

```bash
sudo apt install nginx
```

Le dépôt nginx.org ne fournit que `nginx` et des modules dynamiques `nginx-module-*` (acme, geoip, image-filter, njs, otel, perl, xslt). Les paquets `nginx-extras` et `nginx-doc` sont des paquets Debian : ils ne sont pas dans ce dépôt et entrent en conflit avec le nginx de nginx.org.

Les options de compilation du paquet s'affichent avec `nginx -V`. Elles changent d'une version à l'autre, on les lit donc sur sa machine plutôt que dans un article :

```bash
nginx -V 2>&1 | tr ' ' '\n' | grep -- '--with'
```

IPv6 est supporté nativement, l'ancienne option `--with-ipv6` est dépréciée et ignorée. Voir [Configurer nginx pour utiliser IPv6](ipv6_nginx.md) pour la configuration détaillée.

Désormais, nginx est quasiment prêt à être utilisé, il reste à le configurer.

Voici une configuration personnelle :

```nginx title="/etc/nginx/nginx.conf"
user www-data;
worker_processes auto;
worker_rlimit_nofile 65536;
#worker_cpu_affinity 00000010 00000100 00001000 00010000;
pid /run/nginx.pid;

events {
    worker_connections 16384;
    # multi_accept on;
}

http {

    ##
    # Basic Settings
    ##

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    resolver 127.0.0.1 1.1.1.1;

    keepalive_timeout 65;
    types_hash_max_size 2048;

    server_tokens off;
    # Needs the headers-more module, see below
    # more_set_headers "Server: Jeremy Server";

    # server_names_hash_bucket_size 64;
    # server_name_in_redirect off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # SSL Settings
    ##

    ssl_protocols TLSv1.2 TLSv1.3;

    ##
    # Logging Settings
    ##

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    ##
    # Virtual Host Configs
    ##

    include /etc/nginx/conf.d/*.conf;
}
```

Évidemment, ce fichier n'est pas à recopier tel quel, mais il y a tout de même certains points importants à conserver :

* `user` qui sera l'utilisateur qui exécutera les workers nginx. Le paquet nginx.org utilise `nginx` par défaut, on passe ici à `www-data` car c'est le propriétaire du socket PHP-FPM sous Debian.
* `worker_processes` qui définira combien de workers seront exécutés en simultané (ce nombre doit correspondre au nombre de coeurs `logiques` du CPU). La commande *nproc* donne cette info. La valeur `auto` définit le bon nombre de workers automatiquement
* `include` qui permet d'inclure différents éléments de configuration à `nginx.conf` pour le rendre plus clair. Avec le paquet nginx.org, tout passe par `conf.d/` : pas de `sites-enabled` ni de `modules-enabled`, qui sont des conventions du paquet Debian. Les modules dynamiques se chargent avec `load_module` en tête de fichier.
* `server_tokens` une valeur très importante, celle-ci doit être mise à `off`. Cette valeur évite à nginx de montrer des éléments importants tel que son numéro de version. Ces éléments peuvent être utilisés pour exploiter des failles sur nginx. Voir [Être encore plus safe en customisant son header Server nginx](custom_server_header.md) pour plus de détails.
* `ssl_protocols` limite les versions TLS acceptées. TLS 1.0 et 1.1 sont interdits depuis la RFC 8996. `TLSv1.2 TLSv1.3` est de toute façon la valeur par défaut depuis nginx 1.27.3, on l'écrit quand même pour que ce soit explicite.
* `resolver` permet de spécifier les DNS utilisés par nginx pour résoudre des noms à l'exécution : un `proxy_pass` avec une variable, l'OCSP stapling... Il ne sert à rien pour les logs.

La directive `ignore_invalid_headers` n'apparaît plus : elle est à `on` par défaut et ne fait qu'ignorer la ligne de header invalide (avec un log au niveau info), la requête continue normalement. Elle ne renvoie aucune erreur au client.

La directive *more_set_headers* permet de ne pas dévoiler son serveur web, mais elle vient du module headers-more, absent du dépôt nginx.org : avec le nginx installé ici, `nginx -t` échoue sur `unknown directive`. 2 solutions s'offrent à nous : on garde le nginx de Debian (1.26) avec le paquet `libnginx-mod-http-headers-more-filter`, ou on compile le module en dynamique pour la version nginx.org. Voir [Être encore plus safe en customisant son header Server nginx](custom_server_header.md).

On inclut également différents fichiers :

```nginx title="/etc/nginx/conf.d/filecache.conf"
##
# File Cache
##
open_file_cache          max=10000 inactive=20s;
open_file_cache_valid    60s;
open_file_cache_min_uses 2;
open_file_cache_errors   on;
```

```nginx title="/etc/nginx/conf.d/gzip.conf"
###
# GZip Settings
###
gzip on;
gzip_buffers 16 8k;
gzip_comp_level 4;
gzip_proxied any;
gzip_types text/plain
           text/css
           text/xml
           text/javascript
           application/json
           application/ld+json
           application/javascript
           application/xml
           application/xml+rss
           application/vnd.ms-fontobject
           font/ttf
           font/opentype
           image/svg+xml
           image/x-icon;
gzip_vary on;
```

Ce fichier est assez important, il permet d'activer la compression **gzip**, ce qui signifie concrètement un gain de vitesse sur son site internet. Les directives gzip ne sont définies qu'ici : les déclarer aussi dans `nginx.conf` fait échouer `nginx -t` sur `directive is duplicate`, puisque `conf.d/` est inclus dans le même bloc `http`.

* `gzip` permet d'activer la compression gzip
* `gzip_buffers` permet de spécifier le nombre de buffers qui vont être utilisés, ainsi que leur taille
* `gzip_comp_level` spécifie l'agressivité de la compression gzip. Plus la valeur est forte (max 9), plus le CPU est sollicité - 4 est un bon compromis.
* `gzip_proxied` spécifie les éléments qui doivent être gzippés lorsque nginx agit comme reverse-proxy
* `gzip_types` est également une autre ligne importante. C'est ici qu'on spécifie les `MIME-Types` des différents éléments qui vont être gzippés. `text/html` est toujours compressé, inutile de l'ajouter
* `gzip_vary` ajoute le header `Vary: Accept-Encoding` pour que les caches intermédiaires gardent les 2 versions de la réponse
* `gzip_min_length` n'est pas défini : il vaut 20 octets par défaut, on le monte si on ne veut pas compresser les toutes petites réponses

```nginx title="/etc/nginx/snippets/ssl.conf"
###
# SSL Settings (Mozilla Intermediate)
###

ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;

ssl_session_cache    shared:SSL:64m; # a 1mb cache can hold about 4000 sessions
ssl_session_timeout  1d;
ssl_session_tickets  off;

add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options SAMEORIGIN;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy "no-referrer";

ssl_certificate /etc/nginx/ssl/server.crt;
ssl_certificate_key /etc/nginx/ssl/server.key;
```

Le fichier **ssl.conf** est à inclure seulement si l'on souhaite du TLS sur ses sites web. Voir [Forcer le SSL sous nginx](nginx_ssl.md) pour les directives de redirection.

Certaines lignes sont importantes tels que **ssl_ciphers** qui permet de sélectionner quels ciphers seront utilisés pour chiffrer l'échange entre son serveur web et son client. Cette ligne est extrêmement importante car il y a actuellement de nombreux ciphers encore utilisés mais totalement dépassés. Elle ne concerne que TLS 1.2 : les ciphers TLS 1.3 sont tous sûrs et gérés par OpenSSL. **ssl_protocols**, défini dans `nginx.conf`, évite de son côté les protocoles complètement troués. Il faut faire attention avec ces 2 lignes, car trop restrictives elles entraînent **un refus du navigateur** pour les clients anciens. La liste de ciphers n'utilise que de l'ECDHE, un `ssl_dhparam` n'est donc plus nécessaire. Nous activons également le **HSTS** (plus d'informations [ici](https://www.bortzmeyer.org/6797.html)), on y ajoute `includeSubDomains` si tous les sous-domaines sont en HTTPS.

Le header `X-XSS-Protection` n'est plus envoyé : les navigateurs ont retiré le filtre XSS qu'il pilotait. L'activer pouvait même introduire des failles.

Pour avoir une bonne cipher list et de bons paramètres TLS, voir le [configurateur Mozilla](https://ssl-config.mozilla.org/#server=nginx&config=intermediate), d'où vient la liste ci-dessus.

La configuration CSP (Content Security Policy) n'est pas couverte ici - c'est un protocole délicat à mettre en place, voir [content-security-policy.com](https://content-security-policy.com/).

Voici désormais des snippets utiles pour ses différents blocks nginx :

```nginx title="/etc/nginx/snippets/protect.conf"
###
# Basic File Protect
###

# Disallow download of hidden files
location ~ /\. {
    deny all;
}

# Disallow download of these extensions
location ~* (?:\.(?:bak|conf.*|sql|fla|psd|ini|log|sh|inc|swp|dist)|~)$ {
    deny all;
}
```

Ce fichier nous permet d'éviter que des fichiers de configuration ou autres soient accessibles par tout le monde. Il s'agit d'un fichier générique qui s'adapte au plus grand nombre de services, évidemment, il se peut que certains fichiers/dossiers ne soient pas protégés, dans ces cas-là, il faut les ajouter manuellement. Le `/.well-known/acme-challenge/` du snippet Let's Encrypt ci-dessous reste accessible : une location `^~` qui matche coupe l'évaluation des regex.

### Snippets

Snippets utiles pour les vhosts (`snippets/letsencrypt.conf`) :

```nginx title="/etc/nginx/snippets/letsencrypt.conf"
location ^~ /.well-known/acme-challenge/ {
    satisfy any;
    allow all;

    access_log /var/log/nginx/certbot.log;

    root /var/www/letsencrypt;
}
```

## Installer et configurer PHP-FPM

Debian trixie fournit PHP **8.4**. Les paquets `php-*` sans numéro de version installent la version par défaut de la distribution. Commande à adapter selon les modules souhaités, généralement suffisant pour 99% des installations. Pour installer une version spécifique de PHP, voir [Installer une version custom de PHP](php_custom_version.md) :

```bash
apt-get -y install php-fpm php-cli php-common php-bz2 php-curl php-gd php-gmp php-igbinary php-imagick php-intl php-mbstring php-memcached php-msgpack php-mysql php-readline php-sqlite3 php-xml php-zip
```

OPcache est installé avec `php8.4-opcache`, tiré par `php-fpm`. Certains modules des vieux tutos n'existent plus : `json` est intégré au cœur depuis PHP 8.0, `mcrypt` a été retiré en 7.2 et `xmlrpc` en 8.0, `geoip` n'est pas packagé dans Debian trixie. Les demander fait échouer tout l'`apt-get`.

La configuration de base de **PHP-FPM** se situe dans `/etc/php/8.4/fpm/` et ses sous-répertoires (adapter 8.4 à la version installée).

Éditer le fichier `php.ini` :

* `expose_php` : Désactivation afin de ne pas exposer la version de PHP
* `upload_max_filesize` : Modification de la taille maximale des fichiers qu'on peut upload avec PHP
* `post_max_size` : Va avec la directive *upload_max_filesize* et doit être supérieur à cette dernière
* `max_file_uploads` : Nombre de fichiers qu'on peut upload en parallèle. Par défaut à 20, peut suffire dans une majorité des cas

Petite customisation de la configuration afin d'optimiser les performances. Il faut pour la plupart des CMS/Framework adapter les valeurs de l'OPcache. Pour WordPress avec beaucoup de plugins, voici des valeurs larges :

```ini
opcache.memory_consumption=128
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=100000
```

`opcache.memory_consumption` s'exprime en mégaoctets. L'ancien `opcache.fast_shutdown=1` des vieux tutos a été supprimé en PHP 7.2, inutile de le garder.

Symfony fournit ses [propres recommandations](https://symfony.com/doc/current/performance.html#configure-opcache-for-maximum-performance) pour la configuration de l'OPcache. La variable *opcache.max_accelerated_files* peut être facilement calculée en comptant les fichiers PHP du projet :

```console
$ find . -name "*.php" | wc -l
5165
```

Pour ce projet, 10000 suffit largement : la valeur doit dépasser le nombre de fichiers PHP. PHP l'arrondit de toute façon au palier supérieur de sa table interne. Aucune astuce n'existe pour calculer *opcache.memory_consumption* - il faut surveiller le monitoring.

## Installer et configurer MariaDB

Debian trixie fournit MariaDB **11.8**, pas besoin de dépôt externe. On met à jour les paquets disponibles :

```bash
apt-get update
```

Et enfin, on vérifie que la *Candidate Version* est la bonne :

```console
$ apt-cache policy mariadb-server
mariadb-server:
  Installé : (aucun)
  Candidat : 1:11.8.6-0+deb13u1
```

Si tout se passe comme il faut, on lance l'installation du serveur SQL :

```bash
apt-get install mariadb-server
```

L'installation ne demande plus de mot de passe root : sous Debian, le compte `root` de MariaDB s'authentifie par `unix_socket`. Seul le root système peut s'y connecter, avec `sudo mariadb`, sans mot de passe. Les applications ne doivent jamais utiliser ce compte, on leur crée un utilisateur dédié par base.

Et on finit par le script made in MariaDB pour sécuriser l'installation (suppression des comptes anonymes et de la base de test) :

```bash
mariadb-secure-installation
```

L'ancien nom `mysql_secure_installation` n'existe plus que via le paquet `mariadb-client-compat`.

## Voir aussi

* [Forcer le SSL sous nginx](nginx_ssl.md) - Configuration SSL/TLS et redirection HTTPS
* [Configurer nginx pour utiliser IPv6](ipv6_nginx.md) - Support IPv6 dans nginx
* [Installer une version custom de PHP](php_custom_version.md) - Utiliser le dépôt Sury pour des versions récentes
