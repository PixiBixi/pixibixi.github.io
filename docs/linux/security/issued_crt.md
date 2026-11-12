---
description: Lister tous les certificats SSL/TLS émis pour un domaine via Certificate Transparency (crt.sh)
tags:
  - TLS
  - Certificate
---

# Lister tous les certificats émis

Désormais, tous les certificats intégrant le _Certificate Transparency_ peuvent être facilement retrouvable.

Pour cela, il existe un magnifique outil appelé [crt.sh](https://crt.sh), vous proposant une multitude de filtre permettant d'exporter tous les CRT

Sinon, un petit script en ligne de commande, qui interroge directement la base PostgreSQL publique de crt.sh. Elle est fournie en best-effort : connexion parfois refusée, requêtes longues annulées, on relance plus tard si ça ne répond pas. La requête ne renvoie que les sous-domaines (et les wildcards `*.domaine`), pas le domaine apex lui-même.

```sh
#!/usr/bin/env bash
psql=$(which psql)
docker=$(which docker)

if [ -z "$psql" ]; then
    if [ -z "$docker" ]; then
        echo "Ni Docker, ni PostgreSQL... can't do anything for you"
        exit 1
    fi
    psql="docker run --rm postgres psql"
fi

if [ -z "${1}" ]; then
    echo "Usage: $0 domain-name"
    exit
fi
# $1 is pasted into the SQL query: only accept a domain name
if [[ ! "$1" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "Invalid domain name: $1"
    exit 1
fi
Q="select distinct(lower(name_value)) FROM certificate_and_identities cai WHERE plainto_tsquery('$1') @@ identities(cai.CERTIFICATE) AND lower(cai.NAME_VALUE) LIKE ('%.$1')"
$psql -P pager=off -P footer=off -U guest -d certwatch --host crt.sh -c "$Q" | sed -e '$d' -e 's/^ //' -e '1,2d'
```

Pas de `-it` sur le `docker run` : `-t` alloue un TTY, le script casserait en cron ou derrière un pipe.

Petit usage tout simple :

```bash
➜  ~ ./al mydomain.eu
adguard.mydomain.eu
bitwarden.mydomain.eu
bw.mydomain.eu
cloud.mydomain.eu
domo.mydomain.eu
grafana.mydomain.eu
ha.mydomain.eu
home.mydomain.eu
nas.mydomain.eu
netdata.mydomain.eu
nextcloud.mydomain.eu
nodered.mydomain.eu
onlyoffice.mydomain.eu
pihole.mydomain.eu
portainer.mydomain.eu
prometheus.mydomain.eu
pve.mydomain.eu
rss.mydomain.eu
rutorrent.mydomain.eu
shaarli.mydomain.eu
sync.mydomain.eu
unifi.mydomain.eu
```

Pour un besoin ponctuel, on peut aussi se passer de psql avec l'endpoint JSON de crt.sh (`%25` est le `%` encodé) :

```bash
curl -s 'https://crt.sh/?q=%25.mydomain.eu&output=json' | jq -r '.[].name_value' | tr 'A-Z' 'a-z' | sort -u
```

Pour aller au-delà de Certificate Transparency, [subfinder](subfinder.md) interroge crt.sh avec une cinquantaine d'autres sources passives.
