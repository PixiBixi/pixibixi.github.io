---
article: docs/os/windows/server/powershell/dhcp_server.md
checked: '2026-11-11'
commit: 5636054a6cfd718524f7b0e61e88a1eb0710a5eb
sources: []
unpinned: 5
---

# docs/os/windows/server/powershell/dhcp_server.md

## Findings

- L87 ERROR corrigé : "Autre manière" utilise `Set-DhcpServerv4OptionValue -OptionId N -Value ...` (niveau serveur, `-ScopeId` pour un scope) + une phrase sur `Set-DhcpServerv4OptionDefinition` qui ne distribue rien. Preuve : learn.microsoft.com Set-DhcpServerv4OptionDefinition "modifies the properties of an existing IPv4 option definition"; Set-DhcpServerv4OptionValue syntaxe OptionIds (`-Value`, `-OptionId`) et "If you specify neither the ScopeId nor ReservedIP parameter, the option values are set at the server level".
- L27 IMPRECISE corrigé : la phrase dit que la cmdlet crée les groupes locaux DHCP Users et DHCP Administrators. Preuve : learn.microsoft.com Add-DhcpServerSecurityGroup "The cmdlet adds the DHCP Users and DHCP Administrators security groups."
- L106 IMPRECISE corrigé : "bail extrêmement long" remplacé par "l'adresse est toujours attribuée à la même MAC, quel que soit le bail". Preuve : aucune option de durée de bail dans Add-DhcpServerv4Reservation (non rechargée), définition d'une réservation.
- L158 IMPRECISE corrigé : `-Lease` -> `-Leases`. Preuve : learn.microsoft.com Export-DhcpServer, paramètre `-Leases` "Specifies that IP address leases is also exported."
- L167 IMPRECISE corrigé : en dash retirés de `Invoke-DhcpServerv4FailoverReplication -ComputerName` et de `Import-Csv -Path` (L129). Preuve : pwsh 7.4.6 (mcr.microsoft.com/powershell:7.4-ubuntu-22.04) : `Get<U+2013>Date` -> "is not recognized as a name of a cmdlet", alors que `Get-Date <U+2013>Format yyyy` passe (le en dash est toléré en préfixe de paramètre, pas dans un nom de commande).

## En plus

- Typo "perment" -> "permet" (L61).
- "procéder existe" -> "procéder existent".

## Modernisation

- Ignoré : flag `ConfigurationState` du registre après `Add-DhcpServerInDC`, non vérifié.

## Tests

- Docker mcr.microsoft.com/powershell:7.4-ubuntu-22.04 (pwsh 7.4.6) pour le tokenizer. Les cmdlets DhcpServer n'ont pas été exécutées (pas de Windows Server).

## À signaler

- Rien.
