# Guacamole : l'outil idéal pour établir des sessions RDP, SSH et VNC

!!! warning Deprecated
    Avec l'arrivée de [GoTeleport](https://goteleport.com/) (Bastion SSH/K8S via RBAC, recording de session...), je trouve l'usage de Guacamole démodé.

## Installation sous Debian

### Explications

[L'application Guacamole](https://guacamole.apache.org/) se compose de 3 parties :

1.  Guacamole server qui écoute sur le port TCP 4722 sur la boucle
    locale
2.  Tomcat server qui met à disposition et interprète les servlets Java
    sur le port TCP 8080
3.  fournis par Guacamole client (le fichier guacamole.war qui peut être
    construit à partir des sources du client ou directement téléchargé)

Si vous être réfractaire au Java, passez votre chemin.

## Prérequis

Il faut posséder une Debian à jour. Comme il n'y a plus de paquets officiels, nous devons donc le compiler à la main.

!!! warning Package Name
    Certains noms de dépendances changent si vous êtes sous Ubuntu ou Debian, veuillez consulter la [documentation](https://guacamole.apache.org/doc/gug/installing-guacamole.html)

Vous devez installer Tomcat 9/10 comme décrit dans cette page.

```bash
$ sudo apt install build-essential tomcat10 libjpeg62-turbo-dev libjpeg62-dev libpng-dev libtool-bin uuid-dev libossp-uuid-dev libpulse-dev libcairo2-dev libssl-dev libvncserver-dev libvorbis-dev libtelnet-dev libssh2-1-dev libpango1.0-dev freerdp2-dev libwebsockets-dev libwebp-dev
```

!!! info Latest version
    Il est possible d'obtenir la dernière dernière version en utilisant le [repository Git](https://github.com/apache/guacamole-server)

```bash
$ wget --content-disposition -O - http://apache.org/dyn/closer.cgi?action=download&filename=guacamole/1.5.2/source/guacamole-client-1.5.2.tar.gz | tar xfvz -
$ wget --content-disposition -O - http://apache.org/dyn/closer.cgi?action=download&filename=guacamole/1.5.2/source/guacamole-server-1.5.2.tar.gz | tar xfvz -
$ wget -O guacamole-1.5.2.war "http://apache.org/dyn/closer.cgi?action=download&filename=guacamole/1.5.2/binary/guacamole-1.5.2.war"
```

## Compilation et installation du serveur

Prévoir un fix concernant les bibliothèques FreeRDP (points 7, 8, 9).

```bash
$ cd guacamole-server*
$ ./configure --with-systemd-dir=/etc/systemd/system
$ make -j$(nproc)
$ sudo make install
$ sudo mkdir /usr/lib/x86_64-linux-gnu/freerdp/
$ sudo ln -s /usr/local/lib/freerdp/*.so /usr/lib/x86_64-linux-gnu/freerdp/
$ sudo ldconfig
```

## Installation du client

```bash
$ sudo cp guacamole-1.5.2.war /var/lib/tomcat10/webapps/guacamole.war
```

Vous pouvez en lieu et place utiliser maven à partir des sources du
client pour compiler le fichier war.

## Installation des fichiers de configuration

Important, les droits de l'utilisateur tomcat10 sur le fichier `user-mapping.xml` sont indispensables.

```bash
$ sudo mkdir {/etc/guacamole,/usr/share/tomcat10/.guacamole}
$ sudo cp guacamole-client-1.5.2/guacamole/doc/example/{guacamole.properties,user-mapping.xml} /etc/guacamole/
$ sudo ln -s /etc/guacamole/guacamole.properties /usr/share/tomcat10/.guacamole/guacamole.properties
$ sudo chown tomcat10 /etc/guacamole/user-mapping.xml
$ sudo chmod 600 /etc/guacamole/user-mapping.xml
```

## Configuration

Le fichier `guacamole.properties` à **éditer ou vérifier avant de redémarrer les services** :

         # Hostname and port of guacamole proxy
         guacd-hostname: localhost
         guacd-port:     4822
         # Auth provider class (authenticates user/pass combination, needed if using the provided login screen)
         # Le chemin vers user-mapping.xml doit être un chein complet et non relatif !
         auth-provider: net.sourceforge.guacamole.net.basic.BasicFileAuthenticationProvider
         basic-user-mapping: /etc/guacamole/user-mapping.xml

Pour le fichier user-mapping.xml, référez-vous à la [documentation
officielle.](http://guac-dev.org/doc/0.9.1/gug/configuring-guacamole.html)

  * [Démarrage]{.underline}

```bash
$ sudo systemctl tomcat10.service restart
$ sudo systemctl guacd.service restart
```

L'url <http://fqdn:8080/guacamole> doit vous permettre d'accéder à
l'application. Toutefois, tout transite en clair sur le réseau et rien
n'est sécurisé.

  * [Reverse proxy avec nginx]{.underline}

Le reverse proxy en question, je vous épargne la partie liée à **TLS qui
est indispensable**.

```nginx
       location / {
                proxy_pass http://localhost:8080/guacamole;
                proxy_buffering off;
                proxy_cookie_path /guacamole/ /; #indispensable pour se connecter
                proxy_http_version  1.1;
                include conf.d/proxy.conf;
        }
```

## Accès et utilisation

Rendez-vous sur la page <https://fqdn/> et insérez le nom d'utilisateur
et votre mot de passe (préférez le hash MD5, ce n'est mieux que rien).
Il est également possible de gérer de façon avancée les utilisateurs
avec mysql ou pgsql, chose que je ne traite pas ici.

![](/guacchose.png){width="200"} ![](/guaclogin.png){width="200"}
