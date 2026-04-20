---
description: Renforcer la confidentialité sous Windows 10 avec Blackbird, Privacy Tweaker et HardenTools
tags:
  - Windows
  - Privacy
---

# Améliorer sa privacy sous Windows

Quelques outils pour limiter la télémétrie et les bloatwares de Windows 10/11.

## Outils

- [HardenTools](https://github.com/securitywithoutborders/hardentools) — désactive des features souvent exploitées (macros Office, WSH, PowerShell pour les users standards). Maintenu par Security Without Borders.
- [O&O ShutUp10++](https://www.oo-software.com/en/shutup10) — interface graphique pour désactiver la télémétrie, Cortana, les apps préinstallées. Gratuit, portable.
- [Win11Debloat](https://github.com/Raphire/Win11Debloat) — script PowerShell qui vire les apps UWP inutiles et désactive la télémétrie en batch.
- [Sophia Script](https://github.com/farag2/Sophia-Script-for-Windows) — le plus complet, module PowerShell pour configurer finement Windows (privacy, UI, bloatware). Activement maintenu.

## Script rapide pour virer les apps préinstallées

```powershell
Get-AppxPackage *3DBuilder* | Remove-AppxPackage
Get-AppxPackage *BingWeather* | Remove-AppxPackage
Get-AppxPackage *ZuneMusic* | Remove-AppxPackage
Get-AppxPackage *ZuneVideo* | Remove-AppxPackage
Get-AppxPackage *Solitaire* | Remove-AppxPackage
Get-AppxPackage *Xbox* | Remove-AppxPackage
```
