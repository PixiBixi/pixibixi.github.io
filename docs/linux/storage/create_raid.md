---
description: Créer et gérer des RAID logiciels (RAID0/1/5/10) avec mdadm sous Linux - création, assemblage, conversion RAID1 vers RAID5, suppression et montage au démarrage
tags:
  - RAID
  - Storage
---

# Création de RAID logiciels avec mdadm

Créer son RAID avec mdadm est assez simple, cependant, il est toujours utile de rappeler les commandes élémentaires.

`--create` écrase ce qu'il y a sur les disques (données, table de partitions). On vérifie d'abord qu'on vise les bons, et qu'ils ne portent pas déjà un superblock RAID :

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT
mdadm --examine /dev/sda /dev/sdb
```

## Différents types de RAID

### RAID0

Performances accrues, 0 sécurité : la perte d'un disque perd tout l'array.

```bash
mdadm --create /dev/md/name /dev/sda /dev/sdb --level=0 --raid-devices=2
```

### RAID1

Duplique les données sur 2 disques, survit à la perte d'un des 2. Les écritures vont à la vitesse d'un disque, les lectures peuvent être réparties sur les 2.

```bash
mdadm --create /dev/md/name /dev/sda /dev/sdb --level=1 --raid-devices=2
```

### RAID5

Bonnes performances en lecture, survit à la perte d'**un seul** disque : la parité est répartie sur tous les membres, il n'y a pas de disque de spare. Un spare est un disque en plus, optionnel, qui remplace automatiquement un membre en panne (`--spare-devices=1` et un 4ème disque).

```bash
mdadm --create /dev/md/name /dev/sda /dev/sdb /dev/sdc --level=5 --raid-devices=3 --bitmap=internal
```

### RAID10

Le RAID10 de mdadm combine miroir et striping en un seul niveau (pas un RAID1 imbriqué dans un RAID0) :

```bash
mdadm --create --verbose /dev/md0 --level=10 --raid-devices=4 /dev/sda /dev/sdb /dev/sdc /dev/sdd
```

Avec le layout par défaut (`n2`, 2 copies de chaque bloc), on a les performances d'un RAID0 et la moitié de la capacité. Il survit à la perte d'un disque à coup sûr, de 2 seulement s'ils ne portent pas les mêmes copies : perdre les 2 disques d'une même paire perd l'array.

### Suivre la création

Le resync initial tourne en tâche de fond, l'array est utilisable pendant ce temps :

```bash
cat /proc/mdstat
```

Un reboot pendant le resync ne perd pas le RAID : le superblock est écrit dès la création et le resync reprend au démarrage suivant. Ce qui fait disparaître un RAID au reboot, c'est l'absence de l'étape « Monter son RAID au démarrage » plus bas.

Il reste à créer le système de fichiers :

```bash
mkfs.ext4 /dev/md0
```

## Assembler son RAID

Un array existant mais pas actif (disques déplacés sur un autre serveur, boot de rescue) s'assemble à partir des superblocks, puis se monte avec `mount` :

```bash
mdadm --assemble --scan
mount /dev/md0 /mnt/md0
```

## Convertir son RAID

Une opération intéressante est la conversion d'un RAID1 en RAID5, possible seulement depuis un RAID1 à 2 disques. Le premier `--grow` le transforme en RAID5 à 2 disques (la parité de 2 disques est un miroir, rien n'est réécrit), le second ajoute le 3ème disque et lance le reshape :

```bash
mdadm --grow /dev/md/mirror --level=5
mdadm --grow /dev/md/mirror --add /dev/sdc1 --raid-devices=3
```

Le reshape prend des heures et une panne de disque pendant ce temps peut tout perdre : on fait une sauvegarde avant.

## Supprimer son RAID

On vérifie d'abord quel array on vise et quels sont ses membres :

```bash
mdadm --detail /dev/md0
```

On démonte le système de fichiers et on retire son entrée de `/etc/fstab` et de `/etc/mdadm/mdadm.conf`, sinon `--stop` échoue sur un array occupé. Puis on arrête l'array :

```bash
umount /dev/md0
mdadm --stop /dev/md0
```

Puis on efface le superblock de **chaque** membre, sinon ceux qui le gardent sont réassemblés au prochain scan :

```bash
mdadm --zero-superblock /dev/sda /dev/sdb
```

Un ancien membre de RAID1 ne se monte pas tel quel ensuite : avec les métadonnées par défaut (1.2), le superblock est à 4K du début du disque et les données commencent plus loin, le système de fichiers n'est pas à l'offset 0. Ça ne marche qu'avec les métadonnées 0.90 ou 1.0 (superblock en fin de disque). Pour récupérer les données d'un seul membre, on l'assemble plutôt en array dégradé, **avant** de zéroer son superblock :

```bash
mdadm --assemble --run /dev/md0 /dev/sda
```

## Monter son RAID au démarrage

Au démarrage de l'OS, les devices sont vus comme indépendants, il est donc indispensable d'indiquer au système comment utiliser les équipements. On ajoute la ligne `ARRAY` dans `mdadm.conf` (une seule fois : relancer le `tee -a` crée un doublon) et on régénère l'initramfs :

```bash
grep ^ARRAY /etc/mdadm/mdadm.conf
mdadm --detail --scan | tee -a /etc/mdadm/mdadm.conf
update-initramfs -u -k all
```

On n'oublie pas de monter la partition dans le `/etc/fstab`. `nofail` évite de bloquer le boot si l'array ne s'assemble pas :

```bash
echo /dev/md0 /mnt/md0 ext4 defaults,nofail,discard 0 0 | sudo tee -a /etc/fstab
```

À adapter selon le système.
