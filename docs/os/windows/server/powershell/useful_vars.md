---
description: Variables d'environnement PowerShell utiles — COMPUTERNAME, USERPROFILE et autres variables système
tags:
  - PowerShell
---

# PowerShell : variables built-in utiles

Les variables d'environnement PowerShell les plus courantes en administration serveur.

- `$env:COMPUTERNAME` — hostname de la machine
- `$env:USERPROFILE` — chemin du profil utilisateur (`C:\Users\<user>`)
- `$env:APPDATA` — dossier AppData\Roaming
- `$env:LOCALAPPDATA` — dossier AppData\Local
- `$env:TEMP` / `$env:TMP` — dossier temporaire
- `$env:USERDOMAIN` — domaine Active Directory
- `$env:USERNAME` — nom de l'utilisateur courant
- `$env:LOGONSERVER` — contrôleur de domaine utilisé pour l'authentification
- `$env:OS` — type d'OS (`Windows_NT`)
- `$env:PROCESSOR_ARCHITECTURE` — architecture CPU (`AMD64`, `x86`)
- `$env:NUMBER_OF_PROCESSORS` — nombre de processeurs logiques
- `$env:SYSTEMROOT` — racine Windows (`C:\Windows`)
- `$env:PROGRAMFILES` — dossier Program Files

Pour lister toutes les variables d'environnement disponibles :

```powershell
Get-ChildItem Env:
```
