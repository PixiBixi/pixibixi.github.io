# Reverse proxy: HAproxy

HAproxy est un reverse proxy optimisé pour les fortes charges créé en
2000 par Willy Tarreau, un contributeur kernel. Ce dernier propose
toutes les fonctionnalités d'un reverse proxy classique :

-   L4/L7 Balancing
-   Terminaison TLS

Il est également utilisé par de nombreux sites populaires :

-   Twitter
-   Github
-   Reddit
-   Airbnb'...

Comme tout package, il est simplement installable via un package manager
tel que *apt* ou autre.

## Terminologie

HAproxy utilise des termes assez classiques. Cependant, nous avons
quelques terminologies spécifiques à HAproxy

-   **bind** : attacher en Anglais, permet de dire sur quelle IP et quel
    port HAproxy va écouter. Par exemple, 192.168.1.1 sur le port 80
-   **frontend** : c'est un bloc de configuration qui permet de définir
    toutes les règles qui s'appliqueront (domaines écoutés,
    limitations, etc). Un frontend peut s'appliquer à un ou plusieurs
    bind.
-   **backend** : c'est un autre bloc de configuration, que l'on place
    derrière un frontend. Si le frontend gère ce qui est publique (à
    '"l'"avant'" du serveur), le backend gère '"l'arrière'". C'est là
    que vous définirez les serveurs web vers lesquels envoyer les
    requêtes, les différents checks appliqués'...
-   **ACL** : une '"Access Control List'" permet de définir des
    conditions dans un bloc, par exemple '"si le domaine contient site1,
    alors faire cela, si la requête est en https, alors faire ceci'". Il
    s'agit ici de la grande spécificité de HAproxy face à ses
    concurrents.

## Configuration Générale

Par défaut, toute la configuration de HAproxy se fait dans un unique
fichier : *haproxy.cfg*. Cependant, lors d'une configuration un peu
poussée, il devient très vite illisible.

Heureusement, il est facile de split la configuration. Dans le fichier
*/etc/default/haproxy*, il vous suffit de faire la modification
suivante:

``` bash
# Change the config file location if needed
#CONFIG="/etc/haproxy/haproxy.cfg"
CONFIG="/etc/haproxy"
```

La variable CONFIG est utilisée pour le paramètre '`-F '$CONFIG'` de
l'unit systemd. Voici ce que nous dit la [documentation
haproxy](https://cbonte.github.io/haproxy-dconv/1.8/management.html) :

      -f <cfgfile|cfgdir> : adds <cfgfile> to the list of configuration files to be
        loaded. If <cfgdir> is a directory, all the files (and only files) it
        contains are added in lexical order (using LC_COLLATE=C) to the list of
        configuration files to be loaded ; only files with ".cfg" extension are
        added, only non hidden files (not prefixed with ".") are added.
        Configuration files are loaded and processed in their declaration order.
        This option may be specified multiple times to load multiple files. See
        also "--". The difference between "--" and "-f" is that one "-f" must be
        placed before each file name, while a single "--" is needed before all file
        names. Both options can be used together, the command line ordering still
        applies. When more than one file is specified, each file must start on a
        section boundary, so the first keyword of each file must be one of
        "global", "defaults", "peers", "listen", "frontend", "backend", and so on.
        A file cannot contain just a server list for example.

Tous les fichiers se terminant par .cfg seront chargés par HAproxy par
ordre alphabétique.

Voici la configuration lancée par défaut via l'unit systemd :

``` bash
ExecStartPre=/usr/sbin/haproxy -f ${CONFIG} -c -q
ExecStart=/usr/sbin/haproxy-systemd-wrapper -f ${CONFIG} -p /run/haproxy.pid $EXTRAOPTS
```

## Configuration HAproxy

Pour rappel, avec une configuration splitted de HAproxy, il va lire les
fichiers par ordre alphabétique, il est donc important d'avoir les
sections global et defaults avant les frontend et backend. Pour être sûr
de l'ordre, vous pouvez prefix vos fichiers avec des numéros.

### Global

Comme son nom l'indique, toute la partie globale concerne les
directives propres au fonctionnement interne de HAproxy. Voici un
exemple simple, que nous allons retrouver dans un grand nombre de
configuration HAproxy

```haproxy
global
    maxconn 50000
    log /dev/log local0
    user haproxy
    group haproxy
    stats socket /run/haproxy/admin.sock user haproxy group haproxy mode 660 level admin
    nbproc 2
    nbthread 4
    cpu-map auto:1/1-4 0-3
    daemon
    ssl-default-bind-ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
```

-   **maxconn** nous permet de limiter le nombre de connexions acceptées
    par HAproxy pour prémunir un manque de mémoire. Attention à ne pas
    faire un sizing trop juste, ce qui nous induirait un drop de
    connexions légitimes.
-   **log** nous permet de spécifier où sont renvoyés les logs. Dans
    notre cas, nous les loggerons dans rsyslog (/dev/log) en tant que
    local0. rsyslog s'occupera de traiter les logs. (par défaut,
    écriture dans /var/log/syslog).
