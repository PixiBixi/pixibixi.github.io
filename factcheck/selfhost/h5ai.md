---
article: docs/selfhost/h5ai.md
checked: '2026-11-11'
commit: b90965c22f916e28a3946e5959ead4e6f46eebd9
sources: []
unpinned: 4
---

# docs/selfhost/h5ai.md

## Findings

- L16 OUTDATED corrigé : "PHP 7.0 minimum pour la 0.30.0 (PHP 5.5 suffisait jusqu'à la 0.29.2)". Preuve : lrsjng/h5ai `src/_h5ai/public/index.php` L4, `MIN_PHP_VERSION` = '5.5.0' @v0.28.1 et @v0.29.2, '7.0.0' @v0.30.0.
- L38 OUTDATED corrigé : téléchargement passé à `https://github.com/lrsjng/h5ai/releases/download/v0.30.0/h5ai-0.30.0.zip`, `unzip` aligné, lien "dernières versions" remplacé par les releases GitHub avec la mention que `release.larsjung.de` a un certificat invalide. Preuve : `gh api repos/lrsjng/h5ai/releases` (v0.30.0 publiée 2024-11-09, dernière release) ; `curl https://release.larsjung.de/h5ai/` exit 60 (certificat sans le bon nom) ; `https://larsjung.de/h5ai/` redirige vers github.com/lrsjng/h5ai ; le zip se télécharge (200, 131803 octets) et contient bien `_h5ai/` à la racine.
- L68 OUTDATED corrigé : `listen 443 ssl; listen [::]:443 ssl; http2 on;`, avec une phrase pour garder l'ancienne syntaxe avant nginx 1.25.1. Preuve : `nginx -t` sous nginx:1.27.3, l'ancienne syntaxe donne `[warn] the "listen ... http2" directive is deprecated, use the "http2" directive instead`, la nouvelle passe sans warning.
- L84 IMPRECISE rejeté : le renommage `_h5ai` en `.h5ai` fonctionne, h5ai calcule ses chemins depuis `__FILE__` et `SCRIPT_NAME`, pas depuis un nom en dur. Preuve : `src/_h5ai/private/php/core/class-setup.php` @v0.30.0 L98-107 (`H5AI_HREF = dirname(dirname($script_name))`, `H5AI_PATH = dirname(...(__FILE__))`) ; test nginx:1.27.3 + php:8.3-fpm avec `.h5ai` et `index ... /.h5ai/public/index.php` : `/` et `/sub/` renvoient "powered by h5ai v0.30.0" et listent `a.txt` et `sub/`.

## En plus

- L90 "autoindex on est cruciale" faux : h5ai fait le listing lui-même via le fallback `index ... /.h5ai/public/index.php`, l'autoindex ne se déclenche jamais. `autoindex on;` retiré de la config et la phrase réécrite sur la ligne `index`. Preuve : même test Docker, sans `autoindex`, listing complet servi par h5ai.
- L15 "disponible pour tous les serveurs web" précisé en "Apache, lighttpd et nginx". Preuve : README.md @origin/master L5 ("A modern HTTP web server index for Apache httpd, lighttpd, and nginx").
- Coquille "Celui- ci" corrigée dans la phrase réécrite.

## Modernisation

- Appliqué : téléchargement depuis les releases GitHub (0.30.0).

## Tests

- nginx:1.27.3 (`nginx -t`, certificat autosigné), nginx:1.27.3 + php:8.3-fpm (PHP 8.3.36) avec h5ai-0.30.0.zip. Conteneurs et réseau supprimés.

## À signaler

- `tested_with` ajouté : "h5ai 0.30.0", "nginx 1.27", "PHP 8.3", les versions testées dans ce passage.
- La config cite `rutorrent_passwd` et des includes perso (`cache.conf`, `php.conf`...) non fournis : laissé tel quel.
