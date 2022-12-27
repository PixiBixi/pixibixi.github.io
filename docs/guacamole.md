# Guacamole : l'outil idéal pour établir des sessions RDP, SSH et VNC

## Installation sous Debian 8.0 Jessie

### Explications

[L'application Guacamole](http://guac-dev.org/) se compose de 3 parties
:

1.  Guacamole server qui écoute sur le port TCP 4722 sur la boucle
    locale
2.  Tomcat server qui met à disposition et interprète les servlets Java
    sur le port TCP 8080
3.  fournis par Guacamole client (le fichier guacamole.war qui peut être
    construit à partir des sources du client ou directement téléchargé)

Si vous être réfractaire au Java, passez votre chemin.

## Prérequis

Il faut posséder une Debian Jessie à jour ; les paquets binaires du
dépôt Debian n'étant plus maintenu depuis près de 2 ans. Vous devez
installer tomcat8 comme décrit dans cette page (ou tomcat7) mais surtout
pas tomcat6, cela risque de poser problème.

```bash
$ sudo apt install build-essential tomcat8 libpng12-dev libossp-uuid-dev libpulse-dev libcairo2-dev libssl-dev libvncserver-dev libvorbis-dev libtelnet-dev libssh2-1-dev libpango1.0-dev libfreerdp-dev
```

```bash
$ wget --content-disposition -O - http://apache.org/dyn/closer.cgi?action=download&filename=guacamole/1.1.0/source/guacamole-client-1.1.0.tar.gz | tar xfvz -
$ wget --content-disposition -O - http://apache.org/dyn/closer.cgi?action=download&filename=guacamole/1.1.0/source/guacamole-server-1.1.0.tar.gz | tar xfvz -
$ wget --content-disposition http://sourceforge.net/projects/guacamole/files/current/binary/guacamole-1.1.0.war/download
```

## Compilation et installation du serveur

Prévoir un fix concernant les bibliothèques freerdp (points 7, 8, 9).

```bash
$ cd guacamole-server*
$ ./configure --with-init-dir=/etc/init.d
$ make
$ sudo make install
$ sudo mkdir /usr/lib/x86_64-linux-gnu/freerdp/
$ sudo ln -s /usr/local/lib/freerdp/*.so /usr/lib/x86_64-linux-gnu/freerdp/
$ sudo ldconfig
```

## Installation du client

```bash
$ sudo cp guacamole-1.1.0.war /var/lib/tomcat8/webapps/guacamole.war
```

Vous pouvez en lieu et place utiliser maven à partir des sources du
client pour compiler le fichier war.

## Installation des fichiers de configuration

Important, les droits de l'utilisateur tomcat8 sur le fichier `user-mapping.xml` sont indispensables.

```bash
$ sudo mkdir {/etc/guacamole,/usr/share/tomcat8/.guacamole}
$ sudo cp guacamole-client-1.1.0/guacamole/doc/example/{guacamole.properties,user-mapping.xml} /etc/guacamole/
$ sudo ln -s /etc/guacamole/guacamole.properties /usr/share/tomcat8/.guacamole/guacamole.properties
$ sudo chown tomcat8 /etc/guacamole/user-mapping.xml
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
$ sudo systemctl tomcat8.service restart
$ sudo /etc/init.d/guacd restart
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
