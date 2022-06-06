# Installer des drivers via PowerShell 
 
Quand nous utilisons Windows Core, nous ne pouvons pas installer de 
drivers via interface graphique. 
 
Voici donc la commande pour les installer 
 
``` powershell 
Get-ChildItem "C:'mydrivers'" -Recurse -Filter "*.inf" | ForEach-Object { PNPUtil.exe /add-driver $_.FullName /install } 
``` 
