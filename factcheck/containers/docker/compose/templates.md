---
article: docs/containers/docker/compose/templates.md
checked: '2026-11-11'
commit: d35296b9892398191d7a113461bbe483060b2c02
sources: []
unpinned: 3
---

# docs/containers/docker/compose/templates.md

## Findings

- L24 OUTDATED corrigé : l'admonition "Deprecated" nomme désormais les 3 images figées (xataz/nginx-php, bixidock/h5ai, xataz/rtorrent-rutorrent) et leur période. Images laissées en place (pas d'équivalent direct vérifié). Preuve : API Docker Hub `last_updated` 2018-06-22, 2017-12-09, 2019-04-08.
- L83 OUTDATED corrigé : `lsiocommunity/organizr` remplacé par `organizr/organizr`, avec `PUID`/`PGID`. Le finding proposait `linuxserver/organizr`, lui aussi abandonné. Preuve : Docker Hub `lsiocommunity/organizr` 2019-02-01, `linuxserver/organizr` 2020-10-04, `organizr/organizr` 2026-10-26 ; sa description donne `-v /config`, `-p 80`, `PUID`/`PGID`.
- L22 IMPRECISE corrigé : chaque bloc commence par `services:` (fragments indentés devenus des fichiers Compose valides), phrase d'intro qui explique l'usage ; sections vides Plex et Let's Encrypt + Reverse Proxy supprimées. Preuve : `docker compose -f cN.yml config -q` OK sur les 4 blocs extraits (Docker Compose v5.1.2).

## En plus

- Aucun.

## Modernisation

- Clé `version:` : rien à faire, aucun bloc ne l'utilise.
- `linuxserver/organizr` : rejeté, image abandonnée depuis 2020, remplacée par `organizr/organizr` (voir plus haut).

## Tests

- Docker Compose v5.1.2 (OrbStack), `config -q` sur les 4 blocs. API Docker Hub.

## À signaler

- `organizr/organizr` n'a pas de tag semver (seulement `latest` et des tags d'architecture), d'où l'absence de version épinglée.
- L'article reste Deprecated avec 3 images mortes : à supprimer ou réécrire, décision de l'auteur.
