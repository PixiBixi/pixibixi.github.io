# Désactiver TLSv1 et TLSv1.1

![](/windows_server/powershell/tls.png){.align-center}

Ces 2 protocoles sont mort et devraient être désactivés depuis
longtemps, voici la solution :

Tout d'abord, nous avons besoin de ce script PowerShell :

```powershell
[CmdletBinding()]
Param(
[Parameter(Mandatory=$True)]
[ValidateSet("SSL30","TLS10","TLS11","TLS12")]
[string]$Proto,
[ValidateSet("Client","Server")]
[string]$Target,
[Parameter(Mandatory=$True)]
[ValidateSet("Enable","Disable")]
$Action)

Function CheckKey{
param(
[string]$Proto
)
$RegKey = $null

switch ($Proto){
   SSL30 {$RegKey = "HKLM:'SYSTEM'CurrentControlSet'Control'SecurityProviders'SCHANNEL'Protocols'SSL 3.0"}
   TLS10 {$RegKey = "HKLM:'SYSTEM'CurrentControlSet'Control'SecurityProviders'SCHANNEL'Protocols'TLS 1.0"}
   TLS11 {$RegKey = "HKLM:'SYSTEM'CurrentControlSet'Control'SecurityProviders'SCHANNEL'Protocols'TLS 1.1"}
   TLS12 {$RegKey = "HKLM:'SYSTEM'CurrentControlSet'Control'SecurityProviders'SCHANNEL'Protocols'TLS 1.2"}
   default{"Not supported protocol. Possible values: SSL30, TLS10, TLS11, TLS12"
            exit}
  }
return $Regkey
}

$RegKey = CheckKey -Proto $Proto
[string[]]$TargetKey = $null
if(!($Target)){
  Write-Host "Setting up both Client and Server protocols"
  $TargetKey = $(Join-Path $RegKey "Client").ToString()
  $TargetKey += $(Join-Path $RegKey "Server").ToString()
  if(!(Test-path -Path $TargetKey[0])){
       New-Item $TargetKey[0] -Force
   }
  if(!(Test-path -Path $TargetKey[1])){
       New-Item $TargetKey[1] -Force
    }
  }
else{
  Write-Host "Setting up $Target protocols"
  $TargetKey = $(Join-Path $RegKey $Target).ToString()
  if(!(Test-path -Path $(Join-Path $RegKey $Target))){
       New-Item $TargetKey -Force
    }
 }

Function SetProto{
param(

[string[]]$TargetKey,
[string]$Action
)

foreach($key in  $TargetKey){
   try{
       Get-ItemProperty -Path $key -Name "Enabled" -ErrorAction Stop | Out-Null
       if($Action -eq "Disable"){
          Write-Host "`t`Updating $key"
          Set-ItemProperty -Path $key -Name "Enabled" -Value 0 -Type "DWord"
         }
       else{
          Write-Host "`t`Updating $key"
          Set-ItemProperty -Path $key -Name "Enabled" -Value 1 -Type "DWord"
         }
      }Catch [System.Management.Automation.PSArgumentException]{
          if($Action -eq "Disable"){
             Write-Host "`t`Creating $key"
             New-ItemProperty -Path $key -Name "Enabled" -Value 0 -PropertyType "DWord"
            }
          else{
             Write-Host "`t`Creating $key"
             New-ItemProperty -Path $key -Name "Enabled" -Value 1 -PropertyType "DWord"
           }
       }

try{
     Get-ItemProperty -Path $key -Name "DisabledByDefault" -ErrorAction Stop | Out-Null
     if($Action -eq "Disable"){
        Write-Host "`t`Updating $key"
        Set-ItemProperty -Path $key -Name "DisabledByDefault" -Value 1 -Type "DWord"
       }
     else{
        Write-Host "`t`Updating $key"
        Set-ItemProperty -Path $key -Name "DisabledByDefault" -Value 0 -Type "DWord"
        }
     }Catch [System.Management.Automation.PSArgumentException]{
        if($Action -eq "Disable"){
           Write-Host "`t`Creating $key"
           New-ItemProperty -Path $key -Name "DisabledByDefault" -Value 1 -PropertyType "DWord"
          }
        else{
           Write-Host "`t`Creating $key"
           New-ItemProperty -Path $key -Name "DisabledByDefault" -Value 0 -PropertyType "DWord"
          }
     }
  }
}

SetProto -TargetKey $TargetKey -Action $Action

Write-Host "The operation completed successfully, reboot is required" -ForegroundColor Green
```

Nous pouvons observer les paramètres du script :

```powershell
[CmdletBinding()]
Param(
[Parameter(Mandatory=$True)]
[ValidateSet("SSL30","TLS10","TLS11","TLS12")]
[string]$Proto,
[ValidateSet("Client","Server")]
[string]$Target,
[Parameter(Mandatory=$True)]
[ValidateSet("Enable","Disable")]
```

Le **premier** protocole concerne le protocole, 4 sont disponibles :
SSL3, TLS1.0, TLS1.1 et TLS1.2 et est obligatoire.

Le **second** paramètre est facultatif, il s'agit de savoir si l'on
applique au client-side ou au server-side. Si ce paramètre n'est pas
spécifié, le script agira pour le client et pour le serveur

Et enfin le **dernier** s'agit de savoir si l'on veut activer ou
désactiver le protocole

Voici un simple exemple pour désactiver SSL3 côté client :

![](/windows_server/powershell/disabling-ssl-3.0-for-a-client-and-server.png){.align-center}

Pour plus d'informations détaillé sur le script, je vous renvoie vers
la
[source](https://4sysops.com/archives/disable-ssl-and-tls-1-01-1-on-iis-with-powershell/)
