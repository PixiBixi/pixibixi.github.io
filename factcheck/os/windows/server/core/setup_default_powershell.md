---
article: docs/os/windows/server/core/setup_default_powershell.md
checked: '2026-11-10'
commit: 5c697646fc77f7496daa5da16867bc7e65006a1a
sources: []
unpinned: 2
---

# docs/os/windows/server/core/setup_default_powershell.md

## Findings

- L18 ERROR corrigé : chemin et valeur quotés : `Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' -Name Shell -Value 'PowerShell.exe -NoExit'`, avec une phrase expliquant pourquoi. Preuve : pwsh 7.4.6 (mcr.microsoft.com/powershell:7.4-ubuntu-22.04) : commande d'origine `A positional parameter cannot be found that accepts argument 'NT\CurrentVersion\Winlogon'` ; chemin seul quoté `A parameter cannot be found that matches parameter name 'NoExit'` ; version corrigée passe le binding et n'échoue que sur `Cannot find drive ... 'HKLM'` (Linux, pas de registre).
- L10 IMPRECISE corrigé (le finding est même en dessous de la réalité) : l'intro vise désormais Server Core 2019 et avant ; ajout que depuis Windows Server 2022 PowerShell est déjà le shell par défaut et SConfig s'y lance automatiquement, désactivable par `Set-SConfig -AutoLaunch $False`. Preuve : learn.microsoft.com/windows-server/administration/server-core/server-core-sconfig, sections « PowerShell is the default shell on Server Core » et « Disable SConfig from starting automatically ».

## En plus

- L23 : artefacts de conversion `'>` remplacés par `>` dans le chemin GPO.
- L28-29 : Key Path GPO cassé (`SOFTWARE''Microsoft''Windows NT''...`) remplacé par `SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon`.
- Faute « en temps que » corrigée en « en tant que » (titre H1 et prose).

## Modernisation

- Vérifier la valeur Shell avant de l'écraser : remplacé par l'indication qu'en 2022+ il n'y a rien à faire. Le mécanisme exact du lancement de SConfig (valeur Shell ou AlternateShells) n'est pas documenté sur la page Microsoft, donc pas d'affirmation sur l'effet d'un écrasement.

## Tests

- Docker mcr.microsoft.com/powershell:7.4-ubuntu-22.04 (pwsh 7.4.6, amd64 émulé) pour le parsing. Pas de Windows Server disponible : effet réel sur Winlogon non testé.

## À signaler

- La description front matter ne précise pas la version ; on pourrait la limiter à « Windows Server Core 2019 et avant ».
