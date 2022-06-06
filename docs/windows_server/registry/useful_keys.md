# Clés de Registre Utiles 
 
Il arrive parfois que nous ayons des problèmes avec une VM, ou autre. 
Voici donc quelques clés de registre bien utiles : 
 
## Désactiver le Shutdown Event Tracker 
 
![](https://techan.fr/images/2017/06/Windows_Shutdown_Event_Tracker.png){.align-center} 
 
Le Shutdown Event Tracker est la fameuse page qui nous empêche 
d'éteindre directement notre serveur. 
 
Pour la désactiver voici la règle à modifier : 
 
``` powershell 
HKEY_LOCAL_MACHINE'SOFTWARE'Policies'Microsoft'Windows NT'Reliability'ShutdownReasonOn 
``` 
 
Il se peut que la clé n'existe pas. Dans ces cas-là, il suffit de la 
créer ayant comme type DWORD avec la valeur 0 
 
## Utiliser le DHCP 
 
Si vous n'arrivez plus à vous connecter à une VM ou autre, il se peut 
que ce soit un problème d'adresse IP. Il serait donc utile de pouvoir 
repasser en DHCP. 
 
Heureusement, ceci est possible via une simple ligne 
 
``` powershell 
HKEY_LOCAL_MACHINE'SYSTEM'CurrentControlSet'Services'{Adapter}'Parameters'Tcpip'EnableDHCP 
``` 
 
Il suffit de passer cette clé de 0 à 1. À noter qu'il est assez facile 
de reconnaitre les interfaces, étant donner que nous trouvons l'IP fixe 
quelques clés plus bas. 
 
## Activer l'Autologon 
 
**Attention, l'autologon est une faille de sécurité, mais il peut être 
utile dans certains cas** 
 
Pour l'activité, voici la clé à modifier : 
 
``` powershell 
HKLM'Software'Microsoft'Windows NT'CurrentVersion'winlogon'AutoAdminLogon 
``` 
 
Encore une fois, si la clé n'existe pas, créer la, de type DWORD. 1 
signifie un autologon activé, 0 désactivé 
 
Mais ce n'est pas tout. L'autologon est certes activé, mais il faut 
maintenant préciser l'username et le password. 
 
Pour cela, nous nous rendons dans le dossier suivant : 
 
``` powershell 
HKLM'Software'Microsoft'Windows NT'CurrentVersion'winlogon 
``` 
 
Et nous avons 2 clés de type STRING à créer : 
 
-   DefaultUserName 
-   DefaultPassword 
 
De plus, si nous utilisons une connexion via Active Directory, nous 
devons créer une 3ème clé : DefaultDomainName 
