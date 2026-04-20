---
description: Forcer le HTTPS avec Nginx via redirection HTTP 301 et configuration SSL/TLS
tags:
  - nginx
  - TLS
---

# Forcer le SSL sous NGINX

Pour forcer le SSL/TLS sous nginx, rien de plus simple, il suffit
simplement d'ajouter cette directive dans votre server-block nginx. Voir [Installer son Serveur Web : NGINX, PHP-FPM et MariaDB](installation.md) pour la configuration de base.

```nginx
server {
...
    return 301 https://$host$request_uri;
...
}
```

Il ne faut pas oublier de faire un autre server-block qui écoute sur le
port 443 et qui comporte toutes les instructions nécéssaire au bon
fonctionnement du site web.

## Voir aussi

* [Installer son Serveur Web : NGINX, PHP-FPM et MariaDB](installation.md) — Configuration complète de nginx avec SSL
* [Être encore plus safe en customisant son header Server NGINX](custom_server_header.md) — Sécurité additionnelle via les headers
