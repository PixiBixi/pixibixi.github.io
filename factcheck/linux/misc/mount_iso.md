---
article: docs/linux/misc/mount_iso.md
checked: '2026-11-11'
commit: 4c6661b9bf2876ba35cafb6098997673a4be4c36
sources: []
unpinned: 2
---

# docs/linux/misc/mount_iso.md

## Findings

- L44 IMPRECISE rejeté : l'affirmation est exacte, rien à changer. Preuve : udisks `src/udiskslinuxloop.c` handle_delete appelle `bd_loop_teardown` (@f6930dd6, udisks-2.11.0), libblockdev `src/plugins/loop.c:484` fait un simple `ioctl(fd, LOOP_CLR_FD)` (@ec40562). Test du même ioctl via `losetup -d` sur un loop monté (debian:12.7 privileged, kernel 7.0.14 OrbStack) : rc=0, le fichier reste lisible sous le point de montage, `AUTOCLEAR` passe à 1, et le loop se libère seulement après `umount`.
- L54 IMPRECISE non vérifié : bugs 7z sur les ISO Windows en UDF. Pas de clone 7-Zip local, pas d'ISO Windows pour tester, pas de changelog lu. Texte laissé tel quel.

## En plus

- Aucun.

## Modernisation

- Aucune suggestion.

## Tests

- Docker debian:12.7 `--privileged`, genisoimage, losetup/mount, kernel OrbStack 7.0.14. Conteneur supprimé (`--rm`).

## À signaler

- L54 : la mention "bugs connus" reste sans source; à sourcer ou à retirer selon ce que l'auteur sait.
