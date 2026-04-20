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

Créer un pool de stockage :

```powershell
New-StoragePool -FriendlyName "MonPool" `
  -StorageSubSystemFriendlyName "Windows Storage*" `
  -PhysicalDisks (Get-PhysicalDisk -CanPool $true)
```

Créer un disque virtuel dans le pool (mirror pour la redondance) :

```powershell
New-VirtualDisk -StoragePoolFriendlyName "MonPool" `
  -FriendlyName "MirrorDisk" `
  -ResiliencySettingName Mirror `
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
