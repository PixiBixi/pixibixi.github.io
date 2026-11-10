---
description: Clés de registre Windows utiles - Shutdown Event Tracker, DHCP, autologon et paramètres de dépannage
tags:
  - Windows
  - Registry
---

# Windows : clés de registre utiles

Il arrive parfois que nous ayons des problèmes avec une VM, ou autre.
Voici donc quelques clés de registre bien utiles :

## Désactiver le Shutdown Event Tracker

Le Shutdown Event Tracker est la fameuse page qui nous empêche
d'éteindre directement notre serveur.

Pour la désactiver, on modifie la valeur `ShutdownReasonOn` dans cette clé :

```text
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows NT\Reliability
```

Il se peut que la valeur n'existe pas. Dans ces cas-là, il suffit de la créer en DWORD avec la valeur 0

## Utiliser le DHCP

Si vous n'arrivez plus à vous connecter à une VM ou autre, il se peut
que ce soit un problème d'adresse IP. Il serait donc utile de pouvoir
repasser en DHCP.

Heureusement, ceci est possible via une simple valeur, `EnableDHCP`, dans la clé de l'interface (une sous-clé par GUID d'interface) :

```text
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{GUID}
```

Il suffit de passer `EnableDHCP` (DWORD) de 0 à 1. On reconnaît assez facilement la bonne interface : l'IP fixe est dans la valeur `IPAddress` de la même clé.

## Activer l'Autologon

!!! danger
    L'autologon est une faille de sécurité - les credentials sont stockés en clair dans le registre. À utiliser uniquement sur des postes physiquement sécurisés.

Pour l'activer, on modifie la valeur `AutoAdminLogon` de cette clé :

```text
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
```

Encore une fois, si la valeur n'existe pas, on la crée, de type chaîne (REG_SZ) et pas DWORD : `1` signifie un autologon activé, `0` désactivé

Mais ce n'est pas tout. L'autologon est certes activé, mais il faut
maintenant préciser l'username et le password.

Pour cela, nous restons dans la même clé :

```text
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
```

Et nous avons 2 valeurs de type chaîne (REG_SZ) à créer :

* DefaultUserName
* DefaultPassword

De plus, si nous utilisons une connexion via Active Directory, nous
devons créer une 3ème valeur : DefaultDomainName (le FQDN du domaine, `contoso.com` par exemple).

Sans `DefaultPassword`, Windows repasse tout seul `AutoAdminLogon` à 0. Pour éviter le mot de passe en clair, l'outil Sysinternals [Autologon](https://learn.microsoft.com/en-us/sysinternals/downloads/autologon) configure la même chose mais stocke le mot de passe dans un secret LSA plutôt que dans la clé Winlogon.
