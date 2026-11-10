---
description: Mesurer le temps d'exécution de commandes PowerShell avec Get-History ou Measure-Command
tags:
  - PowerShell
---

# Connaitre le temps d'exécution d'une commande PowerShell

Une nouvelle fois, grace à notre amis Stack Overflow, nous pouvons
savoir combien de temps a durée une commande :

```powershell
.\do_something.ps1
$command = Get-History -Count 1
$command.EndExecutionTime - $command.StartExecutionTime
```

Cette commande soustrait la date de début d'exécution à la date de fin. Depuis PowerShell 6.1, la propriété `Duration` fait le calcul toute seule : `(Get-History -Count 1).Duration`. Get-History ne marche qu'en session interactive : dans un script, l'historique est vide.

Le plus simple reste la cmdlet native `Measure-Command`, qui renvoie directement un `TimeSpan` :

```powershell
Measure-Command { .\do_something.ps1 }
```

La sortie de la commande mesurée est avalée, on ne récupère que la durée.

Il existe également une function pour ceci

```powershell
function time($block) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    &$block
    $sw.Stop()
    $sw.Elapsed
}
```

Et voici comment l'exécuter :

```powershell
time { .\some_command.ps1 }
```
