# docker-compose.yml 
 
Template prédéfinis pour les applications Docker 
 
## Plex 
 
## Let's Encrypt + Reverse Proxy 
 
## Backend nginx 
 
``` yaml 
  nginx-backend: 
    restart: always 
    image: xataz/nginx-php 
    container_name: nginx-backend 
    volumes: 
      - /root/.apps/USER/nginx-backend/sites-enabled:/nginx/sites-enabled 
      - /root/.apps/USER/nginx-backend/www:/nginx/www 
      - /root/.apps/USER/nginx-backend/log:/nginx/log 
    environment: 
      - VIRTUAL_PORT=8080 
      - VIRTUAL_HOST=domain.tld 
      - LETSENCRYPT_EMAIL=contact@domain.tld 
      - LETSENCRYPT_HOST=domain.tld 
      - UID=1000 
      - GID=1000 
``` 
 
## h5ai 
 
``` yaml 
  USER_h5ai: 
    image: bixidock/h5ai 
    container_name: USER_h5ai 
    restart: always 
    volumes: 
      - "/home/USER/incoming/torrents:/var/www" 
    environment: 
      - VIRTUAL_HOST=share.USER.domain.tld 
      - VIRTUAL_PORT=8080 
      - LETSENCRYPT_EMAIL=admin@domain.tld 
      - LETSENCRYPT_HOST=share.USER.domain.tld 
``` 
 
## ruTorrent 
 
``` yaml 
  USER_rutorrent: 
    restart: always 
    image: xataz/rtorrent-rutorrent:latest-filebot 
    container_name: USER_rutorrent 
    volumes: 
      - /home/USER/incoming:/data:rw 
      - /root/.apps/USER/rtorrent/conf:/config:rw 
    ports: 
      - "45000:45000" 
      - "45000:45000/udp" 
    environment: 
      - UID=1001 
      - GID=1001 
      - WEBROOT=/ 
      - VIRTUAL_PORT=8080 
      - VIRTUAL_HOST=rutorrent.USER.domain.tld 
      - LETSENCRYPT_HOST=rutorrent.USER.domain.tld 
      - LETSENCRYPT_EMAIL=admin@domain.tld 
``` 
 
## Organizr 
 
``` yaml 
  USER_organizr: 
    restart: always 
    image: lsiocommunity/organizr 
    container_name: organizr 
    volumes: 
      - /root/.apps/USER/organizr:/config 
    environment: 
      - VIRTUAL_HOST=USER.domain.tld 
      - VIRTUAL_PORT=80 
      - LETSENCRYPT_HOST=USER.domain.tld 
      - LETSENCRYPT_EMAIL=admin@domain.tld 
``` 
