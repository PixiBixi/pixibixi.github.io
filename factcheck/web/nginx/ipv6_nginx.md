---
article: docs/web/nginx/ipv6_nginx.md
checked: '2026-11-10'
commit: 62bba671be12cc42d4c269f94904bf41c2059055
sources: []
unpinned: 7
---

# docs/web/nginx/ipv6_nginx.md

## Findings

- L30 ERROR corrigé : la commande devient `nginx -V 2>&1 | grep -- --with-ipv6`, présentée seulement pour un très vieux binaire. Preuve : nginx `src/core/nginx.c:413,476` @origin/master (`ngx_write_stderr` pour la version et les configure arguments); nginx:1.27.3-alpine, `nginx -V 2>/dev/null | grep -c -- --with-ipv6` = 0.
- L50 ERROR corrigé : `deferred` décrit comme `TCP_DEFER_ACCEPT`, Linux seulement, facultatif et sans lien avec l'IPv6. Preuve : doc ngx_http_core_module (listen, "deferred accept() (the TCP_DEFER_ACCEPT socket option) on Linux"), cité par le fact-check, non re-fetché.
- L52 ERROR corrigé : `default_server` = server block par défaut pour la paire adresse:port, un seul possible. Preuve : nginx:1.27.3-alpine, 2 blocks `listen [::]:80 default_server` : `[emerg] a duplicate default server for [::]:80`.
- L27 OUTDATED corrigé : la vérification `--with-ipv6` est remplacée par une phrase disant que l'IPv6 est automatique depuis 1.11.5. Preuve : nginx `docs/xml/nginx/changes.xml` @origin/master, entrée 1.11.5 (2016-10-11) "the --with-ipv6 configure option was removed"; `auto/options:230-232` (option dépréciée).
- L36 IMPRECISE corrigé : le "un seul block" est expliqué par les options de socket (une fois par adresse:port) et `default_server`; `listen [::]:80;` reste demandé sur chaque vhost qui doit répondre en IPv6. Preuve : nginx:1.27.3-alpine, `ipv6only=on` sur 2 blocks : `[emerg] duplicate listen options for [::]:80`.
- L48 IMPRECISE corrigé : `ipv6only=on` signalé comme valeur par défaut, retiré de la ligne d'exemple. Preuve : `src/http/ngx_http_core_module.c:4149` (`lsopt.ipv6only = 1;`) @origin/master.
- L64 IMPRECISE corrigé : `service nginx restart` remplacé par `nginx -t && systemctl reload nginx`. Preuve : nginx:1.27.3-alpine avec seulement `listen 80`, ajout de `listen [::]:80` puis `nginx -s reload` : `netstat` montre `:::80 LISTEN` et `wget http://[::1]/` répond.

## En plus

- L45 corrigé : typo `[::']` en `[::]`.
- Voir aussi : le libellé du lien vers `installation.md` annonçait "Vérification de la compilation `--with-ipv6`", que cette page ne fait plus (elle dit déjà que l'option est dépréciée, L72). Libellé changé en "Installation de nginx".
- Ajout de `tested_with: "nginx 1.27.3"` (toutes les configs de la page testées sur cette version).

## Modernisation

- Appliquées toutes les deux : plus de vérification de compilation, reload au lieu de restart.

## Tests

- nginx:1.27.3-alpine (Docker/OrbStack) : `nginx -t` sur 3 configs, `nginx -V`, reload avec ouverture de socket IPv6.

## À signaler

- Rien.
