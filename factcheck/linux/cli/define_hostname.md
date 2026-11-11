---
article: docs/linux/cli/define_hostname.md
checked: '2026-11-10'
commit: 93bd54425bb75cd3bddc821dc8ddeab4dc71cb0d
sources: []
unpinned: 4
---

# docs/linux/cli/define_hostname.md

## Findings

- L64 ERROR corrigé : consigne contradictoire supprimée. Nouvel exemple : `localhost` inchangé, ligne FQDN + alias court sur l'IP fixe (IPv4 et IPv6, IPs de documentation), ou sur `127.0.1.1` sans IP fixe, avec l'explication de l'ordre FQDN puis alias. Preuve : test debian:12.11 (hostname 3.23) : avec `127.0.1.1 warrior.toto.fr warrior`, `-f` = warrior.toto.fr, `-d` = toto.fr ; sans l'alias court sur la ligne, `hostname -f` répond `Name or service not known`.
- L88 ERROR corrigé : `-a` renvoie les alias ; nom court = `hostname -s` ou `hostname`. Preuve : même test, `-a` = `warrior` avec l'alias, vide sans ; `-s` = `warrior` dans les 2 cas.
- L51 IMPRECISE corrigé : `hostname warrior` présenté comme changement à chaud jusqu'au reboot, `/etc/hostname` lu au boot, `hostnamectl hostname` fait les 2. Preuve : page man hostnamectl (freedesktop, "latest") : `hostname [NAME]` change static, transient et pretty par défaut. Le caractère non persistant de `hostname` n'a pas été testé (pas de reboot en conteneur).
- L79 IMPRECISE corrigé : `-d` = FQDN sans le premier segment, échoue avec `Name or service not known` si le FQDN ne résout pas. Preuve : test conteneur avec un /etc/hosts sans ligne pour la machine.

## En plus

- Les 2 lignes `127.0.0.1 warrior.toto.fr` et `IPv4 warrior.toto.fr` coexistaient : un même nom sur 2 IP, la première ligne gagne. L'exemple n'en garde plus qu'une.

## Modernisation

- `hostnamectl` : appliqué, avec la syntaxe `hostnamectl hostname` (verbe documenté dans la page man actuelle). Non testé (pas de systemd dans le conteneur).
- `127.0.1.1` sur Debian : appliqué.

## Tests

- Conteneur debian:12.11 `--hostname warrior`, paquet hostname 3.23, /etc/hosts réécrit dans le conteneur.

## À signaler

- Je n'ai pas vérifié que l'ancien verbe `hostnamectl set-hostname` est encore accepté par les systemd récents ; l'article ne donne que `hostnamectl hostname` (systemd >= 249 selon mes souvenirs, non vérifié). Si l'auteur cible des vieilles distros, ajouter `set-hostname`.
