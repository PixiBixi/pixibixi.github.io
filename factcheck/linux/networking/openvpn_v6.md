---
article: docs/linux/networking/openvpn_v6.md
checked: '2026-11-10'
commit: 8d2ac00b11cdb6abf9e38aa0c28a96ddb0e2f271
sources:
- repo: linux
  path: include/net/ipv6.h
  lines: 457-466
  ref: origin/HEAD
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
unpinned: 3
---

# docs/linux/networking/openvpn_v6.md

## Findings

- L60 ERROR corrigé : `server-ipv6 2001:bc8:31d7:6e01::/64`, et même correction L53 (`2001:bc8:31d7:6e00::/56`) et L55. Preuve : OpenVPN 2.6.20 (alpine:3.20.3) : `--server-ipv6 2001:bc8:31d7:6e01:/64` donne `Options error: error parsing --server-ipv6 parameter`, la forme `::/64` passe ce parsing ; Python `ipaddress` rejette aussi `6e01:/64` et `6e00:/56`.
- L20 IMPRECISE corrigé : le `sed` sur `/etc/sysctl.conf` remplacé par un fichier `/etc/sysctl.d/99-vpn.conf` et `sysctl --system`. Preuve : test Docker debian:12.8 (procps-ng 4.0.2) : `* Applying /etc/sysctl.d/99-vpn.conf`, forwarding=1.
- L55 IMPRECISE corrigé : précisé qu'OpenVPN prend la valeur de `server-ipv6` sans rien choisir, et que le /64 doit être routé vers le serveur par l'hébergeur. Preuve : la valeur est un paramètre obligatoire de `--server-ipv6` (parsing testé ci-dessus). Partie routage hébergeur : non vérifiée par test, énoncée en principe général.

## En plus

- L41 : `net.ipv6.conf.all.accept_ra=2` est sans effet sur l'interface WAN : `accept_ra` est lu par interface, donc avec forwarding=1 le serveur ignore les RA. Remplacé par `net.ipv6.conf.<wan_if>.accept_ra=2` (variable `wan_if`, défaut `eth0`), vérification sur `/proc/sys/net/ipv6/conf/<wan_if>/accept_ra`. Preuve : torvalds/linux include/net/ipv6.h:457-466 @origin/HEAD (`ipv6_accept_ra` lit `idev->cnf.accept_ra` et `idev->cnf.forwarding` de l'interface) ; test alpine:3.20.3 noyau 7.0.14 : après `sysctl -w net.ipv6.conf.all.accept_ra=2`, eth0=1 et all=2, alors que `all.forwarding=1` propage bien eth0=1.
- L13 : le prérequis « une IPv6 en /64 sur son interface WAN » contredisait la suite (il faut un 2e /64) : remplacé par un préfixe plus large qu'un /64 routé vers le serveur.

## Modernisation

- sysctl dans `/etc/sysctl.d/99-vpn.conf` : appliqué.
- /64 routé vers le serveur : appliqué. NDP proxy non mentionné (non testé).
- Forwarding pare-feu ip6tables/nftables : une phrase ajoutée, sans règle concrète (non testée).

## Tests

- Docker alpine:3.20.3 + openvpn 2.6.20 (parsing `--server-ipv6`) ; alpine:3.20.3 `--privileged` (propagation sysctl, noyau OrbStack 7.0.14) ; debian:12.8 + procps-ng 4.0.2 (`sysctl --system`). Pas de tunnel OpenVPN réel monté.

## À signaler

- `tested_with` non ajouté : seul le parsing d'options a été testé, pas un tunnel dual-stack complet.
- Une règle de forward nftables concrète pourrait être ajoutée si l'auteur a la sienne.
