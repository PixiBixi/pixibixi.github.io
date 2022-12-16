# Importer des utilisateurs CSV dans un AD via PowerShell

Pour importer une lister d'utilisateur dans un Active Directory, nous
utilisons une liste CSV ainsi qu'un script PowerShell.

``` csv
lastName;firstName;ou
Golay;Jerry;OU=_Users,DC=test,DC=com
```

Dans cet exemple, notre utilisateur s'appelle Jerry GOLAY et sera créé
dans l'OU **'_Users** de **test.com**

Concernant le script PS1 :

``` powershell
Import-Module ActiveDirectory
Import-Module Microsoft.PowerShell.Security

$users = Import-Csv -Delimiter ";" -Path "C:'tmp'add_users.csv"

foreach($user in $users)
{
    $name = $user.lastName + " " + $user.firstName
    $fname = $user.firstName
    $lname = $user.lastName
    $password = "P@ssw0rd69"
    $strippedFname = $fname[0..1] -join ""
    $login = $lname + $strippedFname
    $ou = $user.ou

    try {
        New-ADUser  -Name $name -ChangePasswordAtLogon $true -SamAccountName $login.ToLower() -UserPrincipalName $login.ToLower() -DisplayName "$name" -GivenName $fname -Surname $lname -AccountPassword (ConvertTo-SecureString $password -AsPlainText -Force) -Path $ou -Enabled $true
    } catch {
        Write-Output "Probleme $name"
    }
}
```

Comme vous pouvez le voir, nous utilisons le nom de famille + les 2
premières lettre du prénom en tant que login.

Dans notre cas, le login de Jerry GOLAY serait jerrygo. Ceci étant
effectué car l'Active Directory nous impose une limite de **20
caractères** pour le login
