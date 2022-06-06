# Initier des connexions iSCSi en CLI 
 
Pour initier une connexion iSCSi en PowerShell, quelques étapes sont 
nécessaires. 
 
On démarre le service et on le met en démarrage automatique 
 
``` powershell 
Start-Service msiscsi 
Set-Service msiscsi -StartupType "Automatic" 
``` 
 
On initie la connexion vers le serveur iSCSi 
 
``` powershell 
New-IscsiTargetPortal -TargetPortalAddress $IP_ISCSI 
``` 
 
On vérifie que la connexion est initialisée et que nous voyons les LUN 
 
``` powershell 
Get-IscsiTarget 
IsConnected NodeAddress                                        PSComputerName 
----------- -----------                                        -------------- 
      False iqn.2000-01.com.synology:NASCL.WITNESS.44034fd745 
      False iqn.2000-01.com.synology:NASCL.LUN-VM.44034fd745 
      False iqn.2000-01.com.synology:NASCL.LUN-DATA.44034fd745 
``` 
 
Nous voyons ici nos 3 différentes LUN qui sont déconnectées. 
 
Nous pouvons connecter toutes nos LUNs de manière persistente d'un coup 
à l'aide d'un *foreach* 
 
``` powershell 
foreach($a in (Get-IscsiTarget).NodeAddress) { Connect-IscsiTarget -NodeAddress $a -IsPersistent $true } 
``` 
 
Ou alors on connecte le node que l'on veut : 
 
``` powershell 
Connect-IscsiTarget -NodeAddress iqn.2000-01.com.synology:NASCL.WITNESS.44034fd745 -IsPersistent $true 
``` 
 
On peut vérifier que le disque est bien monté avec **Get-Disk** 
