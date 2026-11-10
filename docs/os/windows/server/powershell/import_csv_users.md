---
description: Importer des comptes utilisateurs en masse dans Active Directory depuis un fichier CSV avec PowerShell
tags:
  - PowerShell
  - Active Directory
---

# Importer des utilisateurs CSV dans un AD via PowerShell

Pour importer une lister d'utilisateur dans un Active Directory, nous
utilisons une liste CSV ainsi qu'un script PowerShell.

```csv
lastName;firstName;ou
Golay;Jerry;OU=_Users,DC=test,DC=com
```

Dans cet exemple, notre utilisateur s'appelle Jerry GOLAY et sera créé
dans l'OU `_Users` de **test.com**

Concernant le script PS1 :

```powershell
Import-Module ActiveDirectory
Import-Module Microsoft.PowerShell.Security

$users = Import-Csv -Delimiter ";" -Path "C:\tmp\add_users.csv"
$upnSuffix = "test.com"

foreach($user in $users)
{
    $name = $user.lastName + " " + $user.firstName
    $fname = $user.firstName
    $lname = $user.lastName
    $password = "P@ssw0rd69"
    $strippedFname = $fname[0..1] -join ""
    $login = ($lname + $strippedFname).ToLower()
    if ($login.Length -gt 20) { $login = $login.Substring(0, 20) }
    $ou = $user.ou

    try {
        New-ADUser  -Name $name -ChangePasswordAtLogon $true -SamAccountName $login -UserPrincipalName "$login@$upnSuffix" -DisplayName "$name" -GivenName $fname -Surname $lname -AccountPassword (ConvertTo-SecureString $password -AsPlainText -Force) -Path $ou -Enabled $true
    } catch {
        Write-Output "Probleme $name"
    }
}
```

Le login est le nom de famille + les 2 premières lettres du prénom, en minuscules : pour Jerry GOLAY, ça donne `golayje`, et son UPN est `golayje@test.com` (`$upnSuffix` est à adapter au domaine). Le login est tronqué à **20 caractères** : c'est la limite du `sAMAccountName` pour rester compatible avec les anciens clients Windows.
