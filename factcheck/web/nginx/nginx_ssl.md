---
article: docs/web/nginx/nginx_ssl.md
checked: '2026-11-11'
commit: dc257023211cf279f81d48e8178e9614778eded8
sources: []
unpinned: 2
---

# docs/web/nginx/nginx_ssl.md

## Findings

- L3 IMPRECISE corrigé : l'article contient maintenant un server-block 443 minimal (certificat, `ssl_protocols TLSv1.2 TLSv1.3`, HSTS), la description est donc juste. Preuve : testé dans nginx:1.27.3 avec un certificat autosigné : 200 en HTTPS, header `Strict-Transport-Security: max-age=63072000`, TLS 1.1 refusé, TLS 1.3 OK. Valeurs reprises de <https://ssl-config.mozilla.org/guidelines/latest.json> v6.0 (intermediate : TLSv1.2/TLSv1.3, hsts_min_age 63072000).
- L11 IMPRECISE corrigé : le `return 301` est montré dans un server-block `listen 80` complet, avec la mise en garde sur la boucle s'il est mis dans le 443. Preuve : même test, `http://.../foo?x=1` répond 301 `Location: https://example.com/foo?x=1`.

## En plus

- "nécéssaire" en "nécessaires", "il suffit simplement" simplifié.

## Modernisation

- Appliqué : HSTS et protocoles du profil intermediate Mozilla, avec une phrase d'avertissement sur la durée de HSTS et un lien vers le générateur.
- `variables:` ajouté (`domain`, défaut example.com), `tested_with: nginx 1.27`.

## Tests

- nginx:1.27.3, curl dans le conteneur.

## À signaler

- Chemins de certificat en `/etc/letsencrypt/live/<domain>/` (Certbot) : choix de l'exemple, à adapter si l'auteur préfère un autre emplacement.
