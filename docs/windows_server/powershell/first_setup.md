# Setup de base d'un Windows 2012R2 
 
Lorsque nous installons un serveur Windows 2012R2, certaines étapes sont 
indispensables, les voici 
 
Ces étapes sont disponibles via le binaire **sconfig** 
 
## Renommage du serveur 
 
``` powershell 
Rename-Computer -Name DHCP1 
``` 
 
## Ajout au domaine 
 
-   **OU par défaut** 
 
``` powershell 
Add-Computer -DomainName "Domain01" -Restart 
``` 
 
-   **OU Prédéfinie** 
 
``` powershell 
Add-Computer -DomainName "Domain02" -OUPath "OU=testOU,DC=domain,DC=Domain,DC=com" -Restart 
``` 
