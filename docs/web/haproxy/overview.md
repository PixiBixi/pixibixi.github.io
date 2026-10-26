---
description: Guide complet de HAProxy - configuration, load balancing, ACLs, TLS et exemples pratiques
tags:
  - HAProxy
---

# Reverse proxy: HAProxy

!!! warning "Version HAProxy"
    Les directives et options évoluent entre les versions majeures. Vérifiez toujours la version installée (`haproxy -v`) et consultez la [documentation officielle](https://docs.haproxy.org/3.4/management.html) correspondante. La dernière version stable est la **3.4**, la LTS en cours est la **3.2**.

HAProxy est un reverse proxy optimisé pour les fortes charges créé en
2000 par Willy Tarreau, un contributeur kernel. Ce dernier propose
toutes les fonctionnalités d'un reverse proxy classique :

* L4/L7 Balancing
* Terminaison TLS

Il est également utilisé par de nombreux sites populaires :

* Twitter
* GitHub
* Reddit
* Airbnb...

Comme tout package, il est simplement installable via un package manager
tel que *apt* ou autre.

## Terminologie

HAProxy utilise des termes assez classiques, avec quelques terminologies spécifiques :

* **bind** : attacher en Anglais, permet de dire sur quelle IP et quel port HAProxy va écouter. Par exemple, 192.168.1.1 sur le port 80
* **frontend** : un bloc de configuration qui permet de définir toutes les règles qui s'appliqueront (domaines écoutés, limitations, etc). Un frontend peut s'appliquer à un ou plusieurs bind.
* **backend** : un autre bloc de configuration, placé derrière un frontend. Si le frontend gère ce qui est public (l'avant du serveur), le backend gère l'arrière. C'est là qu'on définit les serveurs web vers lesquels envoyer les requêtes, les différents checks appliqués...
* **ACL** : une "Access Control List" permet de définir des conditions dans un bloc, par exemple "si le domaine contient site1, alors faire cela, si la requête est en https, alors faire ceci". Il s'agit ici de la grande spécificité de HAProxy face à ses concurrents.

## Configuration Générale

Par défaut, toute la configuration de HAProxy se fait dans un unique
fichier : *haproxy.cfg*. Cependant, lors d'une configuration un peu
poussée, il devient très vite illisible.

Heureusement, il est facile de split la configuration. Dans le fichier
*/etc/default/haproxy*, il suffit de faire la modification suivante :

```bash
# Change the config file location if needed
#CONFIG="/etc/haproxy/haproxy.cfg"
CONFIG="/etc/haproxy"
```

La variable CONFIG est utilisée pour le paramètre `-f $CONFIG` de l'unit systemd. Voici ce que dit la [documentation haproxy](https://docs.haproxy.org/3.4/management.html) :

```bash title="HAProxy : Official Documentation"
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

Tous les fichiers se terminant par .cfg seront chargés par HAProxy par
ordre alphabétique.

Voici l'unit systemd fournie par HAProxy (`admin/systemd/haproxy.service.in`), en mode master-worker (`-Ws`). Le `haproxy-systemd-wrapper` des vieux tutos n'existe plus depuis la 1.8 :

```ini
Environment="CONFIG=/etc/haproxy/haproxy.cfg" "PIDFILE=/run/haproxy.pid" "CFGDIR=/etc/haproxy/conf.d" "EXTRAOPTS=-S /run/haproxy-master.sock"
ExecStart=/usr/sbin/haproxy -Ws -f $CONFIG -f $CFGDIR -p $PIDFILE $EXTRAOPTS
ExecReload=/usr/sbin/haproxy -Ws -f $CONFIG -f $CFGDIR -c $EXTRAOPTS
ExecReload=/bin/kill -USR2 $MAINPID
```

Avec cette unit, on n'a même pas besoin de toucher à `CONFIG` : il suffit de déposer les fichiers `.cfg` dans `/etc/haproxy/conf.d`. L'unit d'une distribution peut différer (celle de Debian ne passe pas `$CFGDIR`), on vérifie avec `systemctl cat haproxy`.

## Configuration HAProxy

Pour rappel, avec une configuration splittée de HAProxy, il va lire les
fichiers par ordre alphabétique, il est donc important d'avoir les
sections global et defaults avant les frontend et backend. Pour être sûr
de l'ordre, on peut préfixer les fichiers avec des numéros.

### Global

Comme son nom l'indique, toute la partie globale concerne les
directives propres au fonctionnement interne de HAProxy. Voici un
exemple simple qu'on retrouve dans un grand nombre de configurations HAProxy :

```haproxy title="HAProxy: Global section"
global
    maxconn 50000
    log /dev/log local0
    user haproxy
    group haproxy
    stats socket /run/haproxy/admin.sock user haproxy group haproxy mode 660 level admin
    daemon
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
```

* `maxconn` permet de limiter le nombre de connexions acceptées
par HAProxy pour prémunir un manque de mémoire. Attention à ne pas
faire un sizing trop juste, ce qui induirait un drop de
connexions légitimes. Voir [le guide de tuning nbthread, maxconn et TLS](performance_tuning.md) et [limite mémoire](memory_limit.md) pour les détails.
* `log` permet de spécifier où sont renvoyés les logs. Dans
ce cas, on les logue dans rsyslog (/dev/log) en tant que
local0. rsyslog s'occupe de traiter les logs. (par défaut,
écriture dans /var/log/syslog).
* `user/group` indique à haproxy qu'il ne faut pas lancer les fork
en tant que root, mais en tant qu'haproxy.
* `stats socket` permet de définir un socket afin d'y extraire les stats ou autre. Il permet aussi de modifier l'état au runtime (servers, maps, certificats) sans reload, mais n'écrit jamais dans `haproxy.cfg` : un changement non reporté dans la config est perdu au prochain restart. Attention à bien restreindre les privilèges.
    <!-- markdownlint-disable-next-line -->
    * SleepLessBeastie a écrit [un excellent article](https://sleeplessbeastie.eu/2020/01/29/how-to-use-haproxy-stats-socket/) sur la définition des privilèges et comment interagir avec l'API. Voir aussi [HAProxy : exploitation au quotidien](operations.md).
* `daemon` permet de lancer HAProxy en tant que daemon.
* Pas de `nbthread` ici : sans la directive, HAProxy démarre autant de threads que de CPU auxquels le process est bindé, ce qui suffit dans la plupart des cas. `nbthread`, `cpu-map` et `cpu-policy` sont détaillés dans [le guide de tuning](performance_tuning.md).
* `ssl-default-bind-ciphers` configure les ciphers **TLS 1.2**. `ssl-default-bind-ciphersuites` configure les ciphers **TLS 1.3** (directive distincte, obligatoire pour couvrir les deux versions). `ssl-default-bind-options` configure les versions autorisées et options associées.
    <!-- markdownlint-disable-next-line -->
    * La fondation Mozilla propose un [configurateur](https://ssl-config.mozilla.org/#server=haproxy&version=3.4&config=intermediate) pour HAProxy 3.x. Le profil Intermediate est adapté pour une utilisation en production.

### Defaults

La configuration est évolutive, c'est pour ça que la catégorie
`defaults` existe. Les paramètres seront appliqués pour la section
frontend mais également pour les backends. On peut overwrite les
paramètres pour un frontend/backend spécifique par la suite.

```haproxy title="HAProxy: Default section"
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

* `mode http` indique à HAProxy de fonctionner en tant que balancer
HTTP et non simplement TCP. Légèrement plus lent que le TCP mais
permet une granularité de configuration bien supérieure.
  * À noter que HAProxy est également un load-balancer L4. Il
    est donc possible de balancer tout type de traffic (mysql,
    rabbitmq, mongodb...)
* `log global` indique à chaque frontend suivant d'utiliser le
paramètre log contenu dans la section global. Ça évite de
devoir le redéfinir pour chaque frontend.
* `option httplog` indique à HAProxy de fournir à syslog un format
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
* `http-reuse safe` est l'option par défaut. La première requête d'une session part toujours sur sa propre connexion, seules les suivantes peuvent réutiliser une connexion déjà ouverte vers le serveur. Si le serveur ferme une connexion réutilisée, le client peut ainsi rejouer sa requête sans risque.

### Frontend

#### Définition

Les frontends sont utilisés pour définir comment les demandes doivent
être transmises aux backends. Ils se composent des éléments suivants :

* Adresses IP/Ports
* ACLs
* Règles quant à l'utilisation spécifiques de backends

#### Exemple basique

L'exemple suivant est le plus simple qu'on puisse faire
sur HAProxy. HAProxy va écouter sur le port 80 et tout renvoyer le
traffic vers le backend *servers*. Aucune ACL ici.

```vcl title="HAProxy : Simple frontend"
frontend http-in
    bind *:80
    default_backend servers
```

#### Exemple avancé : ACL

Un exemple avancé est l'utilisation d'une ACL. Il existe beaucoup de
types d'ACL, que ce soit sur l'URI, les paramètres... Voici un exemple simple avec l'utilisation d'une ACL sur le nom de domaine.

```vcl title="HAProxy : Simple frontend w/ ACL"
frontend http
   bind *:80

   # On définit des ACL qui associe un Host: HTTP à un backend
   acl wiki hdr(host) -i wiki.jdelgado.fr
   acl site hdr(host) -i jdelgado.fr

   use_backend wiki if wiki
   use_backend site if site

   default_backend undefined
```

On définit ici un backend par défaut. Sans `default_backend`, une requête qui ne matche aucun `use_backend` reste sur le frontend, qui n'a pas de serveur : HAProxy répond une 503.

#### Terminaison TLS

HAProxy peut terminer le TLS directement sur le `bind`. La méthode recommandée est
le répertoire de certificats : HAProxy charge tous les fichiers qu'il contient (sauf les fichiers cachés et les extensions réservées `.key`, `.issuer`, `.ocsp`, `.sctl`) et sélectionne le bon certificat via SNI. Pour l'optimisation des handshakes TLS en charge, voir [Performance tuning](performance_tuning.md).

Chaque fichier `.pem` doit contenir le certificat (fullchain) **et** la clé privée
concaténés :

```bash
cat /etc/letsencrypt/live/wiki.jdelgado.fr/fullchain.pem \
    /etc/letsencrypt/live/wiki.jdelgado.fr/privkey.pem \
    > /etc/haproxy/certs/wiki.jdelgado.fr.pem
chmod 600 /etc/haproxy/certs/wiki.jdelgado.fr.pem
```

```haproxy title="HAProxy : Frontend avec terminaison TLS"
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

La négociation TLS étant terminée avant l'évaluation des ACLs, `hdr(host)` suffit.
Pas besoin de filtrer sur `ssl_fc_sni`. L'option `alpn h2,http/1.1` active
HTTP/2 via négociation ALPN.

### Backend

Les backends sont la force de HAProxy, entièrement modulables. Voici quelques exemples :

#### Multiples servers

```vcl title="HAProxy : Multiple backends"
backend web_servers
    server server1 10.0.1.3:80
    server server2 10.0.1.4:80
```

2 serveurs dénommés respectivement server1 et server2 sur
les IPs 10.0.1.3 et 10.0.1.4 écoutant sur le port 80. Aucun paramètre
spécifique sur un éventuel check de disponibilité - chacun recevra 50% du traffic.

#### Multiples avec persistance

On peut demander à HAProxy de déposer un cookie sur le client pour
effectuer un équilibrage de charge :

```vcl title="HAProxy : Multiple backends with persistance"
backend web_servers
    balance roundrobin
    cookie srvid insert indirect nocache
    option httpchk HEAD /
    server server1 10.0.1.3:80 cookie server1 check
    server server2 10.0.1.4:80 cookie server2 check
```

Le client recevra un cookie dénommé srvid qui sera utilisé par haproxy
pour balancer le traffic en round-robin.

#### Actif/Passif

Il est possible d'avoir plusieurs servers sur le même backend mais
n'en utiliser qu'un primaire. Il suffit d'ajouter le mot clef
`backup` au serveur secondaire :

```vcl title="HAProxy : Multiple backends with backup"
backend web_servers
    server server1 10.0.1.3:80
    server server2 10.0.1.4:80 backup
```

#### Check HTTP

```vcl title="HAProxy : Multiple backends with HTTP check"
backend web_servers
    option httpchk HEAD /
    server server1 10.0.1.3:80 check
    server server2 10.0.1.4:80 check
```

Il s'agit du même backend qu'au préalable mais avec 2 différences importantes : le mot-clé `check` sur chaque server, qui active le health check, et `option httpchk`, qui en fait un check L7 au lieu d'un simple check TCP L4. Sans `check`, `option httpchk` ne fait rien : aucun check ne tourne et un serveur down continue de recevoir du trafic. HAProxy est ainsi capable de distinguer un serveur HTTP down au niveau L7 (tel qu'une erreur 50x). Il est possible d'affiner le check, on a ici une simple requête HEAD sur /.

```vcl
option httpchk
http-check send meth GET uri / ver HTTP/1.1 hdr Host www.jdelgado.fr hdr User-Agent haproxy_check
http-check expect status 200
```

Ce test est légèrement plus détaillé. On spécifie ici un Host à utiliser (`www.jdelgado.fr`) ainsi que l'user-agent et on attend un retour 200 (OK). L'ancienne forme avec les `\r\n` échappés dans `option httpchk` fonctionne encore, mais `http-check send` est plus lisible.

#### Check spécifiques

HAProxy intègre différents checks pour différents protocoles, entre autres :

* option mysql-check
* option pgsql-check
* option redis-check
* option smtpchk
* option ldap-check
* option ssl-hello-chk
* option tcp-check, pour écrire un check TCP sur mesure

## Divers

### Compression GZIP

On peut activer la compression gzip directement au niveau de HAProxy.
Génial si le backend ne le gère pas :

```vcl
compression algo gzip
compression type text/html text/plain text/xml text/css text/javascript application/javascript application/json text/json
```

### Désactiver tous les logs

Par défaut, HAProxy log des évènements. Il ne suffit pas d'enlever l'option tcplog ou autre : c'est la directive `log` qui envoie les logs. On retire `log global` de la section defaults, ou on ajoute `no log` dans le frontend concerné.

`option dontlog-normal` ne coupe pas tout : elle supprime seulement les logs des connexions sans erreur, les erreurs, timeouts, retries et 5xx restent loggés. C'est souvent ce qu'on veut sur un frontend très chargé :

```vcl
option dontlog-normal
```

### Backend cache

Si on utilise un cache en backend (tel que varnish), il est alors
très intéressant de spécifier le type de balance. **balance uri whole**
indique à haproxy de toujours envoyer le traffic pour une URI spécifique
vers le même backend, ce qui maximise le hitrate.

```vcl title="HAProxy : Backend Varnish"
backend varnish
    timeout     check 3000
    balance uri whole
    hash-type consistent

    server      varnish01  varnish01.vlan:82  check
    server      varnish02  varnish02.vlan:82  check
```

### HTTP to HTTPS

Il est facile de rediriger l'intégralité du traffic HTTP vers HTTPS
avec HAProxy. Il suffit d'ajouter la ligne suivante dans le frontend :

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

```vcl title="HAProxy : Using map"
acl     acl           hdr_beg(host) -i monsite.fr
acl     acl           hdr_beg(host) -i www.monsite.fr
http-request redirect location %[path,map_str(/etc/haproxy/redirect.map)] code 301 if { path,map_str(/etc/haproxy/redirect.map) -m found } acl
```

Les clés du map sont comparées au `path`, qui commence par `/` et exclut la query string. Voici le contenu du fichier redirect.map :

```console
$ cat redirect.map
/uri1.html https://monsite.fr/coucou
```

## Voir aussi

* [HAProxy : tuning nbthread, maxconn et TLS](performance_tuning.md)
* [HAProxy : exploitation au quotidien](operations.md)
