# Autoriser l'ICMP sur un serveur Windows 2012R2 en PowerShell 
 
Par défaut, l'ICMP est disable sur les produits Windows ce qui n'est 
guère pratique. Voici comment le réactiver en simplement 2 lignes de 
PowerShell 
 
``` powershell 
Import-Module NetSecurity 
New-NetFirewallRule -Name Allow_Ping -DisplayName “Allow Ping”  -Description “Packet Internet Groper ICMPv4” -Protocol ICMPv4 -IcmpType 8 -Enabled True -Profile Any -Action Allow 
``` 
