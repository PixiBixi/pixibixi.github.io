---
description: "Monter une image ISO sous Linux avec mount -o loop, sous Windows 10 et 11 en double-clic ou avec Mount-DiskImage en PowerShell, et sous macOS avec hdiutil, sans logiciel tiers."
tags:
  - ISO
---

# Monter une image ISO : Linux, Windows et macOS

Monter une ISO, c'est la rendre accessible comme un lecteur, sans la graver ni l'extraire. Les 3 systèmes savent le faire nativement depuis des années, donc aucun DaemonTools ni utilitaire tiers n'est nécessaire.

## Linux

Le point de montage doit exister avant, et l'opération demande les droits root :

```bash
sudo mkdir -p /mnt/iso
sudo mount -o loop,ro image.iso /mnt/iso
ls /mnt/iso
```

`loop` demande au noyau de présenter le fichier comme un périphérique bloc, `ro` évite un avertissement puisqu'une ISO est de toute façon en lecture seule. Le démontage se fait par le point de montage :

```bash
sudo umount /mnt/iso
```

Si `umount` répond `target is busy`, c'est qu'un shell ou un process travaille encore dedans. `lsof` désigne le coupable plutôt que de forcer :

```bash
lsof +D /mnt/iso
```

Pour monter sans être root, `udisksctl` passe par le service système et monte automatiquement sous `/media` :

```bash
udisksctl loop-setup -r -f image.iso
udisksctl mount -b /dev/loop0
udisksctl loop-delete -b /dev/loop0
```

Et pour rendre le montage permanent, une ligne de `fstab`, avec le `nofail` qui évite qu'un fichier absent bloque le démarrage :

```text title="/etc/fstab"
/srv/images/image.iso  /mnt/iso  iso9660  loop,ro,nofail  0  0
```

### Juste extraire un fichier

Quand il s'agit de récupérer 2 fichiers, le montage est superflu. `7z` lit les ISO directement, sans droits particuliers :

```bash
7z l image.iso              # lister
7z x image.iso -o./sortie   # extraire
```

## Windows 10 et 11

Depuis Windows 8, un double-clic sur une ISO la monte et lui attribue une lettre de lecteur. L'éjection se fait par un clic droit sur le lecteur, puis *Éjecter*.

Si le double-clic ouvre un autre programme, c'est qu'une application (souvent WinRAR ou 7-Zip) s'est associée à l'extension. Le clic droit puis *Ouvrir avec → Explorateur Windows* rétablit le comportement natif pour cette fois, et *Choisir une autre application → Toujours* le rend définitif.

En PowerShell, ce qui est indispensable dans un script :

```powershell
$image = Mount-DiskImage -ImagePath "C:\images\image.iso" -PassThru
($image | Get-Volume).DriveLetter

Dismount-DiskImage -ImagePath "C:\images\image.iso"
```

`-PassThru` renvoie l'objet, seul moyen de récupérer la lettre attribuée, qui n'est pas prévisible. Sans lui, la commande monte l'image sans rien afficher.

L'erreur `Le fichier image spécifié n'est pas reconnu comme un fichier image de disque valide` a presque toujours la même cause : le fichier est incomplet, ou porte l'extension `.iso` sans en être une. Un contrôle d'empreinte tranche :

```powershell
Get-FileHash C:\images\image.iso -Algorithm SHA256
```

Si le fichier vient d'un `.bin` renommé à la main, voir [convertir un .bin en .iso](convert_bin_to_iso.md).

## macOS

Un double-clic monte l'image dans `/Volumes`. En ligne de commande :

```bash
hdiutil attach image.iso
hdiutil detach /Volumes/NOM_DU_VOLUME
```

`hdiutil attach -nobrowse` monte sans faire apparaître l'icône sur le bureau, ce qui est préférable dans un script.

## Vérifier une ISO avant de s'en servir

Un montage qui échoue vient plus souvent d'un téléchargement tronqué que d'un problème d'outil. Le contrôle du format et de la taille prend 2 secondes :

```bash
file image.iso     # doit dire "ISO 9660 CD-ROM filesystem data"
sha256sum image.iso
```

Et si `file` répond simplement `data`, ce n'est pas une ISO : le fichier a besoin d'être converti avant d'être monté.
