---
description: Récupérer les vraies IPs des visiteurs dans les logs Apache derrière un reverse proxy nginx (X-Forwarded-For, mod_remoteip), et dans nginx derrière Cloudflare.
tags:
  - nginx
  - Cloudflare
---

# Obtenir les bonnes IP sur Apache derrière un reverse proxy

Sans configuration particulière, on aura 127.0.0.1 dans les logs Apache
s'il est derrière un reverse-proxy. Il est toujours bon d'avoir les
vraies IPs. Voir [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) pour la configuration nginx de base.

Comme vous pouvez le voir, la conservation de l'IP dépend du header `X-Forwarded-For`, soyez sûr que votre reverse-proxy transmet le header

## nginx

Tout d'abord, on dit à nginx de transmettre la bonne IP. Le fichier `/etc/nginx/proxy_params` est fourni par le paquet Debian/Ubuntu, ailleurs on met ces lignes à la main :

```bash
$ cat /etc/nginx/proxy_params
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Et on inclue ce fichier dans le server block (`include proxy_params;` à côté du `proxy_pass`).

`$proxy_add_x_forwarded_for` ajoute l'IP du client à la fin d'un `X-Forwarded-For` déjà présent : un client peut donc envoyer son propre header avec une fausse IP en tête. Ce n'est pas un problème tant que le backend ne lit que la dernière IP posée par un proxy de confiance, ce que fait `mod_remoteip` plus bas.

### Derrière Cloudflare

Si nginx est lui-même derrière Cloudflare, `$remote_addr` est l'IP d'un edge Cloudflare. Le module realip la remplace par celle du header `CF-Connecting-IP`, à condition que la connexion vienne d'une plage Cloudflare. On récupère les plages publiées par Cloudflare et on génère la conf :

```bash
{
  for v in 4 6; do
    curl -fsS "https://www.cloudflare.com/ips-v$v" | awk 'NF {print "set_real_ip_from " $1 ";"}'
  done
  echo "real_ip_header CF-Connecting-IP;"
} > /etc/nginx/conf.d/cloudflare-realip.conf
nginx -t && systemctl reload nginx
```

Les plages bougent de temps en temps : on relance ce script en cron. Une fois `$remote_addr` réécrit, `proxy_params` transmet la vraie IP à Apache sans rien changer d'autre.

## Apache

Côté Apache, plusieurs étapes à faire. Personnelement, je créé un
logformat précis et active le mode remoteip

```bash
$ cat /etc/apache2/conf-available/log-proxified.conf
LogFormat "%a %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\"" proxified

$ cat /etc/apache2/conf-available/remoteip.conf
RemoteIPHeader X-Forwarded-For

# ici les adresse distantes auxquelles on fait confiance pour présenter une valeur RemoteIPHeader
RemoteIPTrustedProxy 127.0.0.1 ::1
```

Et on active tout ça

```bash
a2enconf remoteip
a2enconf log-proxified
a2enmod remoteip
```

On n'oublie pas de spécifier le format du CustomLog à proxified

Pour information, avec `remoteip`, **%a** et **%h** donnent tous les deux la vraie IP (%h affiche l'IP tant que `HostnameLookups` est à `Off`). Pour logger l'IP du proxy, c'est **%{c}a**.

## Voir aussi

* [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) - Configuration nginx complète avec reverse proxy
