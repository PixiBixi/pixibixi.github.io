---
description: Installer des pilotes sur Windows Server Core sans interface graphique avec PNPUtil et PowerShell
tags:
  - PowerShell
  - Drivers
---

# Installer des drivers via PowerShell

Quand nous utilisons Windows Core, nous ne pouvons pas installer de
drivers via interface graphique.

Depuis Windows 10 1607 / Server 2016, `pnputil /add-driver` sait parcourir les sous-dossiers tout seul avec `/subdirs`, pas besoin de boucle :

```powershell
pnputil.exe /add-driver "C:\mydrivers\*.inf" /subdirs /install
```

On peut aussi passer par une boucle PowerShell, par exemple pour filtrer certains fichiers :

```powershell
Get-ChildItem "C:\mydrivers\" -Recurse -Filter "*.inf" | ForEach-Object { PNPUtil.exe /add-driver $_.FullName /install }
```

Sur Server 2012 R2 et plus ancien, `/add-driver` n'existe pas, il faut l'ancienne syntaxe `-i -a` (toujours acceptée sur les versions récentes) :

```powershell
Get-ChildItem "C:\mydrivers\" -Recurse -Filter "*.inf" | ForEach-Object { PNPUtil.exe -i -a $_.FullName }
```
