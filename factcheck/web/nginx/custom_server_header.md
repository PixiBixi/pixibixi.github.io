---
article: docs/web/nginx/custom_server_header.md
checked: '2026-11-10'
commit: b8e12240cd50eadaec15fd327ea2b143f1cd22cf
sources:
- repo: nginx
  path: src/http/v3/ngx_http_v3_filter_module.c
  lines: 166-172
  ref: origin/master
  commit: d17f1d249d386de1282222172f526973fcd8a702
unpinned: 4
---

# docs/web/nginx/custom_server_header.md

## Findings

- L38 ERROR corrigé : `more_set_headers 'Server: MyServer';` quoté, avec une phrase sur l'effet sans quotes. Le constat du fact-check est faux sur le symptôme : `nginx -t` ne plante pas, mais le header Server disparaît au lieu d'être remplacé. Preuve : test debian:bookworm (nginx 1.22.1, headers-more 0.34-3) : non quoté, `nginx -t` OK et la réponse n'a plus de header Server ; quoté, `Server: MyServer`. README.markdown:47 de headers-more.
- L21 OUTDATED corrigé en partie : les chaînes sont maintenant `static u_char`, vers les lignes 50-52, et il y en a 3 (ajout de `ngx_http_server_build_string`). Le fact-check se trompe en disant que `ngx_http_server_full_string` n'existe plus : elle est toujours là ligne 51. Le bloc liste les 3 chaînes et dit laquelle sert pour `server_tokens off/on/build`. Preuve : src/http/ngx_http_header_filter_module.c:50-52 et 291-298 @origin/master (1.31.9).
- L10 IMPRECISE corrigé : PHP retiré de la phrase sur Server, ajout d'un paragraphe sur `X-Powered-By` / `expose_php`. Preuve : test bookworm nginx + php8.2-fpm, réponse `Server: nginx/1.22.1` sans version PHP ; `expose_php = Off` dans /etc/php/8.2/fpm/php.ini et php.ini-production de Debian, `On` dans php.ini-development.
- L37 IMPRECISE corrigé : phrase ajoutée, `server_tokens off` laisse `Server: nginx`. Commentaire `# removed pound sign` retiré. Preuve : test bookworm, `server_tokens off` seul donne `Server: nginx` ; ngx_http_header_filter_module.c:50.

## En plus

- Le patch du fichier header_filter ne couvre que HTTP/1.x : HTTP/2 et HTTP/3 ont leur propre chaîne Server (ajout d'une phrase). Preuve : src/http/v2/ngx_http_v2_filter_module.c:123-131, src/http/v3/ngx_http_v3_filter_module.c:166-172 @origin/master. Non testé en build.
- Fence du bloc C passé de `bash` à `c` (commentaire `//`).
- Ajout `tested_with` : nginx 1.22 (Debian 12), headers-more 0.34.

## Modernisation

- `libnginx-mod-http-headers-more-filter` au lieu de `nginx-extras` : appliqué, testé sur bookworm.
- "Depuis nginx 1.23.4, server_tokens off suffit" : rejeté, `server_tokens off` masque la version depuis toujours, rien de spécifique à 1.23.4 ; l'intérêt du module (changer le nom) est déjà dit dans l'article.

## Tests

- OrbStack, debian:bookworm-20251020 : nginx-light 1.22.1-9+deb12u10, libnginx-mod-http-headers-more-filter 1:0.34-3, php8.2-fpm.

## À signaler

- Rien.
