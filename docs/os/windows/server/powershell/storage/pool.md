---
description: Gérer les Storage Spaces et pools de stockage sur Windows Server avec PowerShell
tags:
  - PowerShell
  - Storage
---

# Storage Spaces en PowerShell

Windows Server permet de créer des pools de stockage (Storage Spaces) pour agréger des disques physiques. Les disques doivent faire au minimum 4 GB.

Lister les disques physiques disponibles pour un pool :

```powershell
Get-PhysicalDisk -CanPool $true
```

Créer un pool de stockage. Attention, `Get-PhysicalDisk -CanPool $true` prend **tous** les disques vierges de la machine :

```powershell
New-StoragePool -FriendlyName "MonPool" `
  -StorageSubSystemFriendlyName "Windows Storage*" `
  -PhysicalDisks (Get-PhysicalDisk -CanPool $true)
```

Pour ne mettre que certains disques dans le pool, on les nomme explicitement (`FriendlyName` lu dans la sortie de `Get-PhysicalDisk -CanPool $true`) :

```powershell
New-StoragePool -FriendlyName "MonPool" `
  -StorageSubSystemFriendlyName "Windows Storage*" `
  -PhysicalDisks (Get-PhysicalDisk PhysicalDisk1, PhysicalDisk2)
```

Créer un disque virtuel dans le pool (mirror pour la redondance). Un mirror 2 copies demande au moins 2 disques physiques dans le pool :

```powershell
New-VirtualDisk -StoragePoolFriendlyName "MonPool" `
  -FriendlyName "MirrorDisk" `
  -ResiliencySettingName Mirror `
  -UseMaximumSize
```

Pour un mirror 3 copies, qui encaisse la perte de 2 disques, il faut au moins 5 disques dans le pool (hors hot spares) et `-NumberOfDataCopies 3` :

```powershell
New-VirtualDisk -StoragePoolFriendlyName "MonPool" `
  -FriendlyName "MirrorDisk" `
  -ResiliencySettingName Mirror `
  -NumberOfDataCopies 3 `
  -UseMaximumSize
```

Initialiser et formater le disque :

```powershell
Get-VirtualDisk -FriendlyName "MirrorDisk" | Get-Disk | Initialize-Disk -PartitionStyle GPT -PassThru | New-Partition -AssignDriveLetter -UseMaximumSize | Format-Volume -FileSystem NTFS
```

Vérifier l'état du pool :

```powershell
Get-StoragePool | Format-Table FriendlyName, HealthStatus, Size, AllocatedSize
```
