---
description: Forcer le HTTPS avec nginx via redirection HTTP 301 et configuration SSL/TLS
tags:
  - nginx
  - TLS
tested_with:
  - "nginx 1.27"
variables:
  - name: domain
    default: example.com
---

# Forcer le SSL sous nginx

Pour forcer le SSL/TLS sous nginx, rien de plus simple, il suffit d'ajouter cette directive dans le server-block qui écoute sur le port 80, et uniquement celui-là : dans le server-block du 443, on part en boucle de redirections. Voir [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) pour la configuration de base.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name <domain>;

    return 301 https://$host$request_uri;
}
```

Il ne faut pas oublier de faire un autre server-block qui écoute sur le port 443 et qui comporte toutes les instructions nécessaires au bon fonctionnement du site web. Le minimum côté TLS, avec les protocoles du profil intermediate de Mozilla et HSTS pour que le navigateur ne repasse plus jamais en HTTP :

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name <domain>;

    ssl_certificate     /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=63072000" always;
    ...
}
```

HSTS se met une fois que le HTTPS marche sur tout le domaine : pendant `max-age` (2 ans ici), le navigateur refuse le HTTP, même si on retire le certificat. Pour le reste (ciphers, OCSP stapling), le [générateur de Mozilla](https://ssl-config.mozilla.org/) donne une conf à jour selon la version de nginx.

## Voir aussi

* [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) - Configuration complète de nginx avec SSL
* [Être encore plus safe en customisant son header Server nginx](custom_server_header.md) - Sécurité additionnelle via les headers