-   **user/group** indique à haproxy qu'il ne faut pas lancer les fork
    en tant que root, mais en tant qu'haproxy dans notre cas.
-   **stats socket** nous permet de définir un socket afin d'y extraire
    les stats ou autre. Il est également possible d'écrire la
    configuration de HAproxy via ce moyen. Attention à donc bien
    restreindre les privilèges.
    -   SleepLessBeastie a écrit [un excellent
        article](https://sleeplessbeastie.eu/2020/01/29/how-to-use-haproxy-stats-socket/)
        sur la définition des privilèges et comment interagir avec
        l'API.
-   **nbproc/nbthread** sont les paramètres permettant à HAproxy de
    scale. Nous pouvons utiliser *nbproc* indépendamment de *nbthread*.
    Chaque process dispose de ses propres stats, tables de
    persistances'... Tous les threads disposent cependant des mêmes
    informations.
    -   Il est largement déconseillé d'utiliser plusieurs processus sur
        HAproxy
    -   Ces options requièrent la présence de la directive *daemon* afin
        de lancer HAproxy en tant que daemon.
-   **cpu-map** nous permet de profiter totalement de nos différents
    cores CPU afin de bind 1 thread/core
-   **daemon** permet de lancer HAproxy en tant que daemon.
-   **ssl-default-bind-ciphers/ssl-default-bind-options** configure tout
    ce qui est relatif au TLS. La première option configure les ciphers
    et la seconde configure les versions autorisées de TLS minimum'...
    -   La fondation Mozilla propose un
        [configurateur](https://ssl-config.mozilla.org/#server=haproxy&version=2.1&config=intermediate&openssl=1.1.1d&guideline=5.6)
        offrant une configuration alliant sécurité & compatibilité des
        équipements. Le profil Intermediate est adapté pour une
        utilisation en production. Modern est trop restrictif.

### Defaults

Votre configuration est évolution, c'est pour cela que la catégorie
'"defaults'" existe. Les paramètres seront appliqués pour la section
frontend mais également pour les backends. Vous pouvez overwrite vos
paramètres pour un frontend/backend spécifique par la suite

``` haproxy
defaults
    mode http
    log global
    
    option httplog
    option dontlognull

    timeout connect 10s
    timeout client 30s
    timeout server 30s

    timeout http-request 5s
    timeout http-keep-alive 125s

    timeout client-fin 30s
    timeout tunnel 1h

    http-reuse safe
```

-   **mode http** indique à HAproxy de fonctionner en tant que balancer
    HTTP et non simplement TCP. Légèrement plus lent que le TCP mais
    nous permet une granularité de configuration bien supérieure
    -   N'oubliez pas que HAproxy est également un load-balancer L4. Il
        est donc possible de balancer tout type de traffic (mysql,
        rabbitmq, mongodb'...)
-   **log global** indique à chaque frontend suivant d'utiliser le
    paramètre log contenu dans la section global. Cela nous évite de
    devoir le redéfinir pour chaque frontend.
-   **option httplog** indique à HAproxy de fournir un syslog un format
    de log plus détaillé. Il existe également l'attribut **tcplog** si
    vous utilisez le load-balancer en tant que balancer L4 (TCP)
-   **option dontlognull** permet de ne pas logger les sessions n'ayant
    donné aucun échange de donnée (requête ou réponse)
    -   Il peut être intéressant de les log en pour avoir des logs bien
        plus détaillés. Peut-être utile en cas de saturation socket (DOS
        ou autre).
    -   Certaines méthodes (tel qu'un monitoring ou autre) peuvent
        également générer certaines de ces requêtes. Il peut être
        intéressant d'activer cette option dans ce cas
-   **timeout connect'...** spécifie les différents timeout (connect,
    server)'...
    -   Il peut être intéressant de spécifier différentes valeurs de
        timeout afin de faciliter le debug
-   **http-reuse safe** est l'option par défaut. Nous nous assurons via
    le paramètre **safe** que le serveur ferme la connexion lorsque
    quand la requête a été envoyée

### Frontend

#### Définition

Les frontends sont utilisés pour définir comment les demandes doivent
être transmises aux backends. Ils se composent des éléments suivants :

-   Adresses IP/Ports
-   ACLs
-   Règles quant à l'utilisation spécifiques de backends

#### Exemple basique

L'exemple suivant est l'exemple le plus simple que nous pouvons faire
sur HAproxy. HAproxy va écouter sur le port 80 et tout renvoyer le
traffic vers le backend *servers*. Nous n'utilisons aucune ACL ici.

``` haproxy
    frontend http-in
        bind *:80
        default_backend servers
```

#### Exemple avancé : ACL

Un exemple avancé est l'utilisation d'une ACL. Il existe beaucoup de
types d'ACL, que ce soir sur l'URI, les paramètres'... Nous allons
voir un exemple simple avec l'utilisation d'une ACL sur le nom de
domaine.

``` haproxy
frontend http
   bind *:80

   # On définit des ACL qui associe un Host: HTTP à un backend
   acl wiki hdr(host) -i wiki.jdelgado.fr
   acl site hdr(host) -i jdelgado.fr
   
   use_backend wiki if wiki
   use_backend site if site
   
   default_backend undefined
```

Nous définissons ici un backend par défaut. Il est possible de ne pas en
définir et HAproxy renverra une erreur 421 de lui même.

### Backend

Les backends sont la force de HAproxy, entièrement modulables, nous
pouvons réellement faire ce que l'on souhaite avec ceux-ci. Prenant cet
exemple simple :

#### Multiples servers

    backend web_servers
        server server1 10.0.1.3:80
        server server2 10.0.1.4:80

Nous avons ici 2 server dénommé respectivement server1 et server2 sur
les IPs 10.0.1.3 et 10.0.1.4 écoutant sur le port 80. Nous n'avons ici
aucun paramètre spécifique sur un éventuel check de disponiblité ou
autre, chacun recevra 50% du traffic

#### Multiples avec persistance

Nous pouvons demander à HAproxy de déposer un cookie sur le client pour
effectuer un équilibrage de charge :

    backend web_servers
        balance roundrobin
        cookie srvid insert indirect nocache
        option httpchk HEAD /
        server server1 10.0.1.3:80 cookie server1
        server server2 10.0.1.4:80 cookie server2

Le client recevra un cookie dénommé srvid qui sera utilisé par haproxy
pour balancer le traffic en round-robin.

#### Actif/Passif

Il est possible d'avoir plusieurs servers sur le même backend mais
n'en utiliser qu'un '"primaire'". Il suffit d'ajouter le mot clef
**backup** au serveur secondaire :

    <code>
    backend web_servers
        server server1 10.0.1.3:80
        server server2 10.0.1.4:80 backup

#### Check HTTP

    backend web_servers
        option httpchk HEAD /
        server server1 10.0.1.3:80
        server server2 10.0.1.4:80

Il s'agit ici du même backend qu'au préalable mais avec une différence
importante, la présence de **httpchk**. Nous avons ici la présence d'un
véritable check L7 au lieu d'un check TCP L4. HAproxy sera ici capable
de distinguer un serveur HTTP down au niveau L7 (tel qu'une erreur
50x). Il est possible d'affiner le check, nous avons ici une simple
requête HEAD sur /

     option httpchk GET / HTTP/1.1'r'nHost:' www.jdelgado.fr'r'nUser-Agent:' haproxy_check
     http-check expect status 200

Ce test est légèrement plus détaillé. Nous spécifions ici un Host à
utilisé (www.jdelgado.fr) ainsi que l'user-agent. Nous spécifions
également que nous attendons un retour 200 (OK).

#### Check spécifiques

HAproxy intègre différents checks pour différents protocoles. Voici les
checks disponibles

-   option mysql-check
-   option pgsql-check
-   option redis-check
-   option smtpchk

## Divers

### Compression GZIP

On peut activer la compression gzip directement au niveau de HAproxy.
Génial si le backend ne le gère pas :

``` bash
compression algo gzip
compression type text/html text/plain text/xml text/css text/javascript application/javascript application/json text/json
```

### Désactiver tous les logs

Par défaut, HAproxy log des évènements. Il ne suffit pas d'enlever
l'option tcplog ou autre.

Dans la section defaults, il faut ajouter ceci :

``` bash
option  dontlog-normal
```

### Backend cache

Si vous utilisez un cache en backend (tel que varnish), il est alors
très intéressant de spécifier le type de balance. **balance uri whole**
indique à haproxy de toujours envoyer le traffic pour une URI spécifique
vers le même backend. Ainsi, nous maximisons le hitrate.

``` bash
backend varnish
    timeout     check 3000
    balance uri whole
    hash-type consistent

    server      varnish01  varnish01.vlan:82  check
    server      varnish02  varnish02.vlan:82  check
```

### HTTP to HTTPS

Il est facile de rediriger l'intégralité du traffic HTTP vers HTTPS
avec HAproxy. Ajoutez simplement la ligne suivante dans votre frontend :

    http-request redirect scheme https unless { ssl_fc }

Cependant, nous avons une 302 (redirection non permanente) via cette
méthode. Pour un usage durable dans le temps, nous préférons à cela une
301 :

    http-request redirect scheme https code 301 unless { ssl_fc }

### Rediriger des URLs spécifiques vers d'autres

Si pour quelconques raison vous voulez retournez des URLs custom selon
des URI précises, la manière la plus facile :

``` bash

    acl     acl           hdr_beg(host) -i monsite.fr
    acl     acl           hdr_beg(host) -i www.monsite.fr
    http-request redirect location %[capture.req.uri,map(/etc/haproxy/redirect.map)] code 301 if { capture.req.uri,map(/etc/haproxy/redirect.map) -i -m found } acl
```

Et le contenu du fichier redirect.map

``` bash
$ cat redirect.map
uri1.html https://monsite.fr/coucou
```

