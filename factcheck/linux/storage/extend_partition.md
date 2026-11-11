---
article: docs/linux/storage/extend_partition.md
checked: '2026-11-11'
commit: 14bae35bd3afa15a9b3bd6d90521c1b53406e9c9
sources: []
unpinned: 4
---

# docs/linux/storage/extend_partition.md

## Findings

- L55 ERROR corrigé : étape 4 découpée : `df -T /` pour connaître le filesystem, `resize2fs <device>` en ext4, `xfs_growfs /` (point de montage) en XFS, avec le message d'échec de resize2fs sur XFS. Preuve : test ubuntu:24.04 privilégié sur loop device, partition montée : ext4 `resize2fs` "now 261883 (4k) blocks long" ; XFS `resize2fs: Bad magic number in super-block`, `xfs_growfs /mnt/t` "data blocks changed from 89600 to 261883".
- L10 IMPRECISE corrigé : intro réécrite, le rescue n'est plus présenté comme la norme. Preuve : même test, `growpart` sur la partition montée, `lsblk` montre aussitôt la nouvelle taille (`loop0p1 1023M`), le noyau a relu la table sans reboot.
- L10 IMPRECISE corrigé : la confusion "système scalable comme LVM, XFS" a disparu avec l'intro, et le tag `LVM` est retiré (l'article ne traite pas LVM). Preuve : contenu de l'article.
- L35 IMPRECISE corrigé : ajout du paquet (`cloud-guest-utils` / `cloud-utils-growpart`), de la contrainte "espace libre juste derrière", du snapshot conseillé, du dry-run `growpart -N` et du `NOCHANGE`. Preuve : test : `growpart -N` affiche `CHANGE: partition=1 ... new: size=2095071` sans écrire, 2e passage `NOCHANGE: partition 1 is size 2095071. it cannot be grown`. Le nom du paquet RHEL/Amazon Linux n'est pas testé (connu, non vérifié dans un conteneur).

## En plus

- Rien d'autre.

## Modernisation

- `xfs_growfs /` sur XFS : appliqué.
- `growpart -N` : appliqué.
- `parted resizepart 1 100%` : non appliqué, growpart suffit et c'est le sujet de l'article.

## Tests

- Docker ubuntu:24.04 `--privileged`, image disque 600M puis 1G sur loop device (partitions créées avec mknod), cloud-guest-utils 0.33-1, e2fsprogs 1.47.0, xfsprogs 6.6.0. `tested_with` ajouté avec ces 3 versions.

## À signaler

- Retrait du tag `LVM` : à confirmer par l'auteur (Storage reste, Linux vient du `.meta.yml`).
