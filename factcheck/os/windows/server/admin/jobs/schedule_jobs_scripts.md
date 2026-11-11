---
article: docs/os/windows/server/admin/jobs/schedule_jobs_scripts.md
checked: '2026-11-11'
commit: 305ec01e119038b394a3754ef06338a1e34343f4
sources: []
unpinned: 1
---

# docs/os/windows/server/admin/jobs/schedule_jobs_scripts.md

## Findings

- L29 IMPRECISE corrigé : les arguments deviennent `-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Scripts\Backup_DB.ps1"`, avec l'explication sur `-File` et l'execution policy (défaut RemoteSigned sur Server, Restricted/AllSigned, GPO prioritaire sur `-ExecutionPolicy`). Preuve : about_PowerShell_exe (5.1) : `-File` doit être le dernier paramètre, syntaxe sans File positionnel ; about_Pwsh : "-File ... is the default parameter if no parameters are present" (comportement propre à pwsh, confirmé dans PowerShell CommandLineParameterParser.cs L1300-1305 @1aac7f5e3) ; about_Execution_Policies (5.1) : RemoteSigned défaut sur Windows Server, et la policy de session "doesn't take precedence over the execution policy set by using a Group Policy". Le défaut `-Command` de powershell.exe 5.1 est déduit de la syntaxe documentée, pas testé (pas de Windows).

## En plus

- Chemins en `/` remplacés par `\` et mis en code.
- "dexécuter" corrigé en "d'exécuter".
- Ajout de la nuance GPO : `-ExecutionPolicy Bypass` ne contourne pas une policy imposée par GPO (absente du fact-check, la suggestion initiale aurait été trompeuse). Preuve : about_Execution_Policies, section "Set a different policy for one session".

## Modernisation

- Non appliqué : Register-ScheduledTask / New-ScheduledTaskAction, pas de Windows pour tester la commande.
- Non appliqué : gMSA / SYSTEM, recommandation de design non testable ici ; à trancher par l'auteur.

## Tests

- Aucun (pas de Windows disponible). Vérification sur la doc Microsoft (lue le 2026-11-09) et la source PowerShell locale.

## À signaler

- Le chemin "Panneau de configuration - Outils d'administration" est daté sur les Server récents (Gestionnaire de serveur > Outils) ; non modifié, non vérifié.
