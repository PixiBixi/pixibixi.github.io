---
description: Définir PowerShell comme shell par défaut sur Windows Server Core
tags:
  - Windows Server
  - PowerShell
---

# Définir PowerShell en tant que shell par défaut

Par défaut sur Windows Server Core 2019 et avant, lorsque nous démarrons le serveur, nous
tombons sur un simple **cmd**. Il est très pénible de taper à chaque
fois que nous voulons faire la moindre opération sur le serveur.

Depuis Windows Server 2022, PowerShell est déjà le shell par défaut de Server Core et SConfig s'y lance tout seul : rien à faire. Pour juste couper SConfig, on passe par `Set-SConfig -AutoLaunch $False`.

Heureusement pour nous, sur les versions plus anciennes, nous pouvons définir **PowerShell** en tant que
shell par défaut. Le chemin contient un espace (`Windows NT`) et la valeur contient `-NoExit` : les deux doivent être quotés, sinon PowerShell refuse la commande :

```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name Shell -Value 'PowerShell.exe -NoExit'
```

Mais il est également possible de définir cette règle via une GPO. Pour
cela, il faut faire une nouvelle règle de Registre (Computer
Configuration > Preferences > Windows Preferences > Registry) et y
rentrer les valeurs suivantes

* `Action:` Update
* `Hive:` HKEY_LOCAL_MACHINE
* `Key Path:` `SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon`
* `Value Name:` Shell
* `Value Type:` REG_SZ
* `Value Data:` PowerShell.exe -NoExit

Et voilà, plus d'arrachage de cheveux, vous avez désormais PowerShell
au démarrage de votre Windows Server Core
