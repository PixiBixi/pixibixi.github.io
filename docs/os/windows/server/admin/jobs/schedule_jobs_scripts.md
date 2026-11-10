---
description: Planifier l'exécution de scripts PowerShell avec le Planificateur de tâches Windows
tags:
  - Windows Server
  - PowerShell
---

# Exécuter un script PowerShell via une tâche planifiée

**1)** Ouvrir le Planificateur de tâches Panneau de configuration -
Outils d'administrations - Planificateur de tâches

**2)** Clique droit - Créer une nouvelle tâche

**3)** Configurer les options de base suivant vos besoins

- **Nom :** Correspond au nom de votre tâche planifiée
- **Description :** Vous pouvez indiquer les détails, cela n'a pas d'importance
- **Exécuter même si l'utilisateur n'est pas connecté :** Permet d'exécuter la tâche à n'importe quel moment (les informations d'identification utilisateur seront demandées)

**4)** Cliquer sur l'onglet Déclencheurs - Cliquer sur Nouveau C'est
ici que l'on configure la planification de la tâche. Il est possible
d'ajouter autant de déclencheur que désiré.

**5)** Cliquer sur l'onglet Actions puis Nouveau Il est possible
d'exécuter plusieurs scripts/actions/programmes

Indiquer dans Programme/script : `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`

Dans Ajouter des arguments, on ne met pas le chemin nu du script : `powershell.exe` le lirait comme une commande (`-Command`), ce qui casse dès qu'il y a un espace dans le chemin. On passe par `-File`, en dernier paramètre, avec le chemin entre guillemets (ici `C:\Scripts\Backup_DB.ps1`) :

```text
-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Scripts\Backup_DB.ps1"
```

`-ExecutionPolicy Bypass` ne vaut que pour cette exécution. La policy par défaut sur Windows Server (`RemoteSigned`) laisse passer un script écrit localement, mais bloque un script non signé téléchargé d'Internet, `Restricted` bloque tout `.ps1` et `AllSigned` tout script non signé. `Bypass` évite ces blocages, sauf si la policy est imposée par GPO : celle-ci l'emporte sur la ligne de commande. Si la policy du serveur laisse déjà passer le script, on peut le retirer.

Valider l'action en cliquant sur OK

**6)** Vous pouvez spécifier des Conditions ainsi que des Paramétres
spécifiques si besoin

**7)** Valider votre nouvelle tâche planifiée. Les informations
d'identification utilisateur peuvent vous être demandées
