# HAproxy : Obtenir les vraies IPs depuis CloudFlare

Assez simple, il faut jouer avec les headers. Concrêtement, ça nous
donne ça niveau frontend HAproxy :

```bash
frontend    https
    bind    0.0.0.0:443 ssl crt /etc/haproxy/acme-certs/ alpn h2,http/1.1 allow-0rtt

    mode http

    acl from_cf    src -f /etc/haproxy/acl/cloudflare_ips.lst
    http-request set-src req.hdr(CF-Connecting-IP) if from_cf
```

Pour le fichier cloudflare_ips.lst, CloudFlare maintient une liste
publique de ses IPs :

  * [IPv4](https://www.cloudflare.com/ips-v4)
  * [IPv6](https://www.cloudflare.com/ips-v6)

A l'heure où j'écris ce petit post, la voici :

```bash
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22
2400:cb00::/32
2606:4700::/32
2803:f800::/32
2405:b500::/32
2405:8100::/32
2a06:98c0::/29
2c0f:f248::/32
```
