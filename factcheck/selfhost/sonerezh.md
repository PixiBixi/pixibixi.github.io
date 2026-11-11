---
article: docs/selfhost/sonerezh.md
checked: '2026-11-10'
commit: 12d9e015bba12017d02823c9e244ee2fd7799421
sources:
- repo: sonerezh
  path: README.md
  lines: 19-35
  ref: 203bfe1
  commit: 203bfe1036da240184b585f16f91c1bf3753de68
- repo: sonerezh
  path: docs/user-guides/nginx-server-block.md
  lines: '25'
  ref: 203bfe1
  commit: 203bfe1036da240184b585f16f91c1bf3753de68
- repo: sonerezh
  path: app/Controller/SongsController.php
  lines: 640-643
  ref: 203bfe1
  commit: 203bfe1036da240184b585f16f91c1bf3753de68
unpinned: 5
---

# docs/selfhost/sonerezh.md

## Findings

- L51 ERROR corrigé : `GRANT ... IDENTIFIED BY password` remplacé par `CREATE USER 'sonerezh'@'localhost' IDENTIFIED BY 'password'` puis `GRANT`, avec une phrase d'explication. Preuve : test mysql:8.4.7 : l'ancienne syntaxe (même avec le mot de passe quoté) -> `ERROR 1064 ... near 'IDENTIFIED BY 'pw''` ; la nouvelle -> `SHOW GRANTS` OK.
- L63 ERROR corrigé : ajout de `composer install` après le clone, Composer ajouté aux pré-requis. Preuve : sonerezh README.md:19-35 @203bfe1 ; composer.json `vendor-dir: app/Vendor/` ; `app/Vendor` absent du dépôt ; les archives de la doc officielle (`https://www.sonerezh.bzh/downloads/latest.tar.gz` et `.zip`) répondent 404 le 2026-11-09, d'où le clone.
- L98 ERROR corrigé : regex remplacée par celle de la doc upstream `/([^/]+_[0-9]+x[0-9]+(@[0-9]+x)?\.[a-z]+)$`. Preuve : sonerezh docs/user-guides/nginx-server-block.md:25 @203bfe1 ; test nginx:1.29.3 : l'ancienne config -> `[emerg] unexpected "/"` (nginx ne démarre pas), la nouvelle -> `cover_100x100.jpg` servi depuis img/resized, autre chemin -> fallback.
- L38 OUTDATED corrigé : libav-tools remplacé par ffmpeg, avec la raison. Preuve : app/Controller/SongsController.php:640-643 @203bfe1 ; test debian:13.1 : `libav-tools Candidate: (none)`, `ffmpeg Candidate: 7:7.1.5-0+deb13u1`.
- L41 OUTDATED corrigé : paragraphe PHP 7/CakePHP 2.8 réécrit : 1.2.6 s'arrête à PHP 7.3, plante en PHP 8, PHP 7.3 dispo via Sury (lien vers l'article). Preuve : commit 85ff489 « Update CakePHP to support PHP 7.3 (fix #372) » ; composer.lock cakephp 2.10.19 ; test : `composer install` puis serveur PHP intégré : php:7.3-cli -> `302` vers la page « Installers », php:8.2-cli -> `500`, app/tmp/logs/error.log `Uncaught Error: Unknown named parameter $subject in .../ObjectCollection.php:129` ; Packages.gz Sury trixie contient php7.3-fpm et php7.4-fpm.
- L83 OUTDATED corrigé : `listen 443 ssl http2` -> `listen 443 ssl` + `http2 on;` avec un commentaire pour nginx < 1.25.1. Preuve : nginx docs/xml/nginx/changes.xml:2675-2684 (1.25.1) ; test nginx:1.29.3 : warning `the "listen ... http2" directive is deprecated` sur l'ancienne config, aucun sur la nouvelle.
- L11 IMPRECISE corrigé : « archivé depuis 2019 » remplacé par « plus de commit ni release depuis la 1.2.6 de septembre 2019, pas archivé », plus la mention PHP 8. Preuve : `gh api repos/Sonerezh/sonerezh` -> `archived: false` ; dernier commit 203bfe1 2019-09-29 « Release 1.2.6 ».
- L29 IMPRECISE corrigé : « presque 450 stars » -> « plus de 750 stars ». Preuve : `gh api` -> `stargazers_count: 772`.

## En plus

- Rien.

## Modernisation

- Navidrome : déjà cité dans le warning, rien à faire.

## Tests

- php:7.3-cli, php:8.2-cli, composer:2.8.12 (sur une copie `git archive` du dépôt, dans le scratchpad, supprimée ensuite) ; nginx:1.29.3 ; mysql:8.4.7 ; debian:13.1.

## À signaler

- Le PHP 7.3 requis est hors support depuis fin 2021 : l'article pourrait aller plus loin et déconseiller l'install (le warning pousse déjà vers Navidrome/Koel). À trancher par l'auteur.
- PHP 7.4 non testé, seul 7.3 l'a été.
