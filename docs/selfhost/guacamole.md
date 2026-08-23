---
description: "Apache Guacamole : bastion RDP, SSH et VNC accessible au navigateur, installation par Docker Compose ou compilation Debian, reverse proxy nginx avec websockets, types de connexion et alternatives."
tags:
  - Guacamole
  - Remote Desktop
---

# Apache Guacamole : un bastion RDP, SSH et VNC dans le navigateur

Guacamole est une passerelle d'accès distant sans client : le poste de l'utilisateur n'a besoin que d'un navigateur et c'est le serveur Guacamole qui ouvre la session RDP, SSH ou VNC vers la machine cible. Rien à installer côté client, rien à ouvrir côté cible autre que le port vers le serveur Guacamole.

## Pourquoi l'utiliser comme bastion

C'est l'usage qui justifie le mieux la mise en place et il repose sur une propriété simple : les machines cibles n'ont plus besoin d'être joignables depuis l'extérieur.

- **Un seul point d'entrée exposé**, le serveur Guacamole en HTTPS. Le 3389 et le 22 restent fermés côté Internet.
- **Aucun agent sur les cibles**, contrairement à la plupart des solutions de PAM. Guacamole parle les protocoles natifs, la machine cible ne sait pas qu'elle est derrière un bastion.
- **Enregistrement de session** pour RDP et VNC, sous forme de flux rejouable, ce qui répond à une bonne partie des exigences d'audit.
- **MFA** via TOTP ou Duo et authentification centralisée par LDAP, SAML ou OpenID Connect avec les extensions officielles.
- Les identifiants des cibles sont stockés dans Guacamole, donc l'utilisateur peut se connecter à un serveur **sans jamais connaître son mot de passe**.

Le revers, c'est que le serveur Guacamole devient une cible de premier ordre : il détient les credentials de tout le parc. Il se traite comme un composant critique, sur un réseau à part, avec ses mises à jour suivies.

## Les 3 composants

L'architecture surprend au début parce qu'elle ne ressemble pas à une application web classique :

1. **guacd**, le proxy en C, écoute sur le port 4822 en local. C'est lui qui parle réellement RDP, SSH et VNC.
2. **La webapp Java** (`guacamole.war`), servie par un Tomcat, traduit le protocole Guacamole en HTML5 pour le navigateur.
3. **Le backend d'authentification**, soit un fichier `user-mapping.xml`, soit une base PostgreSQL ou MySQL, qui stocke utilisateurs, connexions et permissions.

Si le Java rebute, c'est le moment de le savoir : Tomcat est incontournable dans une installation classique et seule la version conteneurisée le rend invisible.

## Installation avec Docker Compose

C'est la voie la plus courte et celle qui évite la compilation de guacd et ses dépendances FreeRDP. La base doit être initialisée avec un schéma que l'image sait générer elle-même :

```bash
mkdir -p ~/guacamole/init
docker run --rm guacamole/guacamole:1.6.0 \
  /opt/guacamole/bin/initdb.sh --postgresql > ~/guacamole/init/initdb.sql
```

Ce fichier n'est joué qu'au tout premier démarrage de PostgreSQL, quand le volume est vide. Le générer après coup ne sert à rien, il faut supprimer le volume ou le charger à la main.

```yaml title="~/guacamole/compose.yaml"
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: guacamole_db
      POSTGRES_USER: guacamole
      POSTGRES_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d:ro
    restart: unless-stopped

  guacd:
    image: guacamole/guacd:1.6.0
    restart: unless-stopped

  guacamole:
    image: guacamole/guacamole:1.6.0
    depends_on: [postgres, guacd]
    environment:
      GUACD_HOSTNAME: guacd
      POSTGRESQL_HOSTNAME: postgres
      POSTGRESQL_DATABASE: guacamole_db
      POSTGRESQL_USER: guacamole
      POSTGRESQL_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD}
    # Sur la boucle locale uniquement : le TLS est le travail du reverse proxy.
    ports:
      - "127.0.0.1:8080:8080"
    restart: unless-stopped

volumes:
  pgdata:
```

L'interface répond sur `http://127.0.0.1:8080/guacamole`, avec le compte `guacadmin` / `guacadmin` qu'il faut changer immédiatement, c'est le premier réflexe.

## Reverse proxy nginx

Guacamole utilise des websockets pour le flux d'affichage. Sans les en-têtes `Upgrade` et `Connection`, ça fonctionne quand même en repli sur du tunnel HTTP, mais la session est visiblement plus lente et personne ne comprend pourquoi :

```nginx
location / {
    proxy_pass http://127.0.0.1:8080/guacamole/;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cookie_path /guacamole/ /;   # indispensable pour que la session tienne
    # Une session inactive ne doit pas être coupée par le proxy.
    proxy_read_timeout 3600s;
}
```

