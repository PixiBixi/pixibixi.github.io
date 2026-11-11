---
article: docs/web/nginx/php_custom_version.md
checked: '2026-11-11'
commit: 11fac05faf03d578a19755ff7f39bb72cb58c0dd
sources: []
unpinned: 4
---

# docs/web/nginx/php_custom_version.md

## Findings

- L3 ERROR rejeté : packages.sury.org/php publie bien des suites Ubuntu et la méthode marche sur Ubuntu ; la description « Debian/Ubuntu » reste vraie. Nuance ajoutée dans l'article : sur Ubuntu, Sury documente plutôt `ppa:ondrej/php`. Preuve : `curl https://packages.sury.org/php/dists/noble/InRelease` -> `Suite: noble`, Packages amd64/arm64 ; test ubuntu:24.04 avec la méthode keyring -> `php8.4-fpm Candidate: 8.4.27-1+0~20261021.57+ubuntu24.04~1` ; deb.sury.org : « packages.sury.org/php - the main PHP repository for Debian », section « Ubuntu PPA ».
- L17 OUTDATED corrigé : bloc remplacé par la méthode du README officiel (paquet `debsuryorg-archive-keyring` + `signed-by`). Preuve : <https://packages.sury.org/php/README.txt> (lu le 2026-11-09) ; test debian:13.1 -> apt update OK, candidats php8.2/8.4/8.5-fpm.
- L24 OUTDATED corrigé : exemple passé en `php8.4-fpm`, phrase sur le support (8.2 sécurité jusqu'au 31/12/2026, 8.4 fin 2028, 8.5 fin 2029). Preuve : <https://www.php.net/supported-versions.php> (lu le 2026-11-09) : 8.2 `31 Dec 2024 / 31 Dec 2026`, 8.4 `31 Dec 2026 / 31 Dec 2028`, 8.5 `31 Dec 2027 / 31 Dec 2029`.
- L16 IMPRECISE corrigé : `curl` installé dans le bloc (wget abandonné, le README utilise curl), `apt-transport-https` retiré (paquet de transition inutile depuis apt 1.5, suivi du README). Preuve : test debian:13.1 -> `command -v wget curl` ne renvoie rien.

## En plus

- L10 : `!!! warning Article déprécié` sans guillemets : « Article » et « déprécié » étaient pris comme classes CSS et le titre affiché était « Warning ». Corrigé en `!!! warning "Article déprécié"` (syntaxe documentée dans AGENTS.md).

## Modernisation

- Keyring sury + signed-by : appliqué.
- Ubuntu ppa:ondrej/php : mentionné en une phrase (non testé sur Ubuntu).
- PHP 8.4/8.5 : appliqué (8.4 dans la commande).

## Tests

- debian:13.1 et ubuntu:24.04 : installation du keyring, source signed-by, `apt-get update`, `apt-cache policy` (pas d'installation de php-fpm).

## À signaler

- Le paquet `debsuryorg-archive-keyring` dépose aussi `/etc/apt/trusted.gpg.d/debsuryorg-archive.gpg` (vu dans `dpkg -L` sur Debian 13) : la clé reste de confiance globale même avec `signed-by`. L'argument de docs/web/php/sury.md:57 (« Avec signed-by, la clé ne vaut que pour la source qui la cite ») est donc à nuancer.
- docs/web/php/sury.md:16 et :46 décrivent cet article comme utilisant la méthode `trusted.gpg.d` : à mettre à jour (fichier hors de mon lot, non modifié).
- L'admonition « Article déprécié » a moins de sens maintenant que la méthode est à jour : à retirer ou garder, au choix de l'auteur.
