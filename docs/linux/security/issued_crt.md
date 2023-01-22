# Lister tous les certificats émis

Désormais, tous les certificats intégrant le _Certificate Transparency_ peuvent être facilement retrouvable.

Pour cela, il existe un magnifique outil appelé [crt.sh](https://crt.sh), vous proposant une multitude de filtre permettant d'exporter tous les CRT

Sinon, un petit script en ligne de commande :

```sh
#!/usr/bin/env bash
psql=$(which psql)
docker=$(which docker)

if [ -z "$psql" ]; then
	if [ -z "$docker" ]; then
		echo "Ni Docker, ni PostgreSQL... can't do anything for you"
		exit 1
	fi
	psql="docker run -it --rm postgres psql"
fi

if [ -z "${1}" ]; then
	echo "Usage: $0 domain-name"
	exit
fi
Q="select distinct(lower(name_value)) FROM certificate_and_identities cai WHERE plainto_tsquery('$1') @@ identities(cai.CERTIFICATE) AND lower(cai.NAME_VALUE) LIKE ('%.$1')"
$psql -P pager=off -P footer=off -U guest -d certwatch --host crt.sh -c "$Q" | sed -e '$d' -e 's/^ //' -e '1,2d'
```

Petit usage tout simple :

```
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
