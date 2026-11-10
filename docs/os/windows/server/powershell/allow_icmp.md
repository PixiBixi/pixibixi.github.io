---
description: Activer les réponses ICMP (ping) sur Windows Server via une règle de pare-feu PowerShell
tags:
  - PowerShell
  - Firewall
---

# Autoriser l'ICMP sur un serveur Windows 2012R2 en PowerShell

Par défaut, Windows ne répond pas au ping : les règles de pare-feu qui autorisent l'ICMP Echo Request entrant (groupe « Partage de fichiers et d'imprimantes ») sont désactivées, ce qui n'est guère pratique. Les autres messages ICMP utiles au réseau (Destination Unreachable, Packet Too Big, Neighbor Discovery...) restent autorisés par les règles « Core Networking ». Voici comment réactiver le ping en quelques lignes de PowerShell.

On crée une règle par famille IP, le ping IPv6 passe par l'ICMPv6 type 128. On limite aux profils Domain et Private plutôt que `Any`, qui ouvrirait aussi le profil Public :

```powershell
Import-Module NetSecurity
New-NetFirewallRule -Name Allow_Ping -DisplayName "Allow Ping" -Description "Packet Internet Groper ICMPv4" -Protocol ICMPv4 -IcmpType 8 -Enabled True -Profile Domain,Private -Action Allow
New-NetFirewallRule -Name Allow_Ping6 -DisplayName "Allow Ping IPv6" -Description "Packet Internet Groper ICMPv6" -Protocol ICMPv6 -IcmpType 128 -Enabled True -Profile Domain,Private -Action Allow
```

On peut restreindre encore aux machines de supervision avec `-RemoteAddress 10.0.0.0/24`.

Autre option, on active les règles prédéfinies au lieu d'en créer de nouvelles. Leurs noms ne dépendent pas de la langue du système, on les vérifie d'abord avec `Get-NetFirewallRule -Name "FPS-ICMP*-ERQ-In*"` :

```powershell
Enable-NetFirewallRule -Name FPS-ICMP4-ERQ-In,FPS-ICMP6-ERQ-In
```
