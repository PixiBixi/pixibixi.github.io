---
description: Installer et configurer un serveur FTP avec PureFTPd - authentification, TLS et utilisateurs virtuels
tested_with:
  - "Pure-FTPd 1.0.50 (Debian 12)"
tags:
  - FTP
---

# Installer son serveur FTP

## Introduction

Un serveur FTP (FTPES quand il est chiffré en TLS explicite, via `AUTH TLS` sur le même port) est un serveur de transfert de fichier fonctionnant en TCP sur le port 21 par défaut. Il existe une
multitude de serveur FTP tel que PureFTPd, ProFTPd, DrFTPd ou bien
GlFTPd, mais chacun à ses avantages et ses inconvénients.

PureFTPd est un serveur FTP simple d'installation et de configuration,
c'est pour cela que nous avons choisit de l'installer.

Si les clients le permettent, SFTP (fourni par OpenSSH, déjà présent sur le serveur) évite d'installer et d'exposer un serveur FTP.

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
*/usr/sbin* et divers fichiers dans */etc/pure-ftpd*

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
    chemin... Il est créé au premier `pure-pw useradd`

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

Le champ **VIRTUALCHROOT** du fichier **/etc/default/pure-ftpd-common** n'est pas nécessaire pour les virtual users : à true, il lance le binaire qui suit les liens symboliques sortant du chroot. On ne le passe à true que si on en a besoin.

Si vous êtes derrière un NAT, il faut forcer les PassivePorts (et les ouvrir sur le pare-feu) ainsi que l'IP publique annoncée en réponse à `PASV`, sinon le client reçoit l'IP privée du serveur

```bash
echo "40110 40210" > /etc/pure-ftpd/conf/PassivePortRange
echo "203.0.113.10" > /etc/pure-ftpd/conf/ForcePassiveIP
service pure-ftpd restart
```

## Bonus

### TLS

Tout d'abord, nous devons configurer Pure-FTPd afin qu'il autorise les
connexions via TLS. Pour cela, nous devons éditer le **fichier TLS** qui
se trouve dans le **dossier conf**

Voici les valeurs qu'il peut avoir:

* **0** : N'autorise pas les connexions TLS (défaut)
* **1** : Autorise les connexions TLS **et** les connexions en clair, les mots de passe peuvent donc toujours passer en clair
* **2** : Autorise **seulement** les connexions TLS, à utiliser dès que le serveur est exposé

```bash
echo 2 > /etc/pure-ftpd/conf/TLS
```

Qui dit TLS, dit également certificat. Nous devons donc créer les
certificats

```bash
mkdir -p /etc/ssl/private/
```

Puis nous créons notre certificat (clé et certificat dans le même fichier, lisible par root seul). Un auto-signé fait afficher un avertissement par les clients (FileZilla, lftp) : avec un nom de domaine, on préfère un certificat Let's Encrypt, en concaténant la clé et le `fullchain.pem` dans ce même fichier.

```bash
openssl req -x509 -nodes -days 7300 -newkey rsa:4096 -keyout /etc/ssl/private/pure-ftpd.pem -out /etc/ssl/private/pure-ftpd.pem
chmod 600 /etc/ssl/private/pure-ftpd.pem
```

Et évidemment, on n'oublie pas de redémarrer son serveur FTP.

### Ciphers

Depuis la 1.0.50 (celle de Debian 12), Pure-FTPd refuse déjà SSLv3, TLS 1.0 et TLS 1.1 : seuls TLS 1.2 et 1.3 passent. Debian livre aussi un fichier `TLSCipherSuite` à `HIGH`, ça marche sans rien toucher.

Pour aller plus loin, on peut restreindre les ciphers TLS 1.2 aux seuls AEAD (GCM et ChaCha20, plus de CBC) en suivant le [guide Mozilla](https://ssl-config.mozilla.org/). Ce fichier ne touche pas TLS 1.3, qui garde les ciphers par défaut d'OpenSSL.

```bash
echo "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305" > /etc/pure-ftpd/conf/TLSCipherSuite
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

Afin de restreindre à une IP/range un compte utilisateur, on utilise `-r` (liste autorisée). `-R` fait l'inverse : il interdit le compte depuis ces IP. Le `-m` régénère la base dans la foulée.

```bash
pure-pw usermod <username> -r 192.168.2.0/24 -m
pure-pw usermod <username> -r 192.168.0.8 -m
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

On passe une chaîne vide à chaque option qu'on veut retirer (ici débit et filtrage IP) :

```bash
pure-pw usermod <username> -t '' -T '' -r '' -R '' -m
```

Même principe pour les quotas (`-n ''`, `-N ''`) ou les ratios (`-q '' -Q ''`).
