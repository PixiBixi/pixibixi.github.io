---
description: Déployer ruTorrent avec Docker - interface web pour rTorrent en configuration multi-utilisateur
tags:
  - ruTorrent
  - BitTorrent
tested_with:
  - "crazymax/rtorrent-rutorrent 5.3.18-0.16.25"
variables:
  - name: user
    default: jdoe
  - name: n
    default: "1"
  - name: domain
    default: domain.tld
---

# ruTorrent, WebUI rTorrent

## Version Docker

Un conteneur rTorrent + ruTorrent par user, plus un Organizr devant. On part sur l'image [crazymax/rtorrent-rutorrent](https://github.com/crazy-max/docker-rtorrent-rutorrent), maintenue, et sur l'image officielle d'Organizr v2. Les variables `VIRTUAL_*` et `LETSENCRYPT_*` sont lues par un nginx-proxy avec son compagnon ACME, pas par les images :

```yaml
services:
  <user>_rutorrent:
    restart: always
    image: crazymax/rtorrent-rutorrent:5.3.18-0.16.25
    container_name: <user>_rutorrent
    volumes:
      - /home/<user>/incoming:/downloads:rw
      - /root/.apps/<user>/rtorrent/data:/data:rw
      - /root/.apps/<user>/rtorrent/passwd:/passwd:rw
    ports:
      - "4500<n>:4500<n>"
      - "4600<n>:4600<n>/udp"
    environment:
      - PUID=100<n>
      - PGID=100<n>
      - RT_INC_PORT=4500<n>
      - RT_DHT_PORT=4600<n>
      - VIRTUAL_HOST=rutorrent.<user>.<domain>
      - VIRTUAL_PORT=8080
      - LETSENCRYPT_HOST=rutorrent.<user>.<domain>
      - LETSENCRYPT_EMAIL=admin@<domain>
    ulimits:
      nofile:
        soft: 32000
        hard: 40000

  <user>_organizr:
    restart: always
    image: organizr/organizr:latest
    container_name: <user>_organizr
    volumes:
      - /root/.apps/<user>/organizr:/config
    environment:
      - PUID=100<n>
      - PGID=100<n>
      - VIRTUAL_HOST=<user>.<domain>
      - VIRTUAL_PORT=80
      - LETSENCRYPT_HOST=<user>.<domain>
      - LETSENCRYPT_EMAIL=admin@<domain>
```

* `<user>` est le nom de l'user, `<n>` le dernier chiffre de son UID (il sert à dériver ports et IDs sans collision entre users) et `<domain>` le domaine
* Organizr ne publie que `latest`, pas de tag versionné
* `PUID`/`PGID` doivent posséder les dossiers montés, sinon le conteneur peut ne pas démarrer

Sans fichier htpasswd, ruTorrent est ouvert à tout le monde. On crée l'utilisateur de la basic auth avant d'exposer le conteneur :

```bash
docker run --rm httpd:2.4-alpine htpasswd -Bbn <user> 'MotDePasse' >> /root/.apps/<user>/rtorrent/passwd/rutorrent.htpasswd
```
