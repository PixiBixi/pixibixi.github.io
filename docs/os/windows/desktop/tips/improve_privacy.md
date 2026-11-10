---
description: Renforcer la confidentialité sous Windows 11 avec HardenTools, O&O ShutUp10++, Win11Debloat et Sophia Script
tags:
  - Windows
  - Privacy
---

# Améliorer sa privacy sous Windows

Quelques outils pour limiter la télémétrie et les bloatwares de Windows 11. Windows 10 n'est plus supporté depuis le 14 octobre 2025, les outils ci-dessous marchent encore dessus mais c'est Windows 11 qu'on vise.

## Outils

- [HardenTools](https://github.com/hardentools/hardentools) - désactive des features souvent exploitées (macros Office, WSH, PowerShell pour les users standards). Projet né chez Security Without Borders, dernière release v2.6 en août 2025. Les réglages ne s'appliquent qu'au compte qui le lance.
- [O&O ShutUp10++](https://www.oo-software.com/en/shutup10) - interface graphique pour désactiver la télémétrie et les apps préinstallées. Gratuit, portable.
- [Win11Debloat](https://github.com/Raphire/Win11Debloat) - script PowerShell qui vire les apps UWP inutiles et désactive la télémétrie en batch. Il classe chaque app (safe, optional, unsafe), c'est à préférer au script ci-dessous.
- [Sophia Script](https://github.com/farag2/Sophia-Script-for-Windows) - le plus complet, module PowerShell pour configurer finement Windows (privacy, UI, bloatware). Activement maintenu.

## Script rapide pour virer les apps préinstallées

Pour un nettoyage à la main, `Remove-AppxPackage` retire les apps pour l'utilisateur courant uniquement :

```powershell
Get-AppxPackage *3DBuilder* | Remove-AppxPackage
Get-AppxPackage *BingWeather* | Remove-AppxPackage
Get-AppxPackage *ZuneVideo* | Remove-AppxPackage
Get-AppxPackage *Solitaire* | Remove-AppxPackage
Get-AppxPackage Microsoft.XboxApp | Remove-AppxPackage
```

On évite 2 wildcards qu'on trouve souvent dans ce genre de script :

- `*ZuneMusic*` : sous Windows 11, `Microsoft.ZuneMusic` est le Media Player, le lecteur audio/vidéo par défaut
- `*Xbox*` : il emporte aussi `Microsoft.XboxIdentityProvider` et `Microsoft.Xbox.TCUI`, nécessaires pour se connecter au compte Xbox dans certains jeux du Store et du Game Pass
