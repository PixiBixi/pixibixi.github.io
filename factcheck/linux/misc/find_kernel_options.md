---
article: docs/linux/misc/find_kernel_options.md
checked: '2026-11-11'
commit: 52ac59802a63cc435dc66945ddf038d4bd0e0ee6
sources: []
unpinned: 1
---

# docs/linux/misc/find_kernel_options.md

## Findings

- L11 IMPRECISE corrigé : ajout de la précision que `CONFIG_IKCONFIG` peut être en module (`=m`) et que `/proc/config.gz` n'apparaît alors qu'après `modprobe configs`, plus une phrase avant le premier bloc. Preuve : torvalds/linux `init/Kconfig:585-586` (`config IKCONFIG` / `tristate "Kernel .config support"`) et `kernel/Makefile:94` (`obj-$(CONFIG_IKCONFIG) += configs.o`, donc module `configs.ko`) @ origin/master 8a651625.

## En plus

- Rien.

## Modernisation

- Appliqué : nouvelle section "Depuis l'image du kernel" avec `scripts/extract-ikconfig`. Preuve : `init/Kconfig:591-593` @ 8a651625, "This information can be extracted from the kernel image file with the script scripts/extract-ikconfig".

## Tests

- Conteneur `alpine:3.20.3` sur OrbStack (kernel 7.0.14-orbstack) : `/proc/config.gz` existe mais n'est qu'un extrait de 446 lignes fourni par OrbStack (aucune ligne `CONFIG_IKCONFIG`), donc pas représentatif, rien conclu de ce test.

## À signaler

- La syntaxe exacte `./scripts/extract-ikconfig <image>` (config sur stdout) n'a pas pu être relue : la lecture du blob `scripts/extract-ikconfig` dans le clone partiel `~/Documents/work/src/linux` restait bloquée sur le fetch paresseux depuis GitHub. Écrite de mémoire, à confirmer.
- Le premier exemple `zcat /proc/config.gz | grep CONFIG_IKCONFIG` sert à vérifier les options alors qu'on lit déjà le fichier qu'elles produisent : il ne prouve que ce qu'on sait déjà. Laissé tel quel, au choix de l'auteur.
