---
article: docs/networking/cisco/serveur_dhcp.md
checked: '2026-11-11'
commit: e13ccdb9cd9080fcf01893fee927ddbc11fbd9ae
sources: []
unpinned: 1
---

# docs/networking/cisco/serveur_dhcp.md

## Findings

- L26 IMPRECISE rejeté : le finding dit qu'IOS n'exclut pas seul l'IP de la gateway. La doc Cisco dit le contraire : "The IP address configured on a device interface is automatically excluded from the DHCP address pool. The DHCP server assumes that all other IP addresses in a DHCP address pool subnet are available". Preuve : Cisco IOS 15M&T DHCP Configuration Guide, "Configuring the Cisco IOS DHCP Server" (<https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/15-mt/dhcp-15-mt-book/config-dhcp-server.html>). Ajout d'une phrase qui le dit, et que les exclusions servent aux autres IPs déjà prises.

## En plus

- Aucune.

## Modernisation

- Aucune suggestion.

## Tests

- Pas d'IOS disponible, vérification sur la doc Cisco uniquement.

## À signaler

- Blocs de code indentés conservés (cohérents dans le fichier) ; vlan.md et routage_vlan.md sont passés en blocs ```cisco, l'auteur peut vouloir harmoniser.
