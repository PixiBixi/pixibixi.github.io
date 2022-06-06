# Exécuter un script PowerShell via une tâche planifiée 
 
**1)** Ouvrir le Planificateur de tâches Panneau de configuration - 
Outils d'administrations - Planificateur de tâches 
 
**2)** Clique droit - Créer une nouvelle tâche 
 
![](/windows_server/admin/jobs/powershell_tache_01.png){.align-center} 
 
**3)** Configurer les options de base suivant vos besoins 
 
![](/windows_server/admin/jobs/powershell_tache_02.png){.align-center} 
 
'* **Nom :** Correspond au nom de votre tâche planifiée '* **Description 
:** Vous pouvez indiquer les détails, cela n'a pas d'importance '* 
**Exécuter même si l'utilisateur n'est pas connecté :** Permet 
dexécuter la tâche à n'importe quel moment (les informations 
d'identification utilisateur seront demandées) 
 
**4)** Cliquer sur l'onglet Déclencheurs - Cliquer sur Nouveau C'est 
ici que l'on configure la planification de la tâche. Il est possible 
d'ajouter autant de déclencheur que désiré. 
 
![](/windows_server/admin/jobs/powershell_tache_03.png){.align-center} 
 
**5)** Cliquer sur l'onglet Actions puis Nouveau Il est possible 
dexécuter plusieurs scripts/actions/programmes 
 
![](/windows_server/admin/jobs/powershell_tache_05.png){.align-center} 
 
Indiquer dans Programme/script : 
C:''Windows''System32''WindowsPowerShell''v1.0''powershell.exe Indiquer 
dans Ajouter des arguments : Le chemin de votre script PowerShell (ici 
C:''Scripts''Backup_DB.ps1) 
 
Valider l'action en cliquant sur OK 
 
**6)** Vous pouvez spécifier des Conditions ainsi que des Paramétres 
spécifiques si besoin 
 
**7)** Valider votre nouvelle tâche planifiée. Les informations 
d'identification utilisateur peuvent vous être demandées 
 
![](/windows_server/admin/jobs/powershell_tache_06.png){.align-center} 
