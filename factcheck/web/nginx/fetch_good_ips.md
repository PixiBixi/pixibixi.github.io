---
article: docs/web/nginx/fetch_good_ips.md
checked: '2026-11-11'
commit: 86e05ab81ffa6b962a9fd612e56c77a37e96658f
sources:
- repo: nginx
  path: src/http/modules/ngx_http_realip_module.c
  lines: 60-67
  ref: origin/HEAD
  commit: d17f1d249d386de1282222172f526973fcd8a702
unpinned: 2
---

# docs/web/nginx/fetch_good_ips.md

## Findings

- L8 IMPRECISE corrigé : description réécrite (Apache derrière nginx, et nginx derrière Cloudflare), et ajout d'une section "Derrière Cloudflare" (realip + plages publiées par Cloudflare) qui justifie le tag Cloudflare et le nom du fichier. Preuve : directives `set_real_ip_from`/`real_ip_header` dans src/http/modules/ngx_http_realip_module.c:60-67 @origin/HEAD du clone nginx ; script testé dans nginx:1.27.3 : 23 lignes générées, `nginx -t` OK.
- L24 IMPRECISE corrigé : précision que `proxy_params` n'existe que sur Debian/Ubuntu, et explication du spoofing possible via `$proxy_add_x_forwarded_for`, neutralisé par mod_remoteip. Preuve : httpd:2.4.62 avec `RemoteIPTrustedProxy 127.0.0.1`, requête `X-Forwarded-For: 6.6.6.6, 1.2.3.4` loggée `a=1.2.3.4`.
- L56 IMPRECISE corrigé : %a et %h donnent tous les deux la vraie IP avec remoteip, l'IP du proxy c'est %{c}a. Preuve : httpd:2.4.62, LogFormat `a=%a h=%h ca=%{c}a` : `a=1.2.3.4 h=1.2.3.4 ca=127.0.0.1`.

## En plus

- L8/L10 corrigé : casse "apache" en "Apache" (titre et prose), "vrais IPs" en "vraies IPs".

## Modernisation

- Appliqué : realip + CF-Connecting-IP + listes ips-v4/ips-v6 de Cloudflare (le script gère l'absence de saut de ligne final des listes, vérifiée avec `od -c`).
- Non appliqué : header `Forwarded` / PROXY protocol, ça changerait toute la conf Apache sans demande.

## Tests

- httpd:2.4.62 (mod_remoteip), nginx:1.27.3 (image officielle, `--with-http_realip_module`).

## À signaler

- Le module realip est compilé dans l'image officielle nginx ; dans le paquet Debian, non vérifié.
- Le titre parle toujours d'Apache alors que le fichier est sous `web/nginx/` : à l'auteur de voir s'il veut renommer ou déplacer.
