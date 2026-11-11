---
article: docs/linux/cli/motd.md
checked: '2026-11-10'
commit: 5ff50842d608e0cfb6cdcdc1fa0530d30a953d61
sources: []
unpinned: 5
---

# docs/linux/cli/motd.md

## Findings

- L15 ERROR corrigé : `apt-get install update-notifier-common` retiré. Le cron Debian compte désormais les mises à jour via `apt-get -s upgrade` (format `N;M` conservé), et une variante Ubuntu avec `apt-check 2>&1 | tail -n 1` est donnée. Preuve : `docker run debian:13.1 apt-get install update-notifier-common` -> "E: Package 'update-notifier-common' has no installation candidate" ; nouveau cron testé sur debian:12.0 -> `47;9` ; ubuntu:24.04 : apt-check n'écrit rien sur stdout, dernière ligne de stderr `47;42` (précédée d'un warning Python `apt_pkg.init()`, d'où le `tail -n 1`).
- L30 ERROR corrigé : tous les `awk {print $N}` passés en `awk '{print $N}'`, `-F ;` en `-F ';'` (et `cat | awk` simplifié en `awk ... fichier`). Preuve : script original dans debian:13.1 -> "awk: line 2: missing } near end of file", "awk: option -F lacks argument", "{print: command not found".
- L39 ERROR corrigé : `PACKAGE=0`/`SECURITY=0` par défaut et test `[ "${SECURITY:-0}" -gt 0 ] 2>/dev/null`. Preuve : original -> "[: : integer expression expected" ; script corrigé rejoué dans debian:13.1 avec et sans `/var/log/checkupdate.log`, sortie propre dans les 2 cas.
- L18 IMPRECISE corrigé : on vide `/etc/motd` avec `truncate -s 0` et un paragraphe explique que `pam_motd` affiche aussi `/etc/update-motd.d` (désactivable par `chmod -x`). Preuve : debian:13.1 + openssh-server, `/etc/pam.d/sshd:33` `pam_motd.so motd=/run/motd.dynamic`, `/etc/update-motd.d/10-uname` présent ; ubuntu:24.04 : `50-motd-news`, `90-updates-available`, etc.
- L33 IMPRECISE corrigé : ajout d'une phrase : sur Debian, `/var/run/reboot-required` est créé par `/etc/kernel/postinst.d/unattended-upgrades`, donc sans ce paquet le bandeau n'apparaît jamais. Preuve : `dpkg -L unattended-upgrades` sur debian:13.1, le hook fait `touch /var/run/reboot-required`.

## En plus

- L12 : la phrase "un motd qui ressemblera à ça :" était suivie de la commande apt-get, pas d'un exemple. Ajout d'un bloc `text` avec la sortie réelle du script (IP de doc 203.0.113.7, hostname et charges anonymisés).
- Front matter : "au connexion" -> "à la connexion".
- Variable `REBOOT=""` initialisée (évite d'hériter d'une valeur d'environnement).

## Modernisation

- `/etc/update-motd.d` au lieu de `/etc/profile.d` : non appliqué. Le script affiche l'IP SSH (`$SSH_CLIENT`) et le login (`whoami`) de l'utilisateur ; les scripts update-motd.d sont lancés par pam_motd (en root), je n'ai pas vérifié que `SSH_CLIENT` y est disponible. À trancher par l'auteur.
- `apt-get -s upgrade` pour compter les mises à jour : appliqué (cf. L15).

## Tests

- debian:13.1, debian:12.0, ubuntu:24.04 (Docker via OrbStack) ; script profile.d rejoué via `bash -l`.

## À signaler

- Le script `/etc/profile.d/motd.sh` utilise des bashismes (`let`, `echo -e`) : il casse si le login shell est `sh`/dash. Non modifié.
- Le compte "security" côté Debian repose sur le nom de suite `*-security` dans la sortie `apt-get -s` : il ne compte que les paquets venant de `security.debian.org`.
