---
article: docs/os/windows/server/registry/useful_keys.md
checked: '2026-11-11'
commit: 4cad5c6fac893fe13b84eff0f711afd3ead479b4
sources: []
unpinned: 3
---

# docs/os/windows/server/registry/useful_keys.md

## Findings

- L54 ERROR corrigé : AutoAdminLogon est une valeur chaîne (REG_SZ) à `1`, plus DWORD ; DefaultUserName/DefaultPassword aussi présentés comme REG_SZ. Preuve : learn.microsoft.com/en-us/troubleshoot/windows-server/user-profiles-and-logon/turn-on-automatic-logon : « select New, and then point to String Value. Type AutoAdminLogon ».
- L21 IMPRECISE corrigé : tous les chemins passent en antislashs, avec la forme clé + nom de valeur séparés (la valeur n'est plus collée au chemin comme si c'était une clé), fences `text` au lieu de `powershell`. Preuve : chemins de la doc Microsoft ci-dessus (`HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon`) et Policy CSP ADMX_Reliability (`Software\Policies\Microsoft\Windows NT\Reliability`, valeur `ShutdownReasonOn`).
- L36 IMPRECISE corrigé : chemin `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{GUID}`, valeur `EnableDHCP` (DWORD), l'IP fixe est la valeur `IPAddress` de la même clé. Preuve : learn.microsoft.com « TCP/IP and NBT configuration parameters » (clé `Tcpip\Parameters\Interfaces\ID for Adapter`, EnableDHCP REG_DWORD 0/1, IPAddress). Page écrite pour XP, pas de doc trouvée spécifique à Windows 10/11 ; non testé sur une machine Windows.

## En plus

- « Pour l'activité » -> « Pour l'activer ».
- Ajout (doc Microsoft ci-dessus) : sans DefaultPassword, Windows repasse AutoAdminLogon à 0 ; DefaultDomainName = FQDN du domaine.

## Modernisation

- Sysinternals Autologon (mot de passe en secret LSA) : appliqué, une phrase avec lien, sourcé par la même page Microsoft.
- `Set-NetIPInterface -Dhcp Enabled` : non appliqué. Le paramètre existe (doc NetTCPIP), mais je n'ai pas pu vérifier sur Windows si l'IP statique est retirée ou s'il faut un `Remove-NetIPAddress` en plus ; ça risquait d'induire en erreur sur une VM injoignable.

## Tests

- Aucun test possible (pas de Windows) ; uniquement docs Microsoft.

## À signaler

- Le Shutdown Event Tracker est maintenant un réglage de stratégie (Policies) : une GPO de domaine peut l'écraser. Non ajouté.
