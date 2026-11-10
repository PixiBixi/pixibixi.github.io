---
description: Lister les préfixes IPv4/IPv6 annoncés par un numéro d'AS via Shadowserver, RIPEstat ou un IRR
tags:
  - BGP
  - ASN
---

# Lister les préfixes annoncés par un AS

Il peut être utile pour scripter ou autre de lister tous les préfixes
annoncés par un ASN

Le whois de Shadowserver attend le numéro d'AS seul, sans le préfixe `AS` :

```bash
AS=3215
whois -h asn.shadowserver.org "prefix $AS"
```

Nous retournera les préfixes IPv4 annoncés par 3215 (Orange), tels que Shadowserver les voit en BGP. Pas d'IPv6 dans cette sortie.

Pour avoir IPv4 et IPv6 en JSON, l'API RIPEstat `announced-prefixes` est plus pratique à scripter :

```bash
AS=3215
curl -fsS "https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS$AS" | jq -r '.data.prefixes[].prefix'
```

Pour construire des filtres BGP, on part plutôt de ce qui est déclaré dans un IRR (objets `route`/`route6`), par exemple RADB, ou avec `bgpq4` :

```bash
AS=3215
whois -h whois.radb.net -- "-i origin AS$AS" | awk '/^route6?:/ {print $2}' | sort -u
```
