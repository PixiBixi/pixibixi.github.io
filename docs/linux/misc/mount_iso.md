---
description: "Monter une image ISO sous Linux avec mount -o loop, sous Windows 10 et 11 en double-clic ou avec Mount-DiskImage en PowerShell et sous macOS avec hdiutil, sans logiciel tiers."
tags:
  - ISO
---

# Monter une image ISO : Linux, Windows et macOS

Monter une ISO, c'est la rendre accessible comme un lecteur, sans la graver ni l'extraire. Les 3 systèmes savent le faire nativement depuis des années, donc aucun DaemonTools ni utilitaire tiers n'est nécessaire.

## Linux

Le point de montage doit exister avant et l'opération demande les droits root :

```bash
sudo mkdir -p /mnt/iso
sudo mount -o loop,ro image.iso /mnt/iso
ls /mnt/iso
```

`loop` présente le fichier comme un périphérique bloc, `ro` évite un avertissement puisqu'une ISO est de toute façon en lecture seule. L'option est en fait facultative depuis longtemps, la man page dit que *mount automatically creates a loop device from a regular file if a filesystem type is not specified or the filesystem is known for libblkid*, donc `sudo mount -o ro image.iso /mnt/iso` suffit. On la garde ici parce qu'elle rend explicite ce qui se passe. Le même mécanisme accepte `offset=` et `sizelimit=`, utiles pour attaquer une partition précise d'une ISO hybride. Le démontage se fait par le point de montage :

```bash
sudo umount /mnt/iso
```

Si `umount` répond `target is busy`, c'est qu'un shell ou un process travaille encore dedans. `lsof` désigne le coupable plutôt que de forcer, en `sudo` sinon les process des autres utilisateurs restent invisibles :

```bash
sudo lsof +D /mnt/iso
```

Pour monter sans être root, `udisksctl` passe par le service système. Ça ne vaut qu'en session locale : en SSH, polkit demande une authentification admin. Ce sont 3 étapes distinctes et c'est là qu'on se plante : `loop-setup` crée seulement le loop device et imprime lequel, il ne monte rien. C'est `mount` qui monte, et pas sous `/media` mais dans `/run/media/$USER/<label>`, chemin qu'il affiche sur sa sortie standard.

```bash
DEV=$(udisksctl loop-setup -r -f image.iso | grep -o '/dev/loop[0-9]*')
udisksctl mount -b "$DEV"        # imprime le point de montage réel
udisksctl unmount -b "$DEV"
udisksctl loop-delete -b "$DEV"
```

Reprendre le device dans une variable n'est pas de la coquetterie : `loop-setup` alloue le premier loop libre, et sur une Ubuntu chaque snap monté en occupe un, donc `/dev/loop0` est déjà pris. Un `mount -b /dev/loop0` en dur monte le squashfs d'un snap ou échoue.

Le `unmount` avant le `loop-delete` compte tout autant : sur un device encore monté, le teardown bascule en détachement différé. La commande sort en succès et l'image reste montée sous `/run/media`.

Et pour rendre le montage permanent, une ligne de `fstab`, avec le `nofail` qui évite qu'un fichier absent bloque le démarrage :

```text title="/etc/fstab"
/srv/images/image.iso  /mnt/iso  udf,iso9660  loop,ro,nofail  0  0
```

### Juste extraire un fichier

Quand il s'agit de récupérer 2 fichiers, le montage est superflu. `7z` lit les ISO directement, sans droits particuliers, à part sur les ISO Windows en UDF où il a des bugs connus :

```bash
7z l image.iso              # lister
7z x image.iso -o./sortie   # extraire
```

## Windows 10 et 11

Depuis Windows 8, un double-clic sur une ISO la monte et lui attribue une lettre de lecteur. L'éjection se fait par un clic droit sur le lecteur, puis *Éjecter*.

Si le double-clic ouvre un autre programme, c'est qu'une application (souvent WinRAR ou 7-Zip) s'est associée à l'extension. Le clic droit puis *Ouvrir avec → Explorateur Windows* rétablit le comportement natif pour cette fois et *Choisir une autre application → Toujours* le rend définitif.

En PowerShell, ce qui est indispensable dans un script :

```powershell
$image = Mount-DiskImage -ImagePath "C:\images\image.iso" -PassThru
($image | Get-Volume).DriveLetter

Dismount-DiskImage -ImagePath "C:\images\image.iso"
```

`-PassThru` renvoie l'objet, seul moyen de récupérer la lettre attribuée, qui n'est pas prévisible. Sans lui, la commande monte l'image sans rien afficher.

L'erreur `Le fichier image spécifié n'est pas reconnu comme un fichier image de disque valide` a le plus souvent 2 causes : le fichier est incomplet, ou il porte l'extension `.iso` sans en être une. Une empreinte comparée au hash publié par l'éditeur tranche :

```powershell
Get-FileHash C:\images\image.iso -Algorithm SHA256
```

Un `You don't have permission to mount the file` sur une ISO complète vient d'un fichier marqué sparse, ce que `fsutil sparse queryflag` confirme : une copie vers un nouveau fichier le règle.

Si le fichier vient d'un `.bin` renommé à la main, voir [convertir un .bin en .iso](convert_bin_to_iso.md).

## macOS

Un double-clic monte l'image dans `/Volumes`. En ligne de commande :

```bash
hdiutil attach image.iso
hdiutil detach /Volumes/NOM_DU_VOLUME
```

`hdiutil attach -nobrowse` monte sans faire apparaître le volume nulle part dans le Finder (bureau, barre latérale, boîtes de dialogue), ce qui est préférable dans un script.

## Vérifier une ISO avant de s'en servir

Un montage qui échoue vient plus souvent d'un téléchargement tronqué que d'un problème d'outil. Les 2 contrôles ne servent pas à la même chose et il faut les 2 :

```bash
file image.iso                    # le type, pas l'intégrité
ls -l image.iso                   # à comparer à la taille annoncée par l'éditeur
sha256sum -c SHA256SUMS           # le seul vrai contrôle d'intégrité
```

Si `file` répond simplement `data`, ce n'est pas une ISO et il n'y a rien à monter. Mais un `ISO 9660 CD-ROM filesystem data` ne prouve rien sur la complétude du fichier.

!!! warning "`file` ne voit pas une ISO tronquée"
    Il lit le Primary Volume Descriptor au secteur 16, soit à l'offset 32768. Tout ce qui
    suit lui est invisible. Un fichier de 40 Ko réduit à ses premiers secteurs est annoncé
    `ISO 9660 CD-ROM filesystem data` comme une image complète, et une image coupée à 90 %
    aussi. Seule la comparaison de taille, ou mieux l'empreinte comparée à celle publiée par
    l'éditeur, tranche. Un `sha256sum` qu'on ne compare à rien ne sert à rien, et sur une
    image de 5 Go il coûte des dizaines de secondes, pas 2.
