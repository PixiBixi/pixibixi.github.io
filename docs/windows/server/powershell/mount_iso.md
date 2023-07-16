# Monter un ISO directement via PowerShell

Peu d'entre nous le savent, mais depuis Windows 8 (ou Server 2008), il
est possible de monter nativement des ISO sous Windows

## Monter un ISO

```powershell
Mount-DiskImage -ImagePath C:'Visio.iso -StorageType ISO -PassThru
```

Avec cet exemple, nous avons monté l'ISO Visio.iso, vous retrouverez sa
lettre dans l'explorateur Windows, ou via la commande ***Get-Volume***

## Demonter un ISO

```powershell
Dismount-DiskImage -ImagePath C:'Visio.iso
```
