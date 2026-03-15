---
description: Mettre en place un serveur OpenVPN dual-stack pour fournir une connectivité IPv6 aux clients VPN
tags:
  - OpenVPN
  - VPN
  - IPv6
---

# Configurer son serveur OpenVPN pour de l'IPv6

OpenVPN est un VPN dual-stack. On va voir comment apporter une connectivité v6 aux clients, ce qui peut être particulièrement utile pour accéder à des sites IPv6 uniquement.

Pour ce tutoriel, il faut déjà avoir un serveur avec une IPv6 en /64 sur son interface WAN ainsi qu'un serveur OpenVPN déjà configuré.

## Configuration de l'OS

Tout d'abord, comme pour IPv4, il faut activer l'ip_forwarding :

```bash
sed -i 0,/ipv6.conf.all/s/^#//g /etc/sysctl.conf
sysctl -p
```

Pour être sûr que la modification soit appliquée, on vérifie ce fichier (doit retourner 1) :

```bash
cat /proc/sys/net/ipv6/conf/all/forwarding
```

Pour l'IPv6, on a un paramètre en plus à modifier : **accept_ra** (si on accepte son IPv6 via RA).

L'accept_ra permet de configurer automatiquement IPv6, il existe 3 modes :

* **0** : Ne pas accepter de RA
* **1** : Accepter les RA
* **2** : Accepter les RA même si on a l'IPv6 forwarding d'activé

Il faut donc un accept_ra à 2 :

```bash
echo "net.ipv6.conf.all.accept_ra=2" >> /etc/sysctl.conf
sysctl -p
```

On vérifie que la valeur a bien été appliquée :

```bash
cat /proc/sys/net/ipv6/conf/all/accept_ra
```

## Configuration du serveur

Prenons en exemple ce range IPv6 : `2001:bc8:31d7:6e00:/56`

On a donc configuré `2001:bc8:31d7:6e00::/64` sur l'interface publique du serveur. OpenVPN utilisera le prochain range disponible, soit `2001:bc8:31d7:6e01:/64`.

Voici les modifications à appliquer au serveur pour qu'il soit dual-stack :

* `proto udp` en `proto udp6`
* `server-ipv6 2001:bc8:31d7:6e01:/64`
* `push "route-ipv6 2000::/3"`

Une fois cette configuration faite, un restart d'OpenVPN suffit (à adapter si le fichier de conf ne s'appelle pas `server.conf`) :

```bash
systemctl restart openvpn@server.service
```
