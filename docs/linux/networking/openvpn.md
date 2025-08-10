# Installer et configurer son VPN OpenVPN

## Préambule

Pourquoi installer un serveur VPN ? Il existe une multitude raisons
d'installer un serveur VPN, la première est d'éviter la surveillance.
La connexion via un VPN étant cryptée, nous ne pouvons pas savoir ce
qu'y passe sur le réseau, nous parlons alors de **tunnel VPN**.

Il est également possible d'utiliser un VPN afin d'éviter les
géo-restrictions (Netflix, Hulu...)

Et enfin, nous pouvons utiliser un VPN pour être un petit peu plus
anonyme sur la toile. **Attention**, les VPN français ont pour
obligation de conserver les logs de connexion au moins **1 an**, et rien
ne vous dit que les logs sont désactivés sur votre VPN à 2'$ par mois.

Le serveur VPN ne doit pas être sur votre machine physique, ou celui-ci
serait totalement inutile.

Le but d'un serveur VPN est de faire croire aux serveurs sur Internet
que vous n'êtes pas localisés à votre adresse, mais à l'adresse de
votre serveur VPN.

Vous pouvez prendre un petit VPS chez
[Scaleway](https://www.scaleway.com/) par exemple, ou alors si vous avez
vraiment peur de Hadopi & co, chez
[YourServer](https://www.yourserver.se/) (Excellent petit hébergeur,
staff facilement accessible).

## Installation

Pour installer OpenVPN, rien de plus simple:

```bash
apt install openvpn
```

Nous allons installer la brique de base de notre serveur VPN, cependant,
il nous reste de nombreuses étapes avant d'avoir un VPN fonctionnel.

Nous allons copier les fichiers utiles à la création des futures
certificats :

```bash
cp -a /usr/share/easy-rsa /etc/openvpn/ && cd /etc/openvpn/easy-rsa
source vars
./clean-all
```

## Création des certificats

Afin d'être sécuriser, un VPN a besoin de certificats SSL. Ceux-ci sont
très facile à build via easy-rsa

```bash
cd /etc/openvpn/easy-rsa
./build-ca
```

Spammez la touche '"Entree'" de votre clavier jusqu'à revenir sur votre
terminal de base

Puis on creer le Diffie-Hellman

```bash
openvpn --genkey --secret /etc/openvpn/ta.key
```

Et enfin, le certificat côté serveur, que l'on n'oublie pas de signer
!

```bash
./build-key-server srvcert
```

Une fois ceci fait, nous avons tous nos certificats pour configurer
correctement notre OpenVPN

## Configuration de OpenVPN

OpenVPN fournit des fichiers de configurations exemple relativement bien
complet, nous allons donc les réutiliser

```bash
gunzip -c /usr/share/doc/openvpn/examples/sample-config-files/server.conf.gz > /etc/openvpn/server.conf
```

Puis on l'édite afin qu'il concorde à notre installation

```bash
vim /etc/openvpn/server.conf
```

Voici les valeurs que nous devons avoir dans server.conf :

* user nobody
* group nogroup
* ca /etc/openvpn/easy-rsa/keys/ca.crt
* cert /etc/openvpn/easy-rsa/keys/srvcert.crt
* key /etc/openvpn/easy-rsa/keys/srvcert.key '# This file should be
    kept secret
* dh /etc/openvpn/easy-rsa/keys/dh2048.pem
* cipher AES-256-CBC

Et on ajoute en bas du fichier ces lignes:

* push '"redirect-gateway def1 bypass-dhcp'"
* push '"dhcp-option DNS 4.2.2.1'"
* push '"dhcp-option DNS 4.2.2.2'"
* sndbuf 0
* rcvbuf 0

Voici à quoi doit ressembler le fichier final

```bash
    port 42600
    proto udp
    dev tun
    sndbuf 0
    rcvbuf 0
    ca ca.crt
    cert server.crt
    key server.key
    dh dh.pem
    tls-auth ta.key 0
    topology subnet
    server 10.1.2.0 255.255.255.0
    ifconfig-pool-persist ipp.txt 0
    push "redirect-gateway def1 bypass-dhcp"
    push "dhcp-option DNS 10.0.0.106"
    push "dhcp-option DNS 10.0.0.14"
    keepalive 10 120
    cipher AES-128-CBC
    comp-lzo
    user nobody
    group nogroup
    persist-key
    persist-tun
    status openvpn-status.log
    log /var/log/openvpn.log
    verb 3
```

## Configuration du Serveur

Maintenant qu'OpenVPN est correctement configurer, nous devons
configurer notre distribution Linux afin que celle-ci route correctement
notre serveur VPN

Tout d'abord, on active l'IP Forwarding

```bash
echo net.ipv4.ip_forward=1 >> /etc/sysctl.conf
sysctl -p
```

Et on active le NAT via IPTables

```bash
    iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
    iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
```

Par défaut, OpenVPN utilise le réseau 10.8.0.0/24

## Configuration du client OpenVPN

Maintenant que notre OpenVPN est correctement configuré côté server,
nous devons nous occuper de la partie client.

Tout d'abord, il faut génerer les certificats pour notre client (Votre
PC).

```bash
cd /etc/openvpn/easy-rsa/
source vars
./build-key jeremy
```

Et on créer le fichier de conf :

```bash
# Client
client
dev tun
proto udp
remote ip port
resolv-retry infinite
cipher AES-256-CBC
; client-config-dir ccd
# Cles
ca ca.crt
cert jeremy.crt
key jeremy.key
tls-auth ta.key 1
key-direction 1
# Securite
nobind
persist-key
persist-tun
comp-lzo
verb 3
# Set manual buffers
sndbuf 0
rcvbuf 0
```

N'oubliez pas de télécharger les fichiers suivants sur votre PC :

* ca.crt
* ta.key
* jeremy.crt
* jeremy.key
* client.ovpn

Et voilà, vous avez votre propre VPN fonctionnel :)

## Script d'auto-installation

[piVPN](https://github.com/pivpn/pivpn) est un petit script permettant
d'installer un serveur OVPN en nous permettant de setup port utilisé,
DNS...

En plus de cela, pivpn nous fournit un petit script de gestion
d'utilisateur. Il est compatible Debian et Ubuntu

[OpenVPN-Install](https://github.com/Angristan/OpenVPN-install) est un
script simple développé par Angristan multi-plateforme (CentOs, Debian
et Ubuntu) apportant une sécurité accrue.
