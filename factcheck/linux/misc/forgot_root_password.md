---
article: docs/linux/misc/forgot_root_password.md
checked: '2026-11-11'
commit: 725b92e46bef6f777fd21a671f99477b42819380
sources:
- repo: systemd-systemd
  path: man/poweroff.xml
  lines: 94-103
  ref: origin/main
  commit: 3fe693dd946e5ae21e33d0b6ade91ed67ca9489a
unpinned: 3
---

# docs/linux/misc/forgot_root_password.md

## Findings

- L11 IMPRECISE corrigé : la procédure (E puis Ctrl+X, `init=/bin/bash`) était juste, j'ai ajouté ses limites dans l'intro : accès console requis, bloquée si GRUB a un mot de passe, et la passphrase LUKS reste demandée sur un disque chiffré. Preuve : gnu-grub docs/grub.texi:3259 et linux kernel-parameters.txt (cités par le fact-check, non relus), le reste est le fonctionnement connu de GRUB et LUKS, non testé.
- L20 IMPRECISE corrigé :
  - étape 5 ajoutée : `sync` puis `reboot -f`, ou `exec /sbin/init`. Preuve : systemd man/poweroff.xml:94-103 @origin/main (`-f` "does not contact the init system", "filesystems are not properly unmounted", d'où le `sync`) ; message d'erreur testé : `reboot` dans debian:12.7 sans systemd en PID 1 -> "System has not been booted with systemd as init system (PID 1). Can't operate." (systemd 252), chaîne dans src/shared/bus-util.c:531.
  - `touch /.autorelabel` ajouté pour les distros avec SELinux. Preuve : pas de doc Red Hat officielle lisible (docs.redhat.com répond 403 à WebFetch) ; WebSearch donne la même procédure partout (learn.redhat.com, blogs : rd.break, remount de /sysroot, chroot, passwd, touch /.autorelabel). Non testé sur une VM RHEL.

## En plus

- Aucun.

## Modernisation

- `rd.break` pour RHEL : appliqué, un paragraphe après les étapes (commandes inline). Source : WebSearch, résultats communautaires, rien d'officiel. Un fil learn.redhat.com dit que `rd.break` ne marche pas sur RHEL 9.0 (OK à partir de 9.1) : non mentionné, à décider par l'auteur.

## Tests

- Docker debian:12.7 + systemd-sysv (systemd 252) : message de `reboot` sans systemd en PID 1.
- Pas de boot GRUB réel, pas de VM RHEL.

## À signaler

- La partie SELinux et `rd.break` repose sur des sources communautaires concordantes, pas sur la doc Red Hat (403). À relire par l'auteur.
- L'étape 2 garde le "vous" d'origine, non réécrite.
