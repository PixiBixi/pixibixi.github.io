---
description: "Convertir un fichier .bin en .iso sous Linux avec iat, bchunk ou ccd2iso, vérifier le format réel avec file, monter l'image pour contrôler le résultat et les cas où un simple renommage suffit."
tags:
  - ISO
---

# Convertir un .bin en .iso : iat, bchunk et ccd2iso

Un `.bin`, Windows ne sait pas quoi en faire et la plupart des outils de gravure le refusent. La conversion prend une commande, mais avant de convertir quoi que ce soit il faut savoir ce qu'il y a vraiment dans le fichier, parce que dans un cas sur deux il n'y a rien à convertir du tout.

## D'abord, regarder ce que c'est

`.bin` ne désigne aucun format précis, c'est juste une extension. Derrière, on trouve le plus souvent une image CD en secteurs bruts de 2352 octets, parfois une image déjà en ISO 9660 mal nommée, parfois un firmware qui n'a rien à voir. `file` tranche en une seconde :

```bash
file image.bin
```

Si la réponse contient `ISO 9660 CD-ROM filesystem data`, le fichier **est déjà une ISO** et un simple renommage suffit. Aucun outil de conversion à installer, aucune réécriture de plusieurs Go :

```bash
mv image.bin image.iso
```

Si la réponse est `data`, c'est une image en secteurs bruts et il faut convertir. On regarde alors s'il y a un `.cue` à côté, qui décrit le découpage en pistes, parce que c'est lui qui détermine l'outil à utiliser.

## Avec iat, quand il n'y a pas de .cue

`iat` (ISO9660 Analyzer Tool) détecte le format d'entrée tout seul et gère `.bin`, `.mdf`, `.img`, `.nrg` :

```bash
apt install iat
iat source.bin source.iso
```

C'est le cas le plus simple et celui qui marche pour une image de données à piste unique.

## Avec bchunk, quand il y a un .cue

Dès que l'image contient plusieurs pistes, typiquement un CD mixte avec des pistes audio, `iat` sort une ISO tronquée à la première piste. `bchunk` lit le `.cue` et découpe correctement :

```bash
apt install bchunk
bchunk image.bin image.cue sortie
```

Il produit `sortie01.iso` pour la piste de données et un `.cdr` par piste audio. Les `.cdr` sont du PCM brut, convertibles en WAV avec `ffmpeg` si besoin :

```bash
ffmpeg -f s16le -ar 44100 -ac 2 -i sortie02.cdr piste02.wav
```

Si le `.cue` manque alors que l'image est manifestement multi-piste, on peut en écrire un à la main pour une image de données simple :

```text title="image.cue"
FILE "image.bin" BINARY
  TRACK 01 MODE1/2352
    INDEX 01 00:00:00
```

## Avec ccd2iso, pour les images CloneCD

CloneCD produit un trio `.img` + `.ccd` + `.sub` et le `.img` est parfois renommé en `.bin`. Dans ce cas, ni `iat` ni `bchunk` ne donnent un résultat correct :

```bash
apt install ccd2iso
ccd2iso image.img image.iso
```

## Vérifier le résultat avant de jeter la source

Une conversion qui rend la main sans erreur peut quand même produire une ISO illisible. Le seul contrôle qui vaut, c'est de la monter :

```bash
mkdir -p /mnt/iso
mount -o loop,ro image.iso /mnt/iso
ls -la /mnt/iso
umount /mnt/iso
```

Si le montage échoue avec `wrong fs type, bad option, bad superblock`, la conversion a échoué ou la source était multi-piste et il faut repasser par `bchunk`.

## Sur macOS et Windows

Sur macOS, `hdiutil` fait la conversion nativement, sans rien installer :

```bash
hdiutil convert image.bin -format UDTO -o image
mv image.cdr image.iso
```

Sur Windows, le plus rapide reste WSL avec exactement les commandes ci-dessus. Les convertisseurs en ligne, eux, demandent d'uploader puis de retélécharger plusieurs Go sur un service tiers, pour un travail que `file` et une commande locale règlent en quelques secondes.

## Et pour monter l'ISO ensuite

Le détail des 3 systèmes est dans [monter une image ISO](mount_iso.md). Sous Windows, un double-clic suffit depuis Windows 8 et en PowerShell :

```powershell
Mount-DiskImage -ImagePath C:\images\image.iso
Dismount-DiskImage -ImagePath C:\images\image.iso
```
