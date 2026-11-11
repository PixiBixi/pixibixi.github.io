---
article: docs/selfhost/ajenti.md
checked: '2026-11-10'
commit: 3324dab219d8ede022c05ba2d660a5fe1e3a0c33
sources:
- repo: ajenti
  path: scripts/install-venv.sh
  lines: '118'
  ref: origin/master
  commit: d9ada8968316853bc1c151bccaafb3da92455869
- repo: ajenti
  path: docs/source/man/run.rst
  lines: '21'
  ref: origin/master
  commit: d9ada8968316853bc1c151bccaafb3da92455869
unpinned: 2
---

# docs/selfhost/ajenti.md

## Findings

- L9 ERROR corrigé : bandeau "Projet abandonné" supprimé, Cockpit gardé en une ligne comme alternative packagée. Preuve : `~/Documents/work/src/ajenti`, tag v2.2.18 du 2026-10-25, dernier commit `d9ada8968` du 2026-11-01 sur origin/master.
- L33 ERROR corrigé : étape `apt-get install ajenti` supprimée, la phrase "packages Debian assez vieux" remplacée par "Ajenti n'est pas dans les dépôts". Preuve : `apt-cache search ajenti` vide sur debian:13.1 et ubuntu:24.04 ; `scripts/install-venv.sh:118@origin/master` installe `ajenti-panel` via pip.
- L37 ERROR corrigé : accès en HTTPS sur 8000, login root + mot de passe root du système (auth OS), plus de "admin". Preuve : `docs/source/man/run.rst:21@origin/master` ; install testée : `/etc/ajenti/config.yml` -> `auth.provider: os`, `bind.port: 8000`, `ssl.certificate: /etc/ajenti/ajenti.pem`, message final "Log in with your root password or another OS user". Certificat auto-signé : `ajenti-panel/ajenti-ssl-gen:39-40` (`set_issuer(get_subject())`).
- L25 OUTDATED corrigé : `install.sh` remplacé par `install-venv.sh`. Preuve : `docs/source/man/install.rst@origin/master` ("recommended method ... externally managed environment ... Debian 12 and above, Ubuntu 24.04 and above") ; `scripts/install.sh:3` affiche "not recommended anymore" ; `install-venv.sh` lancé sur debian:13.1 -> rc=0, `ajenti-panel 2.2.18` dans `/opt/ajenti`.

## En plus

- Aucun.

## Modernisation

- install-venv.sh : appliqué (cf. L25).

## Tests

- debian:13.1 : `install-venv.sh` complet (rc=0, ajenti-panel 2.2.18). ubuntu:24.04 : recherche apt seulement.

## À signaler

- `install-venv.sh` échoue (rc=1, "/opt/ajenti/bin/python3: No such file or directory") si `python3` n'est pas installé avant : il calcule `PYTHON3=$(which python3)` avant d'installer ses dépendances. Sans impact sur un serveur classique (python3 présent), mais un `apt-get install python3` préalable rendrait la commande sûre sur une image minimale. Non ajouté à l'article.
- La capture `_img/ajenti_dashboard.webp` date probablement d'Ajenti 1 : non vérifiée, à refaire si l'auteur veut coller à la v2.
- "Vesta" (VestaCP) dans l'intro n'est plus maintenu depuis des années ; laissé tel quel (non vérifié ici).
