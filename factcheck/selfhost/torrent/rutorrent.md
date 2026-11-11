---
article: docs/selfhost/torrent/rutorrent.md
checked: '2026-11-11'
commit: 90bebda734a12398ecc147217071f31bc75dea7d
sources: []
unpinned: 5
---

# docs/selfhost/torrent/rutorrent.md

## Findings

- L15 OUTDATED corrigé : `xataz/rtorrent-rutorrent:latest-filebot` remplacé par `crazymax/rtorrent-rutorrent:5.3.18-0.16.25` (tag versionné), volumes `/downloads`, `/data`, `/passwd`, env `PUID`/`PGID`/`RT_INC_PORT`/`RT_DHT_PORT`. Preuve : `gh api repos/xataz/docker-rtorrent-rutorrent` archived=true, pushed 2020-01-16 ; Docker Hub last_updated 2019-04-08 ; crazy-max/docker-rtorrent-rutorrent non archivé, push 2026-10-25, README `@3403a60` l.112-189 (env, volumes, ports) ; test compose ci-dessous.
- L36 OUTDATED corrigé : `lsiocommunity/organizr` remplacé par l'image officielle `organizr/organizr:latest` (volume `/config`, port 80, `PUID`/`PGID`). Preuve : Docker Hub lsiocommunity/organizr last_updated 2019-02-01, linuxserver/docker-organizr archived "DEPRECATED" ; organizr/docker-organizr README `@cd80d05` l.15-34 ; Docker Hub organizr/organizr latest 2026-10-26.
- L18 IMPRECISE rejeté : `/root/.apps/USER/...` est la convention de chemins de l'auteur, pas une erreur ; gardé (avec `<user>` en variable). Preuve : aucune, c'est un choix d'organisation.
- L21 IMPRECISE corrigé : `$UID` était interpolé par Compose (vide si non exporté). Remplacé par des variables de page `<user>`, `<n>`, `<domain>` (front matter `variables:`), le bloc est copiable une fois les valeurs saisies. Preuve : comportement d'interpolation Compose ; plus de `$` dans le bloc.
- L25 IMPRECISE corrigé : `WEBROOT`, `PORT_RTORRENT`, `UID/GID` étaient propres à l'image xataz, supprimés avec elle. Les `VIRTUAL_*`/`LETSENCRYPT_*` sont gardés et explicités : ils sont lus par nginx-proxy et son compagnon ACME, pas par l'image.

## En plus

- Ajout de la création du htpasswd ruTorrent (`/passwd/rutorrent.htpasswd`) : sans lui, ruTorrent répond 200 sans authentification (testé). Preuve : README crazymax l.250-262 ; `curl http://127.0.0.1:18080/` = 200 sans auth.
- Ajout de `services:` en tête du bloc (le fragment n'était pas un YAML compose complet) et des `ulimits` nofile de l'exemple officiel.
- Bullet sur la propriété des volumes (`PUID`/`PGID`). Preuve : README crazymax l.178-181.

## Modernisation

- crazymax/rtorrent-rutorrent : appliqué. linuxserver/rutorrent non retenu (un seul choix suffit).
- Organizr v2 officiel : appliqué.

## Tests

- Docker compose (`config -q` OK) avec crazymax/rtorrent-rutorrent:5.3.18-0.16.25 et organizr/organizr:latest, valeurs user=jdoe n=1 : ruTorrent HTTP 200, Organizr HTTP 200, process rtorrent en uid 1001, `.rtlocal.rc` = `network.listen.port.range.set = 45001-45001`, `dht.override_port.set = 46001`. nginx-proxy/ACME non testés. `tested_with: crazymax/rtorrent-rutorrent 5.3.18-0.16.25` ajouté.

## À signaler

- Organizr ne publie que `latest` (pas de tag semver) : impossible de pinner une version, contrairement à la règle "jamais latest" du repo.
- Le DHT passe sur un port UDP séparé (`4600<n>`) : l'image crazymax sépare incoming TCP et DHT UDP, contrairement à xataz qui utilisait le même port. Règles firewall à adapter.
- Le schéma `<n>` = dernier chiffre de l'UID limite à 10 users ; repris de l'article d'origine.
