---
article: docs/os/windows/server/powershell/command_time_execution.md
checked: '2026-11-11'
commit: 41866f1a5ca65064e4621f585956da26b7634b29
sources:
- repo: PowerShell
  path: src/System.Management.Automation/engine/hostifaces/History.cs
  lines: '92'
  ref: origin/master
  commit: 1aac7f5e38679b3c1469b67071a4c07f50cc064b
unpinned: 3
---

# docs/os/windows/server/powershell/command_time_execution.md

## Findings

- L13 ERROR corrigé : `.'do_something.ps1` -> `.\do_something.ps1`, et L35 `.'some_command` -> `.\some_command.ps1`. Preuve : PowerShell 7.4.6, `Parser::ParseInput` sur les deux lignes d'origine -> "The string is missing the terminator: '." (et "Missing closing '}'" pour la seconde).
- L3 IMPRECISE corrigé : ajout d'une section `Measure-Command { .\do_something.ps1 }` (renvoie un TimeSpan, avale la sortie). Preuve : PowerShell 7.4.6, type retourné `TimeSpan`, ~327 ms pour un script de 300 ms, le `Write-Output hello` du script n'apparaît pas.
- L18 IMPRECISE corrigé : "début - fin" -> "soustrait la date de début à la date de fin". Preuve : le code de l'article (`EndExecutionTime - StartExecutionTime`), PowerShell History.cs:92 `Duration => EndExecutionTime - StartExecutionTime`.

## En plus

- Ajout de `(Get-History -Count 1).Duration` depuis PowerShell 6.1. Preuve : PowerShell src/System.Management.Automation/engine/hostifaces/History.cs:92 @origin/master, introduit par 1bfe96d3c, premier tag stable v6.1.0.
- Ajout : Get-History ne marche qu'en session interactive. Preuve : `pwsh -File` -> `@(Get-History).Count` = 0.
- Typo "exéctuer" -> "exécuter".

## Modernisation

- Measure-Command : appliqué.

## Tests

- Docker mcr.microsoft.com/powershell:7.4-ubuntu-22.04 (PowerShell 7.4.6, émulation amd64). Windows PowerShell 5.1 non testé.

## À signaler

- Rien.
