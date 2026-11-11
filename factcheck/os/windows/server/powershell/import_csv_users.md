---
article: docs/os/windows/server/powershell/import_csv_users.md
checked: '2026-11-11'
commit: 9af36f5451575565b1dd868b53a57e25416a0df0
sources: []
unpinned: 3
---

# docs/os/windows/server/powershell/import_csv_users.md

## Findings

- L50 ERROR corrigé : le login de Jerry GOLAY est `golayje`, pas `jerrygo` ; le paragraphe est réécrit en conséquence. Preuve : pwsh 7.4 (mcr.microsoft.com/powershell:7.4-ubuntu-22.04) avec la logique du script -> `golayje`.
- L40 IMPRECISE corrigé : ajout de `$upnSuffix = "test.com"` et `-UserPrincipalName "$login@$upnSuffix"`. Preuve : doc New-ADUser (learn.microsoft.com, windowsserver2025-ps) : « Specifies a user principal name (UPN) in the format `<user>@<DNS-domain-name>` » ; interpolation testée sous pwsh 7.4 -> `golayje@test.com`.
- L51 IMPRECISE corrigé : le script tronque maintenant le login à 20 caractères (`if ($login.Length -gt 20) { $login = $login.Substring(0, 20) }`), le `.ToLower()` est fait une seule fois. Preuve : doc New-ADUser -SamAccountName : « To be compatible with older operating systems, create a SAM account name that is 20 characters or less » ; troncature testée sous pwsh 7.4 (24 caractères -> 20). Que New-ADUser échoue au-delà de 20 n'est pas vérifié (pas d'AD sous la main), la phrase de l'article parle donc de compatibilité.

## En plus

- Aucun (le paragraphe final réécrit passe en « on »/impersonnel au passage).

## Modernisation

- Troncature à 20 caractères : appliquée (voir L51).
- Mot de passe aléatoire par compte : non appliqué. Il faudrait aussi sortir les mots de passe générés quelque part (fichier, affichage), ce qui change la nature du script ; à décider par l'auteur.

## Tests

- Docker mcr.microsoft.com/powershell:7.4-ubuntu-22.04 (amd64 émulé) pour la logique de chaîne. New-ADUser lui-même non testé (pas d'Active Directory).

## À signaler

- Le mot de passe en dur `P@ssw0rd69` identique pour tous reste dans le script (avec ChangePasswordAtLogon).
- Le `catch` affiche `Probleme $name` sans l'erreur ; `Write-Output "Probleme $name : $_"` aiderait, non appliqué.
- Le texte de l'article garde des « nous » et la coquille « une lister d'utilisateur » en intro, non touchés.
