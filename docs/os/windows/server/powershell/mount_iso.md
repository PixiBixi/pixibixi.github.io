---
description: Monter et démonter des images ISO sur Windows Server avec Mount-DiskImage et Dismount-DiskImage
tags:
  - PowerShell
  - ISO
---

# Monter un ISO directement via PowerShell

Peu d'entre nous le savent, mais depuis Windows 8 (ou Server 2012), on peut monter nativement des ISO sous Windows, sans outil tiers. Sur Windows Server 2012, seul un administrateur peut monter ou éjecter un ISO.

## Monter un ISO

Avec `-PassThru`, la cmdlet renvoie l'image montée, qu'on passe à `Get-Volume` pour récupérer directement sa lettre :

```powershell
Mount-DiskImage -ImagePath C:\Visio.iso -StorageType ISO -PassThru | Get-Volume
```

Avec cet exemple, on a monté l'ISO Visio.iso, sa lettre apparaît dans la colonne `DriveLetter` (et dans l'explorateur Windows).

## Demonter un ISO

On démonte avec le même chemin :

```powershell
Dismount-DiskImage -ImagePath C:\Visio.iso
```
