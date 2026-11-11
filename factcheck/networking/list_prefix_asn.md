---
article: docs/networking/list_prefix_asn.md
checked: '2026-11-11'
commit: b2f67fe60b74518962cda43f7d3cb0eef78b3ae0
sources: []
unpinned: 1
---

# docs/networking/list_prefix_asn.md

## Findings

- L15 IMPRECISE corrigé : précision que Shadowserver attend le numéro sans `AS`, que la sortie est la vue BGP de Shadowserver et ne contient que de l'IPv4. Preuve : `whois -h asn.shadowserver.org "prefix 3215"` -> 926 lignes IPv4, aucune ligne contenant `:` ; `"prefix AS3215"` -> erreur "Request must be in the form of 'origin a.b.c.d'...".

## En plus

- Front matter `description` disait "IPv4/IPv6" alors que la commande Shadowserver ne renvoie que de l'IPv4 : description réécrite pour couvrir les 3 méthodes. Preuve : test ci-dessus, et RIPEstat renvoie 928 IPv4 + 45 IPv6 pour AS3215.

## Modernisation

- Appliqué : RIPEstat `announced-prefixes` avec curl + jq (testé, IPv4 et IPv6).
- Appliqué : RADB `whois -h whois.radb.net -- "-i origin AS3215"` filtré sur route/route6 (testé, 1201 préfixes uniques), avec mention de bgpq4.
- bgpq4 seulement cité, pas testé (non installé), pas de commande donnée.

## Tests

- whois (macOS) contre asn.shadowserver.org et whois.radb.net, curl stat.ripe.net, le 2026-11-09.

## À signaler

- Rien.
