---
description: Configurer HAproxy pour récupérer l'IP réelle des visiteurs derrière CloudFlare via headers HTTP
tags:
  - HAProxy
  - Cloudflare
---

# HAproxy : Obtenir les vraies IPs depuis CloudFlare

Assez simple, il faut jouer avec les headers. Cette approche fonctionne avec [option forwardfor](keep_real_ip.md) pour passer l'IP réelle au backend.

Concrêtement, ça nous donne ça niveau frontend HAproxy :

```bash
frontend    https
    bind    0.0.0.0:443 ssl crt /etc/haproxy/acme-certs/ alpn h2,http/1.1 allow-0rtt

    mode http

    acl from_cf    src -f /etc/haproxy/acl/cloudflare_ips.lst
    http-request set-src req.hdr(CF-Connecting-IP) if from_cf
    option forwardfor
```

Pour le fichier cloudflare_ips.lst, CloudFlare maintient une liste
publique de ses IPs :

* [IPv4](https://www.cloudflare.com/ips-v4)
* [IPv6](https://www.cloudflare.com/ips-v6)

## Voir aussi

* [Conserver l'IP de son visiteur sur un reverse-proxy](keep_real_ip.md)
* [Reverse proxy: HAproxy](overview.md)
