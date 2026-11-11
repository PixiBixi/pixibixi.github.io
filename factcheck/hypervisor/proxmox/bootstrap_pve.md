---
article: docs/hypervisor/proxmox/bootstrap_pve.md
checked: '2026-11-11'
commit: 09132644fe546270a1ad1a96760d56243df9eafa
sources:
- repo: proxmox-widget-toolkit
  path: src/Utils.js
  lines: '618'
  ref: origin/master
  commit: f16878a7e863e902b6f243f88594f53b8c0fffe2
- repo: pve-docs
  path: certificate-management.adoc
  lines: 148-160
  ref: origin/master
  commit: e67813a5deae705d5869d613fa2c73be89b6cb0b
unpinned: 3
---

# docs/hypervisor/proxmox/bootstrap_pve.md

## Findings

- L42 OUTDATED corrigé : motif du sed passé à `function ?\(orig_cmd\)`, ajout d'un `cmp` contre le `.bak` pour voir quand rien n'a été modifié, et mention que la pop-up revient à chaque mise à jour de `proxmox-widget-toolkit`. Preuve : `src/Utils.js:618 @origin/master (f16878a)` = `checked_command: function (orig_cmd) {` ; espace introduit par 768dbfb (2025-06-17), juste avant le bump 5.0.0 trixie (ae9c379) ; `proxmoxlib.js` est un simple `cat` des sources (`src/Makefile:149-153`). Test GNU sed 4.10 sur les deux versions de Utils.js : ancien motif = inchangé sur la nouvelle source, nouveau motif = modifié sur les deux.
- L51 OUTDATED corrigé : `cpufrequtils` remplacé par `linux-cpupower` + un service systemd oneshot `cpupower frequency-set -g performance`. Preuve : sources.debian.org API, cpufrequtils 008-2 seulement en bullseye/bookworm ; debian:trixie `apt-cache policy cpufrequtils` = Candidate (none), `linux-cpupower 6.12.116-1` s'installe ; présent aussi en bookworm (6.1.190-1) ; unit validée par `systemd-analyze verify` (systemd 257).
- L2 IMPRECISE corrigé : ajout d'une section "Dépôts sans abonnement" (PVE 9, deb822) : `Enabled: no` sur `pve-enterprise.sources` via `sed -i '/^Types:/a Enabled: no'`, et `proxmox.sources` no-subscription. Preuve : `pve-package-repos.adoc @origin/master` (pve-docs) l.104-124 et 135-145 ; test debian:trixie : avant le sed apt contacte enterprise.proxmox.com, après le sed 0 ligne enterprise dans `apt-get update`.
- L48 IMPRECISE corrigé : "driver performance" devient "governor `performance`". Preuve : la commande elle-même (`frequency-set -g`, `GOVERNOR=`), terminologie cpufreq.
- L61 IMPRECISE corrigé : précision que la validation `http-01` par défaut exige le port 80 du node joignable depuis Internet et libre, sinon plugin DNS. Guillemet fermant ajouté à `DOMAIN=`. Preuve : `certificate-management.adoc:148-160 @origin/master` (pve-docs).

## En plus

- L71 : `Enter selection: 1` sélectionnait **Let's Encrypt V2 Staging** (cf. la liste juste au-dessus), donc un certificat non reconnu par les navigateurs. Passé à `0`. Preuve : la sortie de l'article elle-même (`0) Let's Encrypt V2`, `1) Let's Encrypt V2 Staging`).

## Modernisation

- deb822 / `Enabled: no` : appliqué (voir ci-dessus). `apt modernize-sources` : non appliqué, une install PVE 9 est déjà en deb822.
- cpupower : appliqué.
- Pop-up à rejouer après mise à jour : appliqué en une phrase ; hook APT `Post-Invoke` non ajouté (non testé).

## Tests

- GNU sed 4.10 (gsed) sur proxmox-widget-toolkit `src/Utils.js` avant/après 768dbfb.
- Docker debian:trixie-20251020 (apt, linux-cpupower, systemd 257, deb822 Enabled: no), debian:bookworm-20241016 (linux-cpupower dispo).
- Pas de node Proxmox : pveum, pvenode, pveproxy non testés. Pas de `tested_with`.

## À signaler

- La section dépôts est écrite pour PVE 9 (trixie, deb822). Sur PVE 8, c'est l'ancien format `.list` : à préciser si l'auteur a encore des nodes en 8.
- Le `ceph.sources` en enterprise n'est cité que "s'il pointe sur enterprise.proxmox.com" : je n'ai pas confirmé qu'il existe par défaut sur une install fraîche.
- Rejouer le sed deux fois insère deux fois `orig_cmd(); return;` (sans effet visible mais pas idempotent).
