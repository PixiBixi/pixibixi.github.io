---
article: docs/web/php/sury.md
checked: '2026-11-11'
commit: 5e24e6f0f398d59c26f299e3aca0b1ecdf219782
sources:
- repo: php-php-src
  path: sapi/fpm/fpm/fpm_process_ctl.c
  lines: 78-107
  ref: origin/PHP-8.3
  commit: f35ed4fb5cf44ef9ecc48e105b6a53b590d54f0b
- repo: ansible
  path: lib/ansible/modules/apt.py
  lines: 29-32,136-140
  ref: origin/devel
  commit: fd540eda9f96783955b227e84e229ca51f041cae
- repo: ansible
  path: lib/ansible/modules/deb822_repository.py
  lines: 114-118
  ref: origin/devel
  commit: fd540eda9f96783955b227e84e229ca51f041cae
unpinned: 6
---

# docs/web/php/sury.md

## Findings

- L28 ERROR corrigé : le fingerprint n'apparaît pas dans un champ `Signed-By` du `InRelease` (le fichier ne porte que Origin, Suite, Codename, Date, Architectures, Components et les sommes de contrôle). Le fingerprint `15058500A0235D97F5D10063B188E2B695BD4743` se lit avec `gpg --show-keys` sur le keyring du paquet `debsuryorg-archive-keyring` ou sur `apt.gpg`. Même erreur aux lignes 232 (garde-fou sur le bootstrap de la clé). Preuve : `packages.sury.org/php/dists/bookworm/InRelease` (0 occurrence de `Signed-By`, relevé le 2026-11-11)
- L16 OUTDATED corrigé : l'article lié `php_custom_version.md` n'utilise plus `trusted.gpg.d` depuis le fix du 2026-11-11, il cite le paquet keyring et `signed-by`. Reformuler en "l'ancienne méthode `trusted.gpg.d`, encore répandue" sans la prêter à l'article lié. Preuve : docs/web/nginx/php_custom_version.md:13-20 @ origin/master (11fac05f)
- L46 OUTDATED corrigé : "l'ancienne méthode de l'article lié plus haut" et "à la même adresse que l'ancien guide" supposent la même chose, à reformuler pareil. L'URL `https://packages.sury.org/php/apt.gpg` répond bien 200 et porte la clé attendue. Preuve : docs/web/nginx/php_custom_version.md:13-20 @ origin/master (11fac05f)

## Unpinned

- L24-25, L28 : message `EXPKEYSIG B188E2B695BD4743 ...` et expiration de la clé, le fingerprint concorde avec la clé du keyring (RSA 3072, expire le 2028-02-04), mais le message exact d'apt n'a pas été rejoué
- L37, L40, L59-66 : README `https://packages.sury.org/php/README.txt` et paquet `debsuryorg-archive-keyring.deb` (version 2025.11.18) relevés par curl le 2026-11-11, source web sans commit
- L57 : recommandation `signed-by` de la page wiki Debian DebianRepository/UseThirdParty (page wiki, sans commit), conforme
- L93 : présence de `libgd3`, `libmemcached11` et `libpcre3` dans l'index `bookworm`, confirmée dans l'index du 2026-11-10 (l'article cite celui du 25 octobre, non rejouable)
- L105, L126-130 : comportement des priorités apt (100 contre 500) et commande de lecture de `Packages.xz` (version `8.3.36-1+0~20261021...` relevée), non rejoués dans un apt réel
- L177 : `postinst` de `php8.3-fpm` (restart via `invoke-rc.d`) et `ExecReload=/bin/kill -USR2 $MAINPID` lus dans le `.deb` du dépôt le 2026-11-11, source sans commit
