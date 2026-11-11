---
article: docs/linux/cli/ip.md
checked: '2026-11-11'
commit: 055ddbe1378db08195cd6d1b6cef33a5a737eb89
sources: []
unpinned: 1
---

# docs/linux/cli/ip.md

## Findings

- L56 IMPRECISE corrigé : la commande devient `ip addr add 192.168.1.8/24 brd + dev wlan0`, avec une phrase expliquant que `ip` ne calcule pas le broadcast sans `brd +`, et la sortie précise que sans `brd +` la ligne inet n'a pas de brd. Preuve : test Docker debian:13.1, iproute2-6.15.0 : sans `brd +` -> `inet 192.168.1.8/24 scope global wlan0`, avec -> `inet 192.168.1.8/24 brd 192.168.1.255 scope global wlan0`.

## En plus

- "depreciated" corrigé en "deprecated".
- "IP '<-'> MAC" (rendu cassé) remplacé par "entre IP et adresse MAC".

## Modernisation

- Appliqué : ajout de `ip -br -c addr` / `ip -br -c link` (testés, sortie compacte colorée).
- Appliqué : mtu du lo dans l'exemple passé de 16436 à 65536 (testé : `mtu 65536` sur lo).
- Non appliqué : qdisc pfifo_fast -> fq_codel. Le qdisc par défaut dépend de net.core.default_qdisc (posé par systemd sur beaucoup de distros, pas par le noyau), et le dummy de test affiche noqueue : pas de valeur universelle. Les en-têtes `ip -s` récents (colonne missed) diffèrent aussi des exemples, laissés tels quels.

## Tests

- Docker debian:13.1, iproute2 6.15.0 (cap NET_ADMIN, interface dummy wlan0) : ip addr add/del, brd +, ip -br, ip -c, ip -s link, ip neigh add ... nud permanent, ip link set arp off, ip route.

## À signaler

- Rien.
