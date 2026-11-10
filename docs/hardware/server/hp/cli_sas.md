---
description: Gérer les contrôleurs RAID HP Smart Array en CLI - configuration, état et opérations sur disques
tags:
  - HP
  - SAS
---

# Commandes HP Smart Array en CLI (Utilisable pour un ESX...)

De nombreuses commandes utiles pour l'utilitaire ssacli, qui a remplacé hpssacli avec la même syntaxe. Sur Linux, le paquet `ssacli` installe `/usr/sbin/ssacli`, dans le PATH. Sur ESXi, le binaire est dans `/opt/smartstorageadmin/ssacli/bin/ssacli`. Sur un vieux serveur resté en hpssacli, on remplace `ssacli` par `/opt/hp/hpssacli/bin/hpssacli`.

## Contrôleur

### Show configuration

```bash
ssacli ctrl all show config
```

### Controller status

```bash
ssacli ctrl all show status
```

### Show detailed controller information for all controllers

```bash
ssacli ctrl all show detail
```

### Show detailed controller information for controller in slot 0

```bash
ssacli ctrl slot=0 show detail
```

### Rescan for New Devices

```bash
ssacli rescan
```

## Disques physiques

### Physical disk status

```bash
ssacli ctrl slot=0 pd all show status
```

### Show detailed physical disk information

```bash
ssacli ctrl slot=0 pd all show detail
```

## Volumes logiques

### Logical disk status

```bash
ssacli ctrl slot=0 ld all show status
```

### View Detailed Logical Drive Status

```bash
ssacli ctrl slot=0 ld 2 show
```

### Create New RAID 0 Logical Drive

```bash
ssacli ctrl slot=0 create type=ld drives=1I:1:2 raid=0
```

### Create New RAID 1 Logical Drive

```bash
ssacli ctrl slot=0 create type=ld drives=1I:1:1,1I:1:2 raid=1
```

### Create New RAID 5 Logical Drive

```bash
ssacli ctrl slot=0 create type=ld drives=1I:1:1,1I:1:2,2I:1:6,2I:1:7,2I:1:8 raid=5
```

### Delete Logical Drive

Détruit le volume et ses données. ssacli demande une confirmation, sauf si on ajoute `forced` :

```bash
ssacli ctrl slot=0 ld 2 delete
```

### Add New Physical Drive to Logical Volume

```bash
ssacli ctrl slot=0 ld 2 add drives=2I:1:6,2I:1:7
```

### Add Spare Disks

```bash
ssacli ctrl slot=0 array all add spares=2I:1:6,2I:1:7
```

## Cache d'écriture des disques

### Enable Drive Write Cache

```bash
ssacli ctrl slot=0 modify dwc=enable
```

### Disable Drive Write Cache

```bash
ssacli ctrl slot=0 modify dwc=disable
```

## Effacement et LED

### Erase Physical Drive

Efface le disque, irréversible :

```bash
ssacli ctrl slot=0 pd 2I:1:6 modify erase
```

### Turn on Blink Physical Disk LED

Pour un disque précis (par défaut la LED clignote 1h, `duration=` en secondes pour changer) :

```bash
ssacli ctrl slot=0 pd 2I:1:6 modify led=on
```

Avec `ld 2` à la place de `pd 2I:1:6`, ce sont tous les disques du volume logique 2 qui clignotent :

```bash
ssacli ctrl slot=0 ld 2 modify led=on
```

### Turn off Blink Physical Disk LED

```bash
ssacli ctrl slot=0 pd 2I:1:6 modify led=off
```

## Cache du contrôleur

### Modify smart array cache read and write ratio (cacheratio=readratio/writeratio)

```bash
ssacli ctrl slot=0 modify cacheratio=100/0
```

### Enable smart array write cache when no battery is present (No-Battery Write Cache option)

```bash
ssacli ctrl slot=0 modify nbwc=enable
```

### Disable smart array cache for certain Logical Volume

```bash
ssacli ctrl slot=0 logicaldrive 1 modify arrayaccelerator=disable
```

### Enable smart array cache for certain Logical Volume

```bash
ssacli ctrl slot=0 logicaldrive 1 modify arrayaccelerator=enable
```

## SSD Smart Path

### Enable SSD Smart Path

```bash
ssacli ctrl slot=0 array a modify ssdsmartpath=enable
```

### Disable SSD Smart Path

```bash
ssacli ctrl slot=0 array a modify ssdsmartpath=disable
```
