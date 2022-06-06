## Version Docker 
 
``` yaml 
  USER_rutorrent: 
    restart: always 
    image: xataz/rtorrent-rutorrent:latest-filebot 
    container_name: USER_rutorrent 
    volumes: 
      - /home/USER/incoming:/data:rw 
      - /root/.apps/USER/rtorrent/conf:/config:rw 
    ports: 
      - "4500$UID:4500$UID" 
      - "4500$UID:4500$UID/udp" 
    environment: 
      - UID=100$UID 
      - GID=100$UID 
      - PORT_RTORRENT=4500$UID 
      - WEBROOT=/ 
      - VIRTUAL_PORT=8080 
      - VIRTUAL_HOST=rutorrent.USER.domain.tld 
      - LETSENCRYPT_HOST=rutorrent.USER.domain.tld 
      - LETSENCRYPT_EMAIL=admin@domain.tld 
    tty: true 
 
  USER_organizr: 
    restart: always 
    image: lsiocommunity/organizr 
    container_name: USER_organizr 
    volumes: 
      - /root/.apps/USER/organizr:/config 
    environment: 
      - VIRTUAL_HOST=USER.domain.tld 
      - VIRTUAL_PORT=80 
      - LETSENCRYPT_HOST=USER.domain.tld 
      - LETSENCRYPT_EMAIL=admin@domain.tld 
``` 
 
-   Modifier **USER** par le nom de l'user, **'$UID** par le dernier 
    chiffre de son UID et **domain.tld** par le domaine 
