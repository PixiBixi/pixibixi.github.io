---
description: Mettre en place un serveur OpenVPN dual-stack pour fournir une connectivité IPv6 aux clients VPN
variables:
  - name: wan_if
    default: eth0
tags:
  - OpenVPN
  - VPN
  - IPv6
---

# Configurer son serveur OpenVPN pour de l'IPv6

OpenVPN est un VPN dual-stack. On va voir comment apporter une connectivité v6 aux clients, ce qui peut être particulièrement utile pour accéder à des sites IPv6 uniquement.

Pour ce tutoriel, il faut déjà avoir un serveur OpenVPN configuré, et un préfixe IPv6 plus large qu'un /64 routé vers le serveur (ici un /56) : un /64 pour l'interface WAN, un autre pour les clients VPN.

## Configuration de l'OS

Tout d'abord, comme pour IPv4, il faut activer le forwarding. On met les sysctl dans un fichier dédié plutôt que de décommenter une ligne de `/etc/sysctl.conf`, qui n'existe pas toujours :

```bash
echo "net.ipv6.conf.all.forwarding=1" > /etc/sysctl.d/99-vpn.conf
sysctl --system
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

Il faut donc un accept_ra à 2 sur l'interface WAN. Contrairement à `forwarding`, `accept_ra` n'est lu que par interface : un `net.ipv6.conf.all.accept_ra=2` ne change rien sur une interface existante, et avec le forwarding activé, le serveur ignore alors les RA et finit par perdre sa route par défaut v6. On le pose donc sur l'interface elle-même :

```bash
echo "net.ipv6.conf.<wan_if>.accept_ra=2" >> /etc/sysctl.d/99-vpn.conf
sysctl --system
```

On vérifie que la valeur a bien été appliquée :

```bash
cat /proc/sys/net/ipv6/conf/<wan_if>/accept_ra
```

## Configuration du serveur

Prenons en exemple ce range IPv6 : `2001:bc8:31d7:6e00::/56`

On a donc configuré `2001:bc8:31d7:6e00::/64` sur l'interface publique du serveur. On donne à OpenVPN un autre /64 du range, par exemple le suivant, `2001:bc8:31d7:6e01::/64`. OpenVPN ne choisit rien tout seul, c'est la valeur de `server-ipv6`. Ce /64 doit être routé vers le serveur par l'hébergeur (c'est le cas d'un /56 délégué), sinon les clients n'ont pas de trafic retour.

Voici les modifications à appliquer au serveur pour qu'il soit dual-stack :

* `proto udp` en `proto udp6`
* `server-ipv6 2001:bc8:31d7:6e01::/64`
* `push "route-ipv6 2000::/3"`

Si un pare-feu tourne sur le serveur (ip6tables, nftables), sa chaîne forward doit aussi laisser passer le trafic entre `tun0` et l'interface WAN.

Une fois cette configuration faite, un restart d'OpenVPN suffit (à adapter si le fichier de conf ne s'appelle pas `server.conf`) :

```bash
systemctl restart openvpn@server.service
```
