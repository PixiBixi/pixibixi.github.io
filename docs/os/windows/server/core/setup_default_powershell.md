---
description: Définir PowerShell comme shell par défaut sur Windows Server Core
---

# Définir PowerShell en temps que shell par défaut

Par défaut sur Windows Core, lorsque nous démarrons le serveur, nous
tombons sur un simple **cmd**. Il est très pénible de taper à chaque
fois que nous voulons faire la moindre opération sur le serveur.

Heureusement pour nous, nous pouvons définir **PowerShell** en temps que
shell par défaut :

```powershell
Set-ItemProperty -Path HKLM:'SOFTWARE'Microsoft'Windows NT'CurrentVersion'Winlogon -Name Shell -Value PowerShell.exe -NoExit
```

Mais il est également possible de définir cette règle via une GPO. Pour
cela, il faut faire une nouvelle règle de Registre (Computer
Configuration '> Preferences '> Windows Preferences '> Registry) et y
rentrer les valeurs suivantes

* `Action:` Update
* `Hive:` HKEY_LOCAL_MACHINE
* `Key Path:` SOFTWARE''Microsoft''Windows
    NT''CurrentVersion''Winlogon
* `Value Name:` Shell
* `Value Type:` REG_SZ
* `Value Data:` PowerShell.exe -NoExit

Et voilà, plus d'arrachage de cheveux, vous avez désormais PowerShell
au démarrage de votre Windows Server Core
