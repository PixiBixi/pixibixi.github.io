---
description: Configuration initiale d'un Windows Server - renommer le serveur et l'intégrer à un domaine AD
tags:
  - Windows Server
  - PowerShell
---

# Setup de base d'un Windows 2012R2

!!! warning "EOL"
    Windows Server 2012 R2 est en fin de vie depuis octobre 2023 (fin du support étendu). Les commandes PowerShell restent valables sur les versions récentes (2016, 2019, 2022).

Lorsque nous installons un serveur Windows 2012R2, certaines étapes sont
indispensables, les voici

Ces étapes sont disponibles via le binaire `sconfig`

## Renommage du serveur

Le paramètre est `-NewName`, et le nouveau nom n'est effectif qu'après un redémarrage :

```powershell
Rename-Computer -NewName DHCP1 -Restart
```

## Ajout au domaine

`-Credential` est obligatoire pour une jonction à un domaine : sans lui, PowerShell le demande en interactif. On passe un compte autorisé à joindre des machines au domaine. `Add-Computer` n'existe que dans Windows PowerShell 5.1, pas dans PowerShell 7.

* **OU par défaut**

```powershell
Add-Computer -DomainName "Domain01" -Credential "Domain01\Admin01" -Restart
```

* **OU Prédéfinie**

```powershell
Add-Computer -DomainName "Domain02" -OUPath "OU=testOU,DC=domain,DC=Domain,DC=com" -Credential "Domain02\Admin01" -Restart
```

Pour renommer et joindre le domaine en un seul redémarrage, on saute `Rename-Computer` et on passe `-NewName` à `Add-Computer` :

```powershell
Add-Computer -DomainName "Domain01" -NewName DHCP1 -Credential "Domain01\Admin01" -Restart
```
