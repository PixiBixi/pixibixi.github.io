---
description: Personnaliser ou masquer le header Server de nginx pour réduire la surface d'attaque
tested_with:
  - "nginx 1.22 (Debian 12)"
  - "headers-more 0.34"
tags:
  - nginx
---

# Être encore plus safe en customisant son header Server nginx

Editer son header Server n'est pas une chose inutile. En effet, selon
celui-ci, nous pouvons déterminer la version du serveur web (nginx,
apache2). Grace à cette information, si nous
avons une ancienne version de ces logiciels, nous pouvons y retrouver
des CVE et ainsi se faire pirater.

Derrière nginx, la version de PHP n'apparaît pas dans *Server* : elle fuit par le header `X-Powered-By`, qu'on coupe avec `expose_php = Off` dans le `php.ini` (déjà le cas dans le `php.ini` de production de Debian).

`server_tokens off` retire déjà le numéro de version, mais le header reste `Server: nginx`. Pour changer le nom lui-même, 2 solutions s'offrent à nous :

## Compilation nginx

Les chaînes sont dans `src/http/ngx_http_header_filter_module.c` (vers la ligne 50 sur les versions récentes) : la première sert avec `server_tokens off`, la deuxième avec `on`, la troisième avec `server_tokens build`.

```c
// vi src/http/ngx_http_header_filter_module.c
static u_char ngx_http_server_string[] = "Server: MyDomain.com" CRLF;
static u_char ngx_http_server_full_string[] = "Server: MyDomain.com" CRLF;
static u_char ngx_http_server_build_string[] = "Server: MyDomain.com" CRLF;
```

Ce fichier ne couvre que HTTP/1.x : HTTP/2 et HTTP/3 écrivent leur propre header *Server* dans `src/http/v2/ngx_http_v2_filter_module.c` et `src/http/v3/ngx_http_v3_filter_module.c`, à patcher aussi.

## Manière « propre »

Il suffit d'installer le module headers-more. Sur Debian/Ubuntu, il existe en paquet seul, pas besoin de tout `nginx-extras` :

```bash
apt-get install libnginx-mod-http-headers-more-filter
```

Puis on edit nginx.conf. Le header se passe en une seule chaîne quotée : sans quotes, `nginx -t` passe mais le module lit 2 arguments et le header *Server* disparaît au lieu d'être remplacé.

```nginx
server_tokens off;
more_set_headers 'Server: MyServer';
```

## Voir aussi

* [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) - Configuration nginx complète avec `server_tokens` et `more_set_headers`
* [Forcer le SSL sous nginx](nginx_ssl.md) - Configuration SSL pour une sécurité complète
