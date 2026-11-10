---
description: Variables d'environnement PowerShell utiles - COMPUTERNAME, USERPROFILE et autres variables système
tags:
  - PowerShell
---

# PowerShell : variables built-in utiles

Les variables d'environnement PowerShell les plus courantes en administration serveur.

- `$env:COMPUTERNAME` - hostname de la machine
- `$env:USERPROFILE` - chemin du profil utilisateur (`C:\Users\<user>`)
- `$env:APPDATA` - dossier AppData\Roaming
- `$env:LOCALAPPDATA` - dossier AppData\Local
- `$env:TEMP` / `$env:TMP` - dossier temporaire
- `$env:USERDOMAIN` - domaine (nom NetBIOS) du compte courant, le nom de la machine pour un compte local
- `$env:USERNAME` - nom de l'utilisateur courant
- `$env:LOGONSERVER` - serveur qui a authentifié la session : le contrôleur de domaine pour un compte AD, `\\<machine>` pour un compte local. Figée à l'ouverture de session, elle peut désigner un DC qui n'est plus celui utilisé
- `$env:OS` - type d'OS (`Windows_NT`)
- `$env:PROCESSOR_ARCHITECTURE` - architecture du processus (`AMD64`, `ARM64`, `x86`). Un PowerShell 32 bits sur un OS 64 bits voit `x86`, la vraie architecture est alors dans `$env:PROCESSOR_ARCHITEW6432`
- `$env:NUMBER_OF_PROCESSORS` - nombre de processeurs logiques
- `$env:SYSTEMROOT` - racine Windows (`C:\Windows`)
- `$env:PROGRAMFILES` - dossier Program Files (`Program Files (x86)` depuis un processus 32 bits, `$env:ProgramW6432` donne toujours le dossier 64 bits)

Pour lister toutes les variables d'environnement disponibles :

```powershell
Get-ChildItem Env:
```
