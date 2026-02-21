# Installer son serveur FTP

## Introduction

Un serveur FTP (FTPES pour le SSL) est un serveur de transfert de
fichier fonctionnant en TCP sur le port 21 par défaut. Il existe une
multitude de serveur FTP tel que PureFTPd, ProFTPd, DrFTPd ou bien
GlFTPd, mais chacun à ses avantages et ses inconvénients.

PureFTPd est un serveur FTP simple d'installation et de configuration,
c'est pour cela que nous avons choisit de l'installer.

## Installation

Pour l'installer, rien de plus simple. Il suffit de l'installer via
son gestionnaire de paquet.

```bash
apt install pure-ftpd
```

Ne pas oublier de vérifier que nous disposons bien du paquet dans les
sources

```bash
apt show pure-ftpd
```

## Configuration

Lorsque nous installons **Pure-FTPd**, son exécutable se place dans
*/usr/sbin*, et divers fichiers dans */etc/pure-ftpd*

Par défaut, voici ce que contient répertoire :

* **auth** : Dossier contenant les différents moyens de se connecter à
    notre serveur FTP (Unix, PAM, PureDB)
* **conf** est un dossier contenant les fichiers que nous pourrons
    configurer. Nous pouvons également ajouter d'autres fichiers afin
    de configurer des éléments supplémentaires
* **db** est un dossier vide qui va contenir la BDD des Virtual User
    de PureFTPd
* **pureftpd-dir-aliases** est un fichier pouvant contenir des alias,
    ceci évitant les liens symboliques
* **pureftpd.passwd** est le fichier, tel que */etc/passwd* qui va
    contenir diverses informations tel que username, password,
    chemin...

Tout d'abord, nous devons ajouter un utilisateur et un groupe pour nos
utilisateurs virtuels PureFTPd

```bash
groupadd ftpgroup
```

```bash
useradd -g ftpgroup -d /dev/null -s /usr/sbin/nologin ftpuser
```

Maintenant, il faut donc créer un user afin de se connecter au FTP

```bash
pure-pw useradd test -u ftpuser -g ftpgroup -d /home/www/test
```

Puis on génère la DB

```bash
pure-pw mkdb
```

**Attention, à chaque modification d'utilisateur, il ne faut pas
oublier de régénérer la base de donnée**

On active la reconnaissance des virtuals users par PureFTPd

```bash
ln -s /etc/pure-ftpd/conf/PureDB /etc/pure-ftpd/auth/50pure
```

Et enfin, pour activer la gestion des virtual users, il faut éditer le
champ **VIRTUALCHROOT** et le passer à true dans le fichier
**/etc/default/pure-ftpd-common**

Si vous êtes derrière un NAT, il peut être bon de forcer les
PassivePorts afin de les NAT correctement

```bash
echo "40110 40210" > /etc/pure-ftpd/conf/PassivePortRange
service pure-ftpd restart
```

## Bonus

### SSL

Tout d'abord, nous devons configurer Pure-FTPd afin qu'il autorise les
connexions via SSL. Pour cela, nous devons éditer le **fichier TLS** qui
se trouve dans le **dossier conf**

Voici les valeurs qu'il peut avoir:

* **0** : N'autorise pas les connexions SSL
* **1** : Autorise les connexions SSL **et** les connexions non-SSL
* **2** : Autorise **seulement** les connexions SSL

Qui dit TLS, dit également certificat. Nous devons donc créer les
certificats

```bash
mkdir -p /etc/ssl/private/
```

Puis nous créons notre certificat:

```bash
openssl req -x509 -nodes -days 7300 -newkey rsa:4096 -keyout /etc/ssl/private/pure-ftpd.pem -out /etc/ssl/private/pure-ftpd.pem
```

Et évidemment, on n'oublie pas de redémarrer son serveur FTP.

### Ciphers

Etant donné que les ciphers de Pure-FTPd sont totalement fucked-up, nous
allons donc les modifier

Pour avoir une bonne liste de ciphers, je vous recommande de prendre
ceux Wiki Mozilla disponible
[ici](https://wiki.mozilla.org/Security/Server_Side_TLS)

Il suffit donc de copier la Ciphers Listdans un fichier que nous allons
créer dans le **dossier conf**

```bash
touch /etc/pure-ftpd/conf/TLSCipherSuite
```

Puis l'on '"insère'" les ciphers

```bash
echo "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256" > /etc/pure-ftpd/conf/TLSCipherSuite
```

### FXP

Comme d'habitude, pour activer le FXP (**F**ile e**X**change
**P**rotocole), tout cela se passe comme d'habitude dans le dossier
**conf**

Voici la commande à taper afin d'activer le FXP

```bash
echo yes > /etc/pure-ftpd/conf/AllowUserFXP
```

**Rappel:** Pour fonctionner, le FXP doit être activer sur les 2
serveurs

### Desactiver les users systèmes

Si vous ne souhaitez utilisez uniquement une auth' par users
virtuelles, alors il faut désactiver l'authentification UNIX mais
également l'authentification PAM

```bash
echo no > /etc/pure-ftpd/conf/PAMAuthentication
echo no > /etc/pure-ftpd/conf/UnixAuthentication
```

### Bridage

Il est possible de faire différents types de bridage afin de mieux
controler l'utilisateur

#### Lock IP

Afin de restreindre à une IP/range un compte utilisateur :

```bash
pure-pw usermod <username> -R 192.168.2.0/24 -m
pure-pw usermod <username> -R 192.168.0.8 -m
```

Il est possible de séparer plusieurs IP par une virgule.

#### Restrict Debit

Vous pouvez affecter un débit maximum à vos utiliateurs :

```bash
pure-pw usermod <username> -t 10 -T 10 -m
```

Il est possible d'utiliser -t et -T indépendament l'un de l'autre:

* `-t` signifie downloads
* `-T` signifie upload

#### Reset Bridage

Tout simple !

```bash
pure-pw usermod <username> -N  -m
```
