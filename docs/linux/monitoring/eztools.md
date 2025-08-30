# Les outils eZ Server, des outils simple de supervision

## Préambule

'### **eZ Server Monitor** est une suite d'outil se décomposant en 2
parties : **eZ Server Monitor SH**, qui, comme son nom l'indique,
permet de voir la plupart des éléments intéressants de son système, et
**eZ Server Monitor WEB** qui permet d'avoir une vue globale de son
système via son navigateur web.'
Ceux-ci ont été développés par un jeune français du pseudo de
['@shevabam](https://twitter.com/shevabam) '### [Voici le rendu
:]{.underline}

## Installation eZ Server Monitor SH

Pour l'installer, rien de plus simple, on télécharge la paquet

```bash
wget -O ezservercli.zip http://www.ezservermonitor.com/esm-sh/downloads/version/2.3
```

Ne pas oublier de se rendre sur [le site du
projet](http://www.ezservermonitor.com/esm-sh/downloads) pour vérifier
les mises à jour ainsi que le
[GitHub](https://github.com/shevabam/ezservermonitor-sh)

On extrait le fichier de l'archive

```bash
unzip ezservermonitor-sh_v2.3.zip
```

On le rend exécutable

```bash
chmod +x eZServerMonitor.sh
```

Et enfin, une chose qui n'est pas obligée mais je déplace le fichier
dans un répertoire de mon '$PATH, et je le renomme en quelque chose de
simple comme monitor pour y accéder simplement

```bash
mv eZServerMonitor.sh monitor.sh && move monitor.sh /usr/bin
```

Voici les options disponibles pour eZ Server Monitor SH

------------------------------------------------------------------------

* **-h**, **-u**, **'--help** ou **'--usage** : Affiche le message
    d'aide
* **-v** ou **'--version** : Affiche le numéro de version du script
* **-C** ou **'--clear** : Clear la console
* **-a** ou **'--all** : Affiche toutes les informations
* **-s** ou **'--system** : Affiche des informations système de base
* **-e** ou **'--services** : Vérifie si les services sont ups ou pas
* **-n** ou **'--network** : Affiche les informations sur le réseau
* **-p** ou **'--ping** : Pings différents hosts selon la
    configuration
* **-c** ou **'--cpu** : Information sur le processeur
* **-m** ou **'--memory** : Informations sur la RAM
* **-l** ou **'--load** : Affiche le load et des infos sur les
    processus
* **-t** ou **'--temperatures** : Affiche les températures CPU,
    HDD...
* **-d** ou **'--disk** : Affiche les différents disques

------------------------------------------------------------------------

Il est également possible de configurer le script en début de celui-ci.

## Installation eZ Server Monitor WEB

eZ Server Monitor est une suite extrêmement pratique pour monitorer son
serveur depuis une page Web, où l'on peut y retrouver toutes les
informations essentielles :

![Web server view](/ez_serv.webp)

Dans cette page, nous pouvons y observer différents éléments :

------------------------------------------------------------------------

* **System** où l'on y retrouve nos informations de base (OS,
    Kernel..)
* **Load Average** où l'on peut observer notre occupation globale de
    notre système
* **Network Usage** qui affiche les différentes interfaces, ainsi que
    les données transmit
* **CPU** qui montre les caractéristiques de son CPU
* **Disk Usage** nous indique l'occupation de notre/nos disque(s) dur
* **Memory** qui montre notre RAM totale, utilisée et disponible
* **SWAP** qui fonctionne comme la RAM (Attention, montre 100% si le
    SWAP est désactivé)
* **Last Login** montre les 5 dernières connexion
* **Ping** montre la latence sur différents hosts (Attention, si un
    host répond pas, le module plante)
* **Service Status** montre si différents services sont disponibles ou
    pas

------------------------------------------------------------------------

Pour l'installer, rien de plus simple, il suffit d'avoir son serveur
web avec PHP de configurer. Voilà le block à faire pour son serveur
**nginx** si l'on veut un sous-domaine

```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
    server_name monitor.domain.tld;
}
server {
    listen 443 ssl spdy;
    server_name monitor.domain.tld;

    auth_basic "Monitor Axx";
    auth_basic_user_file "/etc/nginx/passwd/monitor_passwd";

    error_log /var/log/nginx/monitor.error.log;
    access_log /var/log/nginx/monitor.access.log;

    root /var/www/monitor;

    include /etc/nginx/conf.d/php;
    include /etc/nginx/conf.d/cache;
}
```

N'oubliez pas de générer le fichier **monitor_passwd** à l'aide de la
commande *htpasswd* ou encore via des sites internets tels que [HTAccess
Tools](https://hostingcanada.org/htpasswd-generator/)

Et voici le bout de code à ajouter à son block principal si l'on ne
veut pas de **eZ Server Monitor Web** en sous-domaine :

```nginx
        location ^~ /monitor/ {
            include /etc/nginx/conf.d/php;
            include /etc/nginx/conf.d/cache;
            auth_basic "Monitor Axx";
            auth_basic_user_file "/etc/nginx/passwd/monitor_passwd";
            deny all;
        }
```

**eZ Server Monitor Web** est totalement configurable via le fichier
*esm.config.json* se situant à la racine de l'application. Celui-ci
contient divers éléments de configuration

------------------------------------------------------------------------

* **disk** qui permet de montrer la partition *tmpfs* ou pas
* **hosts** qui permet de configurer les différents sites à ping
* **last_login** pour paramétrer combien de login seront affichés sur
    le site
* **services** pour paramétrer différents services à monitorer

------------------------------------------------------------------------
