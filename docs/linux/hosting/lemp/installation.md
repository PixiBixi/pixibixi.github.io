# Installer son Serveur Web : NGINX, PHP-FPM et MariaDB

## Préambule

Nous allons voir comment installer et configurer correctement NGINX,
PHP-FPM et MariaDB. Pour cela, nous allons ajouter des sources afin
d'obtenir des versions plus à jour de ces différents logiciels Pour les
sources de nginx, il faudra remplacer *codename* par sa distribution
(Wheezy, Jessie...)

  **Sites officiels**               **Liens utiles**
  --------------------------------- -------------------------------------------------------------------
  [NGINX](http://nginx.com/)        [Doc NGINX](http://nginx.org/en/docs/)
  [PHP](http://php.net/)            [Manuel PHP](http://php.net/manual/fr/)
  [MariaDB](https://mariadb.org/)   [Documentation MariaDB](https://mariadb.com/kb/en/documentation/)

## Installer et configurer NGINX

Tout d'abord, avant de vouloir installer le serveur web NGINX, il faut
déjà ajouter une source.

```bash
└─# apt-cache policy nginx
nginx:
  Installé : 1.14.2-2+deb10u4
  Candidat : 1.14.2-2+deb10u4
 Table de version :
     1.14.2-2+deb10u4 500
        500 http://deb.debian.org/debian buster/main amd64 Packages
        500 http://security.debian.org/debian-security buster/updates/main amd64 Packages
```

Si l'on utilise les repositories de base de Debian Buster, ceux-ci nous
installent la version **1.14.2** de NGINX. Actuellement, nous en sommes
à la **1.21.2**. C'est pour cela que nous ajoutons des repositories
afin d'obtenir une version à jour (Dans notre cas, les repositories du
site officiel)

Cela nous évite bon nombres de failles, et nous permet également de
profiter de toutes les dernières nouveautés.

Tout d'abord, on commence par ajouter le depot NGINX à Debian

```bash
$ echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] '
http://nginx.org/packages/mainline/debian `lsb_release -cs` nginx" '
    | sudo tee /etc/apt/sources.list.d/nginx.list
```

Il faut également ajouter la **GPG Key** à son Debian, sans quoi il nous
affichera que la source n'est pas certifiée

```bash
$ curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor '
    | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null
```

Afin d'être sûr que nous allons utiliser les repository Debian, on
ajoute un Pinning :

```bash
echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" | sudo tee /etc/apt/preferences.d/99nginx
```

Et enfin, on effectue un `apt-get update` pour mettre à jour nos
packets disponibles.

Si tout marche bien, voici ce que nous devrions obtenir lorsque l'on
fait la commande `apt-cache policy nginx`

```bash
    └─# apt-cache policy nginx
    nginx:
      Installé : (aucun)
      Candidat : 1.21.1-1~buster
```

Si tout se passe comme il faut, on peut lancer l'installation

```bash
└─# apt-get -y install nginx nginx-extras nginx-doc
```

Voici les options de compilations du paquet **nginx**

??? note "NGINX Default Compilation Options"
    ```bash
    --prefix=/etc/nginx
    --sbin-path=/usr/sbin/nginx
    --conf-path=/etc/nginx/nginx.conf
    --error-log-path=/var/log/nginx/error.log
    --http-log-path=/var/log/nginx/access.log
    --pid-path=/var/run/nginx.pid
    --lock-path=/var/run/nginx.lock
    --http-client-body-temp-path=/var/cache/nginx/client_temp
    --http-proxy-temp-path=/var/cache/nginx/proxy_temp
    --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp
    --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp
    --http-scgi-temp-path=/var/cache/nginx/scgi_temp
    --user=nginx
    --group=nginx
    --with-http_ssl_module --with-http_realip_module --with-http_addition_module --with-http_sub_module
    --with-http_dav_module --with-http_flv_module --with-http_mp4_module --with-http_gunzip_module
    --with-http_gzip_static_module --with-http_random_index_module --with-http_secure_link_module --with-http_stub_status_module
    --with-http_auth_request_module
    --with-mail
    --with-mail_ssl_module
    --with-file-aio
    --with-http_v2_module
    --with-ipv6
    ```

Désormais, nginx est quasiment prêt à être utilisé, il nous reste plus
qu'à le configurer.

Voici ma configuration personnel que j'utilise

<!-- markdownlint-disable -->
??? example "File: /etc/nginx/nginx.conf"
    ```nginx
    user www-data;
    worker_processes auto;
    worker_rlimit_nofile 65536;
    #worker_cpu_affinity 00000010 00000100 00001000 00010000;
    pid /run/nginx.pid;

    include /etc/nginx/modules-enabled/*.conf;

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
        ignore_invalid_headers on;

        keepalive_timeout 65;
        types_hash_max_size 2048;

        server_tokens off;
        more_set_headers Server: Jeremy Server;
        more_set_headers Contact: wiki[at]jdelgado[dot]fr;

        # server_names_hash_bucket_size 64;
        # server_name_in_redirect off;

        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        ##
        # SSL Settings
        ##

        ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
        ssl_prefer_server_ciphers on;

        ##
        # Logging Settings
        ##

        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log;

        ##
        # Gzip Settings
        ##

        gzip on;

        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 4;
        # gzip_buffers 16 8k;
        # gzip_http_version 1.1;
        # gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
        gzip_types text/plain text/css application/json application/ld+json application/x-javascript text/xml application/xml application/xml+rss text/javascript application/xml+xhtml application/javascript application/vnd.ms-fontobject font/ttf font/opentype image/svg+xml image/x-icon;

        ##
        # Virtual Host Configs
        ##

        include /etc/nginx/conf.d/*.conf;
        include /etc/nginx/sites-enabled/*;
    }
    ```
<!-- markdownlint-enable -->

Évidemment, ce fichier n'est pas à recopier tel quel, mais il y a tout
de même certains points importants à conserver :

* `user` qui sera l'utilisateur qui exécutera les instances nginx
* `worker_processes` qui définira combien d'instances seront
    exécutées en simultanées (Ce nombre doit correspondre au nombre de
    coeurs `logiques` dont dispose votre CPU). Vous pouvez disposez de
    cette information via la commande *nproc*. La valeur `auto` est
    censée définir le bon nombre de workers automatiquement
* `include` qui permet d'inclure différents éléments de
    configuration à votre `nginx.conf` afin de rendre celui-ci plus
    clair. Nous pouvons voir dans notre exemple que nos sites se
    trouvent dans le répertoire *sites-enabled* et que certains éléments
    de configuration se trouvent dans le répertoire //conf.d/static/ //
* `server_tokens` une valeur très importante, celle-ci doit être
    mise à `off`. Cette valeur évite à nginx de montrer des éléments
    importants tel que son numéro de version. Ces éléments peuvent être
    utilisés pour exploiter des failles sur nginx
* `ignore_invalid_headers` est également une directive assez
    intéréssante. Si des bots tentent de se connecter avec un header
    incorrect, nginx leur retourne une erreur 404.
* `resolver` nous permet de spécifier les DNS qui vont être utilisés
    dans les logs pour résoudre les différents noms de domaines

La directive *more_set_headers* permet de ne pas dévoiler son serveur
web, et n'est disponible que via le package **nginx-extras**

Comme vous pouvez le voir, on inclut également différents fichiers, les
voici :

??? example "File: /etc/nginx/conf.d/filecache.conf"
    ```nginx
    ##
    # File Cache
    ##
    open_file_cache          max=10000 inactive=20s;
    open_file_cache_valid    60s;
    open_file_cache_min_uses 2;
    open_file_cache_errors   on;
    ```

??? example "File: /etc/nginx/conf.d/gzip.conf"
    ```nginx
    ###
    # GZip Settings
    ###
    gzip on;
    gzip_buffers 16 8k;
    gzip_comp_level 9;
    gzip_disable "msie6";
    gzip_min_length 20;
    gzip_proxied any;
    gzip_types text/plain
               text/css
               text/xml
               text/javascript
               application/json
               application/x-javascript
               application/javascript
               application/xml
               application/xml+rss
    gzip_vary on;
    ```

Ce fichier est assez important, il permet d'activer la compression
**gzip**, ce qui signifie concrètement un gain de vitesse sur votre site
internet.

* `gzip` permet d'activer la compression gzip
* `gzip_buffers` permet de spécifier le nombre de buffers qui vont
    être utilisés, ainsi que leur taille
* `gzip_comp_level` spécifie lagressivité de la compression gzip.
    `Attention` plus la compression gzip sera forte (9), plus le CPU
    va être sollicité.
* `gzip_disable` permet de désactiver la compression GZip selon
    l'User-Agent (Par exemple, ici, nous désactivons la compression
    gzip pour `IE4 à IE6`)
* `gzip_min_length` spécifie quelle est la longueur minimale d'un
    élément qui doit être '"gzippé'". Il dépend du header
    *Content-Length*
* `gzip_proxied` spécifie les éléments qui doivent être '"gzippé'"
    lorsque nginx agit comme reverse-proxy
* `gzip_types` est également une autre ligne importante. C'est ici
    que l'on doit spécifié les `MIME-Types` des différents éléments
    qui vont être '"gzippés'"
* `gzip_vary` indique si un ajout va être effectué dans le header si
    le fichier a été '"gzippé'"

<!-- markdownlint-disable -->
??? example "File: /etc/nginx/snippets/ssl.conf"
    ```nginx
    ###
    # SSL Settings
    ###

    # Ciphers for OpenSSL 1.1.1d (Bullseye)
    ssl_ciphers ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DHE-RSA-CHACHA20-POLY1305:DH+AES:RSA+AESGCM:RSA+AES:!aNULL:!MD5:!DSS;

    ssl_prefer_server_ciphers off;
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;

    ssl_prefer_server_ciphers  on;
    ssl_session_cache    shared:SSL:64m; # a 1mb cache can hold about 4000 sessions, so we can hold 40000 sessions
    ssl_session_timeout  12h;
    ssl_session_tickets  off;

    add_header Strict-Transport-Security "max-age=15768000;";
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "no-referrer";

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ```
<!-- markdownlint-enable -->

Le fichier **ssl.conf** est à inclure seulement si l'on souhaite du SSL
sur ses sites web

'### Certaines lignes sont importantes tels que **ssl_ciphers** qui
permet de sélectionner quels ciphers seront utilisés pour coder
l'échange entre son serveur web, et son client. Cette ligne est
extrêmement importante car il y a actuellement de nombreux ciphers
utilisés mais qui sont totalement dépassés. **ssl_protocols** permet lui
également de ne pas passés par des protocoles complètement troués.
Cependant, il faut faire attention avec ces 2 lignes, car en effet,
elles peuvent provoquer des **erreurs de sécurité côté navigateur**,
voir carrément entrainer **un refus du navigateur**. Nous activons
également le protocole **HSTS** (Plus d'informations
[ici](http://www.bortzmeyer.org/6797.html))

Pour avoir une bonne cipher list, et de bons paramètres SSL, je vous
recommande d'aller voir le [Wiki
Mozilla](https://wiki.mozilla.org/Security/Server_Side_TLS)

Je n'ai volontairement pas mis une configuration CSP (Content Security
Protocol) car il s'agit d'un protocole délicat à mettre en place, et
je vous renvoie vers l'[article de préférence](https://content-security-policy.com/)

Voici désormais des snippets utiles pour ses différents blocks nginx :

<!-- markdownlint-disable -->
??? example "File: /etc/nginx/snippets/protect.conf"
    ```nginx
    ###
    # Basic File Protect
    ###

    # Disallow download of hidden files
    location ~* (?:^|/)'. {
        deny all;
    }

    # Disallow download of these extensions
    location ~* (?:'.(?:bak|conf.*|sql|fla|psd|ini|log|sh|inc|swp|dist)|~)$ {
        deny all;
    }
    ```
<!-- markdownlint-enable -->

Ce fichier nous permet d'éviter que des fichiers de configuration ou
autres soient accessible par tout le monde. Il s'agit d'un fichier
générique qui s'adapte au plus grand nombre de services, évidemment, il
se peut que certains fichiers/dossiers ne soient pas protégés, dans ces
cas-là, il faut les ajouter manuellement.

### Snippets

Snippets utiles pour vos vhosts (snippets/letsencrypt.conf)

<!-- markdownlint-disable -->
??? example "File: /etc/nginx/snippets/letsencrypt.conf"
    ```nginx
    location ^~ /.well-known/acme-challenge/ {
        satisfy any;
        allow all;

        access_log /var/log/nginx/certbot.log;

        root /var/www/letsencrypt;
    }
    ```
<!-- markdownlint-enable -->

## Installer et configurer PHP7-FPM

Commande à adapter selon les modules que vous souhaitez. Généralement,
ces derniers sont suffisant pour 99% des installations.

<!-- markdownlint-disable MD013 -->
```bash
apt-get -y install php-common php7.4 php7.4-bz2 php7.4-cli php7.4-common php7.4-curl php7.4-fpm php7.4-gd php7.4-geoip php7.4-gmp php7.4-igbinary php7.4-imagick php7.4-intl php7.4-json php7.4-mbstring php7.4-mcrypt php7.4-memcached php7.4-msgpack php7.4-mysql php7.4-opcache php7.4-readline php7.4-sqlite3 php7.4-xml php7.4-xmlrpc php7.4-zip
```

Nous allons maintenant passer à la configuration de base de **PHP-FPM**,
tout se situe dans le répertoire /etc/php/7.4/fpm/ et ses
sous-répertoires. (7.4 a remplacer par votre numéro de version)

Nous allons éditer le fichier php.ini :

* `expose_php` : Désactivation afin de ne pas exposer la version de
    PH
* `upload_max_filesize` : Modification de la taille maximale des
    fichiers qu'on peut upload avec PHP
* `post_max_size` : Va avec la directive *upload_max_filesize* et
    doit être supérieur à cette dernière
* `max_file_uploads` : Nombre de fichiers qu'on peut upload en
    parallèle. Par défaut à 20, peut suffir dans une majorité des cas

Petit customisation de la. configuration afin d'optimiser les
performances. Il faut pour la plupart des CMS/Framework adapter les
valeurs de l'OPcache. Pour WordPress, voici des valeurs adéquates :

```bash
opcache.memory_consumption = 128M
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=100000
opcache.fast_shutdown=1
```

Symfony fournit ses [propres
recommandations](https://symfony.com/doc/current/performance.html#configure-opcache-for-maximum-performance)
pour la configuration de l'OPcache. La variable
*opcache.max_accelerated_files* peut être facilement calculée :

```bash
└─# find . -name "*.php" |wc -l
5165
```

Pour notre exemple, 10000 fichiers sont largement suffiants. Aucune
astuce existe pour calculer *opcache.memory_consumption*. Il faudra
surveiller votre monitoring.

## Installer et configurer MariaDB

On met à jour les paquets disponibles :

```bash
apt-get update
```

Et enfin, on vérifie que la *Candidate Version* est la bonne :

```bash
apt-cache policy mariadb-server
```

Voilà le résultat attendu :

```bash
$ apt-cache policy mariadb-server
mariadb-server:
  Installé : (aucun)
  Candidat : 1:10.3.29-0+deb10u1
 Table de version :
 *** 1:10.3.29-0+deb10u1 500
        500 http://apt.daevel.fr/debian buster/main amd64 Packages
        100 /var/lib/dpkg/status
```

Si tout se passe comme il faut, on lance l'installation du serveur SQL

```bash
apt-get install mariadb-server
```

Pendant l'installation de **MariaDB-Server**, vous allez obtenir une
fenêtre comme celle-ci :

![MariaDB Password](/mariadb_password.png)

Cette fenêtre est **très importante**, elle va vous permettre de définir
votre **root password** pour gérer vos bases de données, il faut
utiliser un mot de passe relativement puissant pour qu'il ne puisse pas
être découvert ou cracké, sans quoi, tous vos sites sont à nus.

Et on finit par le script made in MariaDB pour sécuriser le tout

```bash
mysql_secure_installation
```
