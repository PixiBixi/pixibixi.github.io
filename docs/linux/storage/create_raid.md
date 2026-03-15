---
description: Créer et gérer des RAID logiciels (RAID0/1/5/10) avec mdadm sous Linux
tags:
  - RAID
  - Storage
---

# Création de RAID logiciels avec mdadm

Créer son RAID avec mdadm est assez simple, cependant, il est toujours utile de rappeler les commandes élémentaires.

## Différents types de RAID

### RAID0

Performances accrues, 0 sécurité

```bash
mdadm --create /dev/md/name /dev/sda /dev/sdb --level=0 --raid-devices=2
```

### RAID1

Performances diminuées, duplique les données sur 2 disques, bonne sécurité

```bash
mdadm --create /dev/md/name /dev/sda /dev/sdb --level=1 --raid-devices=2
```

### RAID5

Bonnes performances, bonne sécurité grâce à son disk de spare

```bash
mdadm --create /dev/md/name /dev/sda /dev/sdb /dev/sdc --level=5 --raid-devices=3 --bitmap=internal
```

### RAID Complexe

Pour créer un RAID complexe comme un RAID1+0, combinant un RAID1 et un RAID0 :

```bash
mdadm --create --verbose /dev/md0 --level=10 --raid-devices=4 /dev/sda /dev/sdb /dev/sdc /dev/sdd
```

Ce type de RAID permet d'avoir les performances d'un RAID0 avec la sécurité d'un RAID1, au prix d'un grand nombre de devices.

!!! warning "Reboot"
    Il est important de ne pas reboot son serveur sans finalisation de création de RAID afin de ne pas perdre son RAID

## Monter son RAID

Si le RAID est déjà monté, il suffit de faire la commande suivante pour l'assembler, puis de le monter traditionnellement avec mount :

```bash
mdadm --assemble --scan
```

## Convertir son RAID

Une opération intéressante est la conversion d'un RAID1 en RAID5. Dans un premier temps, on passe le RAID1 en mode degraded puis on ajoute le 3ème device :

```bash
mdadm --grow /dev/md/mirror --level=5
mdadm --grow /dev/md/mirror --add /dev/sdc1 --raid-devices=3
```

## Supprimer son RAID

Pour supprimer un RAID :

```bash
mdadm --stop /dev/md0 ; mdadm --remove /dev/md0
```

Puis on supprime le superblock de l'équipement :

```bash
mdadm --zero-superblock /dev/sdc
```

S'il s'agit d'un device en RAID1, celui-ci sera toujours utilisable sans devoir recréer une partition.

## Monter son RAID au démarrage

Au démarrage de l'OS, les devices sont vus comme indépendants, il est donc indispensable d'indiquer au système comment utiliser les équipements :

```bash
mdadm --detail --scan | tee -a /etc/mdadm/mdadm.conf
update-initramfs -u -k all
```

On n'oublie pas de monter la partition dans le `/etc/fstab` :

```bash
echo /dev/md0 /mnt/md0 ext4 defaults,nofail,discard 0 0 | sudo tee -a /etc/fstab
```

À adapter selon le système.
