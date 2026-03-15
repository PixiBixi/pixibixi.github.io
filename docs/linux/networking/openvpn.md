---
description: Installer et configurer un serveur VPN OpenVPN sous Linux — génération des certificats PKI avec easy-rsa v3, configuration serveur et client.
tags:
  - OpenVPN
  - VPN
---

# Installer et configurer son VPN OpenVPN

Pourquoi installer un serveur VPN ? Éviter la surveillance, contourner les géo-restrictions (Netflix, Hulu...), ou être un peu plus anonyme. La connexion étant chiffrée, on parle de **tunnel VPN**.

Les VPN français ont l'obligation de conserver les logs de connexion au moins **1 an** — rien ne garantit que les logs sont désactivés sur un VPN à 2$ par mois.

Le serveur VPN ne doit pas être sur la machine physique, sinon il est totalement inutile. Un petit VPS chez [Scaleway](https://www.scaleway.com/) fait très bien l'affaire, ou chez [YourServer](https://www.yourserver.se/) si on veut être encore plus discret (excellent petit hébergeur, staff facilement accessible).

OpenVPN + easy-rsa v3 sur Debian/Ubuntu. PKI complète, config serveur et client `.ovpn` prêt à l'emploi.

## Installation

Pour installer OpenVPN, rien de plus simple. On installe aussi easy-rsa pour la gestion des certificats — il reste ensuite quelques étapes avant d'avoir quelque chose de fonctionnel :

```bash
apt install openvpn easy-rsa
```

## PKI — Génération des certificats

Attention, easy-rsa v3 — fini les `source vars` et `build-ca` de la v2, ça ne marche plus.

```bash
make-cadir /etc/openvpn/easy-rsa
cd /etc/openvpn/easy-rsa
./easyrsa init-pki
./easyrsa build-ca nopass
./easyrsa gen-dh
./easyrsa build-server-full server nopass
openvpn --genkey secret /etc/openvpn/ta.key
```

Les fichiers générés :

| Fichier | Rôle |
| ------- | ---- |
| `pki/ca.crt` | Autorité de certification |
| `pki/issued/server.crt` | Certificat serveur |
| `pki/private/server.key` | Clé privée serveur |
| `pki/dh.pem` | Diffie-Hellman |
| `/etc/openvpn/ta.key` | Clé TLS (HMAC) |

## Configuration serveur

`/etc/openvpn/server.conf` :

```ini
port 1194
proto udp
dev tun
sndbuf 0
rcvbuf 0

ca /etc/openvpn/easy-rsa/pki/ca.crt
cert /etc/openvpn/easy-rsa/pki/issued/server.crt
key /etc/openvpn/easy-rsa/pki/private/server.key
dh /etc/openvpn/easy-rsa/pki/dh.pem
tls-crypt /etc/openvpn/ta.key

topology subnet
server 10.8.0.0 255.255.255.0
ifconfig-pool-persist ipp.txt 0

push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 1.1.1.1"
push "dhcp-option DNS 1.0.0.1"

keepalive 10 120
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
tls-version-min 1.2
user nobody
group nogroup
persist-key
persist-tun

status /var/log/openvpn-status.log
log /var/log/openvpn.log
verb 3
```

!!! warning "comp-lzo"
    `comp-lzo` est déprécié depuis OpenVPN 2.5 — ne pas l'utiliser. Ça trigger des warnings et ça expose à des attaques de type VORACLE.

## Ports firewall

Ouvrir le port suivant côté serveur :

| Port | Proto | Usage |
| ---- | ----- | ----- |
| 1194 | UDP | Tunnel OpenVPN clients |

## Configuration du serveur Linux

Maintenant qu'OpenVPN est configuré, il faut que la distribution Linux route correctement le trafic VPN.

On active l'IP Forwarding — sans ça, les paquets entrant sur le tunnel ne sont pas retransmis vers Internet :

```bash
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p
```

Et on active le NAT via IPTables pour que le trafic des clients VPN sorte avec l'IP du serveur :

```bash
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

Adapter `eth0` à l'interface de sortie (`ip route get 1.1.1.1` pour la trouver). Par défaut, OpenVPN utilise le réseau `10.8.0.0/24`.

## Démarrage

Une fois la config en place, on démarre et on active au boot. Le `@server` correspond au nom du fichier de conf — ici `/etc/openvpn/server.conf` :

```bash
systemctl enable --now openvpn@server
```

On vérifie que tout est bien parti :

```bash
systemctl status openvpn@server
tail -f /var/log/openvpn.log
```

## Client

On génère les certificats côté serveur :

```bash
cd /etc/openvpn/easy-rsa
./easyrsa build-client-full client1 nopass
```

Dans `client1.ovpn`, on peut tout embarquer directement, ce qui est plus simple que de se balader avec 4 fichiers :

```ini
client
dev tun
proto udp
remote <ip-serveur> 1194
resolv-retry infinite
nobind
persist-key
persist-tun
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
tls-version-min 1.2
verb 3
sndbuf 0
rcvbuf 0

<ca>
# Contenu de pki/ca.crt
</ca>
<cert>
# Contenu de pki/issued/client1.crt
</cert>
<key>
# Contenu de pki/private/client1.key
</key>
<tls-crypt>
# Contenu de /etc/openvpn/ta.key
</tls-crypt>
```

Ou en fichiers séparés à copier sur le client : `pki/ca.crt`, `pki/issued/client1.crt`, `pki/private/client1.key`, `ta.key`.

## Scripts d'auto-installation

[OpenVPN-Install](https://github.com/Angristan/OpenVPN-install) — script Angristan, multi-distro (Debian, Ubuntu, CentOS), bonne sécu par défaut. C'est le plus maintenu.

[piVPN](https://github.com/pivpn/pivpn) — interface de gestion des utilisateurs en plus, pratique sur Raspberry Pi.