Le `proxy_cookie_path` est ce qui manque le plus souvent : sans lui, le cookie de session est posé sur `/guacamole/` alors que l'utilisateur navigue sur `/` et la connexion boucle sur l'écran de login.

## Les types de connexion

Les paramètres qui comptent au moment de créer une connexion dans l'interface.

- **RDP** : renseigner `security` (`nla` dans la majorité des cas) et cocher `ignore-cert` pour les certificats auto-signés, faute de quoi la connexion échoue sans message explicite. Pour un partage de fichiers, activer le lecteur virtuel avec `enable-drive` et un `drive-path`.
- **SSH** : authentification par mot de passe ou par clé privée collée dans la connexion. Le terminal supporte le copier-coller et l'enregistrement typescript des saisies.
- **VNC** : le plus simple, un hôte, un port et un mot de passe. À réserver aux cas où RDP n'est pas disponible, le rendu est moins bon.

## Installation depuis les sources sous Debian

Utile quand on ne veut pas de Docker sur le bastion, ou pour compiler avec des options particulières. Les dépendances varient légèrement entre Debian et Ubuntu, la [documentation officielle](https://guacamole.apache.org/doc/gug/installing-guacamole.html) fait foi.

```bash
sudo apt install build-essential tomcat10 libjpeg62-turbo-dev libjpeg62-dev libpng-dev \
  libtool-bin uuid-dev libossp-uuid-dev libpulse-dev libcairo2-dev libssl-dev \
  libvncserver-dev libvorbis-dev libtelnet-dev libssh2-1-dev libpango1.0-dev \
  freerdp2-dev libwebsockets-dev libwebp-dev
```

Les archives des versions courantes sont sur les miroirs Apache, les anciennes basculent sur `archive.apache.org` où les liens `closer.cgi` ne fonctionnent plus :

```bash
VERSION=1.6.0
wget -O - "https://apache.org/dyn/closer.cgi?action=download&filename=guacamole/${VERSION}/source/guacamole-server-${VERSION}.tar.gz" | tar xzf -
wget -O "guacamole-${VERSION}.war" "https://apache.org/dyn/closer.cgi?action=download&filename=guacamole/${VERSION}/binary/guacamole-${VERSION}.war"
```

La compilation du serveur, avec le lien symbolique FreeRDP sans lequel les connexions RDP échouent au chargement des greffons :

```bash
cd guacamole-server-${VERSION}
./configure --with-systemd-dir=/etc/systemd/system
make -j"$(nproc)"
sudo make install
sudo mkdir -p /usr/lib/x86_64-linux-gnu/freerdp/
sudo ln -s /usr/local/lib/freerdp/*.so /usr/lib/x86_64-linux-gnu/freerdp/
sudo ldconfig
```

Puis le déploiement du client dans Tomcat et la configuration :

```bash
sudo cp "guacamole-${VERSION}.war" /var/lib/tomcat10/webapps/guacamole.war
sudo mkdir -p /etc/guacamole /usr/share/tomcat10/.guacamole
sudo cp guacamole-client-${VERSION}/guacamole/doc/example/{guacamole.properties,user-mapping.xml} /etc/guacamole/
sudo ln -s /etc/guacamole/guacamole.properties /usr/share/tomcat10/.guacamole/guacamole.properties
sudo chown tomcat10 /etc/guacamole/user-mapping.xml
sudo chmod 600 /etc/guacamole/user-mapping.xml
```

```ini title="/etc/guacamole/guacamole.properties"
guacd-hostname: localhost
guacd-port: 4822
# Le chemin vers user-mapping.xml doit être absolu.
auth-provider: net.sourceforge.guacamole.net.basic.BasicFileAuthenticationProvider
basic-user-mapping: /etc/guacamole/user-mapping.xml
```

```bash
sudo systemctl restart tomcat10 guacd
```

`user-mapping.xml` convient pour une poignée de connexions statiques, mais il ne permet ni gestion des droits ni changement de mot de passe par l'utilisateur. Dès qu'il y a plus de 2 personnes, la base PostgreSQL est le bon choix et c'est celui de la version Docker plus haut.

## Quand préférer autre chose

Guacamole excelle sur l'accès graphique par navigateur et sur RDP. Sur un parc uniquement Linux et Kubernetes, avec un besoin fort de RBAC, de certificats courts et d'audit centralisé, [Teleport](https://goteleport.com/) répond mieux au problème et évite d'entreposer des mots de passe. Pour du SSH seul, un simple bastion avec des certificats OpenSSH reste plus léger que les 3 composants de Guacamole.
