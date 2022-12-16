# Obtenir les bonnes IP sur apache derrière un reverse proxy

Sans configuration particulière, on aura 127.0.0.1 dans les logs apache
s'il est derrière un reverse-proxy. Il est toujours bon d'avoir les
vrais IPs

## NGINX

Tout d'abord, on dit à nginx de transmettre la bonne IP

    └─# cat proxy_params
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

Et on inclue ce fichier dans le server block

## Apache

Côté APACHE, plusieurs étapes à faire. Personnelement, je créé un
logformat précis et active le mode remoteip

    └─$ cat log-proxified.conf
    LogFormat "%a %l %u %t '"%r'" %>s %O '"%{Referer}i'" '"%{User-Agent}i'"" proxified

    └─# cat remoteip.conf
    RemoteIPHeader X-Forwarded-For

    # ici les adresse distantes auxquelles on fait confiance pour présenter une valeur RemoteIPHeader
    RemoteIPTrustedProxy 127.0.0.1 ::1

Et on active tout ça

    a2enconf remoteip
    a2enconf log-proxified
    a2enmod remoteip

On n'oublie pas de spécifier le format du CustomLog à proxified

Pour information, %a a la vraie IP dans le cadre de l'utilisation de
*remoteip*, contrairement à %h.
