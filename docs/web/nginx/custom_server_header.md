---
description: Personnaliser ou masquer le header Server de Nginx pour réduire la surface d'attaque
---

# Être encore plus safe en customisant son header Server NGINX

Editer son header Server n'est pas une chose inutile. En effet, selon
celui-ci, nous pouvons déterminer la version du serveur web (nginx,
apache2) ainsi que celle de php. Grace à cette information, si nous
avons une ancienne version de ces logiciels, nous pouvons y retrouver
des CVE et ainsi se faire pirater.

Il existe donc 2 solutions afin d'éditer son header *Server* :

## Compilation nginx

```bash
# vi src/http/ngx_http_header_filter_module.c (lines 48 and 49)
static char ngx_http_server_string[] = "Server: MyDomain.com" CRLF;
static char ngx_http_server_full_string[] = "Server: MyDomain.com" CRLF;
```

## Manière '"propre'"

Il suffit d'installer nginx-extras qui nous apportera le module nginx
more-headers

```bash
apt-get install nginx-extras
```

Puis on edit nginx.conf

```nginx
server_tokens off; # removed pound sign
more_set_headers Server: MyServer;
```
