---
description: Guide complet de HAproxy — configuration, load balancing, ACLs, TLS et exemples pratiques
tags:
  - HAProxy
---

# Reverse proxy: HAproxy

!!! warning "Version HAproxy"
    Les directives et options évoluent entre les versions majeures. Vérifiez toujours la version installée (`haproxy -v`) et consultez la [documentation officielle](https://docs.haproxy.org/3.3/management.html) correspondante. La version actuelle stable est la **3.3**.

HAproxy est un reverse proxy optimisé pour les fortes charges créé en
2000 par Willy Tarreau, un contributeur kernel. Ce dernier propose
toutes les fonctionnalités d'un reverse proxy classique :

* L4/L7 Balancing
* Terminaison TLS

Il est également utilisé par de nombreux sites populaires :

* Twitter
* Github
* Reddit
* Airbnb...

Comme tout package, il est simplement installable via un package manager
tel que *apt* ou autre.

## Terminologie

HAproxy utilise des termes assez classiques, avec quelques terminologies spécifiques :

* **bind** : attacher en Anglais, permet de dire sur quelle IP et quel port HAproxy va écouter. Par exemple, 192.168.1.1 sur le port 80
* **frontend** : un bloc de configuration qui permet de définir toutes les règles qui s'appliqueront (domaines écoutés, limitations, etc). Un frontend peut s'appliquer à un ou plusieurs bind.
* **backend** : un autre bloc de configuration, placé derrière un frontend. Si le frontend gère ce qui est public (l'avant du serveur), le backend gère l'arrière. C'est là qu'on définit les serveurs web vers lesquels envoyer les requêtes, les différents checks appliqués...
* **ACL** : une "Access Control List" permet de définir des conditions dans un bloc, par exemple "si le domaine contient site1, alors faire cela, si la requête est en https, alors faire ceci". Il s'agit ici de la grande spécificité de HAproxy face à ses concurrents.

## Configuration Générale

Par défaut, toute la configuration de HAproxy se fait dans un unique
fichier : *haproxy.cfg*. Cependant, lors d'une configuration un peu
poussée, il devient très vite illisible.

Heureusement, il est facile de split la configuration. Dans le fichier
*/etc/default/haproxy*, il suffit de faire la modification suivante :

```bash
# Change the config file location if needed
#CONFIG="/etc/haproxy/haproxy.cfg"
CONFIG="/etc/haproxy"
```

La variable CONFIG est utilisée pour le paramètre `-F $CONFIG` de
l'unit systemd.
Voici ce que dit la [documentation haproxy](https://docs.haproxy.org/3.3/management.html) :

??? note "HAproxy : Official Documentation"
    ```bash
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
    ```

Tous les fichiers se terminant par .cfg seront chargés par HAproxy par
ordre alphabétique.

Voici la configuration lancée par défaut via l'unit systemd :

```bash
ExecStartPre=/usr/sbin/haproxy -f ${CONFIG} -c -q
ExecStart=/usr/sbin/haproxy-systemd-wrapper -f ${CONFIG} -p /run/haproxy.pid $EXTRAOPTS
```

## Configuration HAproxy

Pour rappel, avec une configuration splittée de HAproxy, il va lire les
fichiers par ordre alphabétique, il est donc important d'avoir les
sections global et defaults avant les frontend et backend. Pour être sûr
de l'ordre, on peut préfixer les fichiers avec des numéros.

### Global

Comme son nom l'indique, toute la partie globale concerne les
directives propres au fonctionnement interne de HAproxy. Voici un
exemple simple qu'on retrouve dans un grand nombre de configurations HAproxy :

??? example "HAproxy: Global section"
    ```haproxy
    global
        maxconn 50000
        log /dev/log local0
        user haproxy
        group haproxy
        stats socket /run/haproxy/admin.sock user haproxy group haproxy mode 660 level admin
        nbthread 4
        cpu-map auto:1-4 0-3
        daemon
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    ```

* `maxconn` permet de limiter le nombre de connexions acceptées
par HAproxy pour prémunir un manque de mémoire. Attention à ne pas
faire un sizing trop juste, ce qui induirait un drop de
connexions légitimes. Voir [le guide de tuning nbthread, maxconn et TLS](performance_tuning.md) et [limite mémoire](memory_limit.md) pour les détails.
* `log` permet de spécifier où sont renvoyés les logs. Dans
ce cas, on les logue dans rsyslog (/dev/log) en tant que
local0. rsyslog s'occupe de traiter les logs. (par défaut,
écriture dans /var/log/syslog).
* `user/group` indique à haproxy qu'il ne faut pas lancer les fork
en tant que root, mais en tant qu'haproxy.
* `stats socket` permet de définir un socket afin d'y extraire les stats ou autre. Il est également possible d'écrire la configuration de HAproxy via ce moyen. Attention à bien restreindre les privilèges.
    <!-- markdownlint-disable-next-line -->
    * SleepLessBeastie a écrit [un excellent article](https://sleeplessbeastie.eu/2020/01/29/how-to-use-haproxy-stats-socket/) sur la définition des privilèges et comment interagir avec l'API. Voir aussi [HAproxy : Utiliser son API](api.md) et [Mettre un node en maintenance](maintenance.md).
* `nbthread` permet à HAproxy de scaler sur plusieurs threads. Utiliser `auto` pour détecter automatiquement le nombre de threads disponibles, ou spécifier un entier.
    <!-- markdownlint-disable-next-line -->
    * `nbproc` (multi-processus) est **déprécié depuis HAProxy 2.5** et **supprimé en 2.9**. Ne plus utiliser cette directive.
* `cpu-map` permet de binder chaque thread sur un core CPU dédié. La syntaxe avec `nbthread` : `cpu-map auto:<thread-range> <cpu-range>`
* `daemon` permet de lancer HAproxy en tant que daemon. Indépendant de `nbthread` — les deux directives n'ont aucune dépendance l'une envers l'autre.
* `ssl-default-bind-ciphers` configure les ciphers **TLS 1.2**. `ssl-default-bind-ciphersuites` configure les ciphers **TLS 1.3** (directive distincte, obligatoire pour couvrir les deux versions). `ssl-default-bind-options` configure les versions autorisées et options associées.
    <!-- markdownlint-disable-next-line -->
    * La fondation Mozilla propose un [configurateur](https://ssl-config.mozilla.org/#server=haproxy&version=3.3&config=intermediate) pour HAProxy 3.x. Le profil Intermediate est adapté pour une utilisation en production.

### Defaults

La configuration est évolutive, c'est pour ça que la catégorie
`defaults` existe. Les paramètres seront appliqués pour la section
frontend mais également pour les backends. On peut overwrite les
paramètres pour un frontend/backend spécifique par la suite.

<!-- markdownlint-disable MD046 -->
??? example "HAproxy: Default section"
    ```haproxy
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
<!-- markdownlint-enable MD046 -->

* `mode http` indique à HAproxy de fonctionner en tant que balancer
HTTP et non simplement TCP. Légèrement plus lent que le TCP mais
permet une granularité de configuration bien supérieure.
  * À noter que HAproxy est également un load-balancer L4. Il
    est donc possible de balancer tout type de traffic (mysql,
    rabbitmq, mongodb...)
* `log global` indique à chaque frontend suivant d'utiliser le
paramètre log contenu dans la section global. Ça évite de
devoir le redéfinir pour chaque frontend.
* `option httplog` indique à HAproxy de fournir à syslog un format
de log plus détaillé. Il existe également l'attribut `tcplog` si
on utilise le load-balancer en tant que balancer L4 (TCP).
* `option dontlognull` permet de ne pas logger les sessions n'ayant
donné aucun échange de donnée (requête ou réponse).
    <!-- markdownlint-disable-next-line -->
    * Il peut être intéressant de les logger pour avoir des logs bien plus détaillés. Peut-être utile en cas de saturation socket (DOS ou autre).
    <!-- markdownlint-disable-next-line -->
    * Certaines méthodes (tel qu'un monitoring ou autre) peuvent également générer certaines de ces requêtes. Il peut être intéressant d'activer cette option dans ce cas.
* `timeout connect...` spécifie les différents timeout (connect,
server)...
    <!-- markdownlint-disable-next-line -->
    * Il peut être intéressant de spécifier différentes valeurs de timeout afin de faciliter le debug.
* `http-reuse safe` est l'option par défaut. On s'assure via le paramètre `safe` que le serveur ferme la connexion lorsque la requête a été envoyée.

### Frontend

#### Définition

Les frontends sont utilisés pour définir comment les demandes doivent
être transmises aux backends. Ils se composent des éléments suivants :

* Adresses IP/Ports
* ACLs
* Règles quant à l'utilisation spécifiques de backends

#### Exemple basique

L'exemple suivant est le plus simple qu'on puisse faire
sur HAproxy. HAproxy va écouter sur le port 80 et tout renvoyer le
traffic vers le backend *servers*. Aucune ACL ici.

??? example "HAproxy : Simple frontend"
    ```vcl
    frontend http-in
        bind *:80
        default_backend servers
    ```

#### Exemple avancé : ACL

Un exemple avancé est l'utilisation d'une ACL. Il existe beaucoup de
types d'ACL, que ce soit sur l'URI, les paramètres... Voici un exemple simple avec l'utilisation d'une ACL sur le nom de domaine.

<!-- markdownlint-disable MD046 MD037 -->
??? example "HAproxy : Simple frontend w/ ACL"
    ```vcl
    frontend http
       bind *:80

       # On définit des ACL qui associe un Host: HTTP à un backend
       acl wiki hdr(host) -i wiki.jdelgado.fr
       acl site hdr(host) -i jdelgado.fr

       use_backend wiki if wiki
       use_backend site if site

       default_backend undefined
    ```
<!-- markdownlint-enable MD046 -->

On définit ici un backend par défaut. Il est possible de ne pas en
définir et HAproxy renverra une erreur 421 de lui même.

#### Terminaison TLS

HAproxy peut terminer le TLS directement sur le `bind`. La méthode recommandée est
le répertoire de certificats : HAproxy charge automatiquement tous les fichiers `.pem`
qu'il contient et sélectionne le bon certificat via SNI. Pour l'optimisation des handshakes TLS en charge, voir [Performance tuning](performance_tuning.md).

Chaque fichier `.pem` doit contenir le certificat (fullchain) **et** la clé privée
concaténés :

```bash
cat /etc/letsencrypt/live/wiki.jdelgado.fr/fullchain.pem \
    /etc/letsencrypt/live/wiki.jdelgado.fr/privkey.pem \
    > /etc/haproxy/certs/wiki.jdelgado.fr.pem
chmod 600 /etc/haproxy/certs/wiki.jdelgado.fr.pem
```

<!-- markdownlint-disable MD046 MD037 -->
??? example "HAproxy : Frontend avec terminaison TLS"
    ```haproxy
    frontend https
        bind *:80
        bind *:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1

        # Redirection HTTP → HTTPS
        http-request redirect scheme https code 301 unless { ssl_fc }

        acl wiki hdr(host) -i wiki.jdelgado.fr
        acl site hdr(host) -i jdelgado.fr

        use_backend wiki if wiki
        use_backend site if site

        default_backend undefined
    ```
<!-- markdownlint-enable MD046 -->

La négociation TLS étant terminée avant l'évaluation des ACLs, `hdr(host)` suffit.
Pas besoin de filtrer sur `ssl_fc_sni`. L'option `alpn h2,http/1.1` active
HTTP/2 via négociation ALPN.

### Backend

Les backends sont la force de HAproxy, entièrement modulables. Voici quelques exemples :

#### Multiples servers

??? example "HAproxy : Multiple backends"
    ```vcl
    backend web_servers
        server server1 10.0.1.3:80
        server server2 10.0.1.4:80
    ```

2 serveurs dénommés respectivement server1 et server2 sur
les IPs 10.0.1.3 et 10.0.1.4 écoutant sur le port 80. Aucun paramètre
spécifique sur un éventuel check de disponibilité — chacun recevra 50% du traffic.

#### Multiples avec persistance

On peut demander à HAproxy de déposer un cookie sur le client pour
effectuer un équilibrage de charge :

??? example "HAproxy : Multiple backends with persistance"
    ```vcl
    backend web_servers
        balance roundrobin
        cookie srvid insert indirect nocache
        option httpchk HEAD /
        server server1 10.0.1.3:80 cookie server1
        server server2 10.0.1.4:80 cookie server2
    ```

Le client recevra un cookie dénommé srvid qui sera utilisé par haproxy
pour balancer le traffic en round-robin.

#### Actif/Passif

Il est possible d'avoir plusieurs servers sur le même backend mais
n'en utiliser qu'un primaire. Il suffit d'ajouter le mot clef
`backup` au serveur secondaire :

??? example "HAproxy : Multiple backends with backup"
    ```vcl
    backend web_servers
        server server1 10.0.1.3:80
        server server2 10.0.1.4:80 backup
    ```

#### Check HTTP

??? example "HAproxy : Multiple backends with HTTP check"
    ```vcl
    backend web_servers
        option httpchk HEAD /
        server server1 10.0.1.3:80
        server server2 10.0.1.4:80
    ```

Il s'agit du même backend qu'au préalable mais avec une différence
importante, la présence de `httpchk`. On a ici un véritable check L7 au lieu d'un check TCP L4. HAproxy est capable
de distinguer un serveur HTTP down au niveau L7 (tel qu'une erreur
50x). Il est possible d'affiner le check, on a ici une simple
requête HEAD sur /.

```vcl
option httpchk GET / HTTP/1.1\r\nHost:\ www.jdelgado.fr\r\nUser-Agent:\ haproxy_check
http-check expect status 200
```

Ce test est légèrement plus détaillé. On spécifie ici un Host à utiliser (`www.jdelgado.fr`) ainsi que l'user-agent, et on attend un retour 200 (OK).

#### Check spécifiques

HAproxy intègre différents checks pour différents protocoles. Voici les checks disponibles :

* option mysql-check
* option pgsql-check
* option redis-check
* option smtpchk

## Divers

### Compression GZIP

On peut activer la compression gzip directement au niveau de HAproxy.
Génial si le backend ne le gère pas :

```vcl
compression algo gzip
compression type text/html text/plain text/xml text/css text/javascript application/javascript application/json text/json
```

### Désactiver tous les logs

Par défaut, HAproxy log des évènements. Il ne suffit pas d'enlever
l'option tcplog ou autre.

Dans la section defaults, il faut ajouter ceci :

```vcl
option dontlog-normal
```

### Backend cache

Si on utilise un cache en backend (tel que varnish), il est alors
très intéressant de spécifier le type de balance. **balance uri whole**
indique à haproxy de toujours envoyer le traffic pour une URI spécifique
vers le même backend, ce qui maximise le hitrate.

??? example "HAproxy : Backend Varnish"
<!-- markdownlint-disable MD046 -->
    ```vcl
    backend varnish
        timeout     check 3000
        balance uri whole
        hash-type consistent

        server      varnish01  varnish01.vlan:82  check
        server      varnish02  varnish02.vlan:82  check
    ```
<!-- markdownlint-enable MD046 -->

### HTTP to HTTPS

Il est facile de rediriger l'intégralité du traffic HTTP vers HTTPS
avec HAproxy. Il suffit d'ajouter la ligne suivante dans le frontend :

```vcl
http-request redirect scheme https unless { ssl_fc }
```

Cependant, on a une 302 (redirection non permanente) via cette
méthode. Pour un usage durable dans le temps, on préfère une 301 :

```vcl
http-request redirect scheme https code 301 unless { ssl_fc }
```

### Rediriger des URLs spécifiques vers d'autres

Si pour quelconque raison on veut retourner des URLs custom selon
des URI précises, la manière la plus facile :

??? example "HAproxy : Using map"
    ```vcl
    acl     acl           hdr_beg(host) -i monsite.fr
    acl     acl           hdr_beg(host) -i www.monsite.fr
    http-request redirect location %[capture.req.uri,map(/etc/haproxy/redirect.map)] code 301 if { capture.req.uri,map(/etc/haproxy/redirect.map) -i -m found } acl
    ```

Et le contenu du fichier redirect.map :

```bash
$ cat redirect.map
uri1.html https://monsite.fr/coucou
```

## Voir aussi

* [HAProxy : tuning nbthread, maxconn et TLS](performance_tuning.md)
* [HAProxy : Utiliser son API](api.md)
* [Conserver l'IP de son visiteur sur un reverse-proxy](keep_real_ip.md)
* [HAProxy : Obtenir les vraies IPs depuis CloudFlare](cloudflare.md)
