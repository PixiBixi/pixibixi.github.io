---
article: docs/linux/misc/autoupgrade.md
checked: '2026-11-10'
commit: 9311a6c4fa42c4f4a821207b3c4800b5bc36747c
sources:
- repo: mvo5-unattended-upgrades
  path: unattended-upgrade
  lines: '2606'
  ref: origin/main
  commit: 480400c61350addca90c51fd74f23295bfba1f85
- repo: mvo5-unattended-upgrades
  path: data/50unattended-upgrades.Debian
  lines: 30-34
  ref: 480400c
  commit: 480400c61350addca90c51fd74f23295bfba1f85
- repo: mvo5-unattended-upgrades
  path: debian/postinst
  lines: 62-67
  ref: 480400c
  commit: 480400c61350addca90c51fd74f23295bfba1f85
unpinned: 3
---

# docs/linux/misc/autoupgrade.md

## Findings

- L46 ERROR corrigé : `unattended-upgrades-dpkg_<date>_<heure>.log` devient `unattended-upgrades-dpkg.log`, un seul fichier en append. Preuve : unattended-upgrade:2606 @origin/main 480400c (`'unattended-upgrades-dpkg.log'`), :736 (`O_APPEND`) ; test bookworm, `ls /var/log/unattended-upgrades/` = `unattended-upgrades-dpkg.log unattended-upgrades.log`.
- L55 OUTDATED corrigé : lien How To Forge (Debian squeeze) retiré. Preuve : `curl -sL` = 403.
- L16 IMPRECISE corrigé : la phrase dit maintenant que l'outil applique des correctifs déjà publiés et ne protège pas d'une 0day. Preuve : raisonnement (l'outil installe des paquets publiés dans les dépôts), pas de source à citer.
- L19 IMPRECISE corrigé : ajout de la portée par défaut (stable + Debian-Security, `-updates`/backports/tiers via `Origins-Pattern`). Preuve : data/50unattended-upgrades.Debian:30-34 @480400c ; test bookworm `unattended-upgrade --dry-run -d` : "Allowed origins are: origin=Debian,codename=bookworm,label=Debian, ...label=Debian-Security, ...bookworm-security...".
- L29 IMPRECISE corrigé, mais dans le sens inverse du fact-check : sur Debian, l'installation active déjà les mises à jour. La question debconf est de priorité low (pas posée) et son défaut est `true`, donc le postinst crée `20auto-upgrades`. La phrase "pas activées par défaut" est remplacée. Preuve : debian/config:19 (`db_input low`), debian/templates:10-12 (`Default: true`), debian/postinst:62-67 @480400c ; test : `DEBIAN_FRONTEND=noninteractive apt-get install unattended-upgrades` sur debian:bookworm (2.9.1+nmu3) et debian:trixie (2.12) crée `/etc/apt/apt.conf.d/20auto-upgrades` avec `Update-Package-Lists "1"` et `Unattended-Upgrade "1"`.
- L54 IMPRECISE corrigé : lien vers <https://wiki.debian.org/PeriodicUpdates>. Preuve : WebFetch de UnattendedUpgrades, page "PeriodicUpdates" avec "Redirected from page UnattendedUpgrades" (curl bloqué par un challenge anti-bot).

## En plus

- L36-39 : "Voici l'écran que vous allez avoir :" pointait vers une image absente ; remplacé par le texte de la question debconf. Preuve : debian/templates:13 ("Automatically download and install stable updates?").
- Ajout `tested_with` : unattended-upgrades 2.9 (Debian 12) et 2.12 (Debian 13).

## Modernisation

- Timers `apt-daily.timer` / `apt-daily-upgrade.timer` + `systemctl list-timers 'apt-daily*'` : appliqué (units présentes dans /lib/systemd/system sur bookworm ; `list-timers` non lancé, pas de systemd dans le conteneur).
- `unattended-upgrade --dry-run -d` : appliqué, testé sur bookworm.
- needrestart : non appliqué, hors sujet de l'article court.

## Tests

- OrbStack, debian:bookworm-20251020 (unattended-upgrades 2.9.1+nmu3), debian:trixie-20251020 (2.12). curl sur les 5 liens.

## À signaler

- Le fact-check disait "vrai sur Debian" pour "pas activé par défaut" : le test montre le contraire sur Debian 12 et 13, l'article dit maintenant que c'est activé à l'installation.
- Ubuntu non traité (article centré Debian).
