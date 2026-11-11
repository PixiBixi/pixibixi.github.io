---
article: docs/os/windows/server/powershell/first_setup.md
checked: '2026-11-10'
commit: 428294bb2918208fdddec8d2e8553b4b1967e7b0
sources: []
unpinned: 3
---

# docs/os/windows/server/powershell/first_setup.md

## Findings

- L21 ERROR corrigé : `Rename-Computer -Name DHCP1` devient `Rename-Computer -NewName DHCP1 -Restart`. Preuve : PowerShell/PowerShell @1aac7f5e3 src/Microsoft.PowerShell.Commands.Management/commands/management/Computer.cs:1330-1332 `[Parameter(Mandatory = true, Position = 0, ...)] public string NewName`, aucun paramètre ni alias `Name` dans RenameComputerCommand (-Name n'est pas non plus un préfixe d'un paramètre existant)
- L21 IMPRECISE corrigé : ajout de `-Restart` et d'une phrase "effectif après redémarrage". Preuve : Computer.cs:1351 `public SwitchParameter Restart` ; doc MS Add-Computer/Rename-Computer "A restart is often required to make the change effective"
- L29 IMPRECISE corrigé : `-Credential "Domain01\Admin01"` ajouté aux deux exemples, avec une phrase : obligatoire pour un domaine, sinon prompt interactif. Preuve : learn.microsoft.com Add-Computer (5.1, WebFetch) : syntaxe Domain `-Credential <PSCredential>` non entre crochets, "Parameter sets Domain ... Mandatory: True" (un paramètre obligatoire manquant déclenche le prompt PowerShell)

## En plus

- Précision que `Add-Computer` n'existe que dans Windows PowerShell 5.1. Preuve : aucune classe `VerbsCommon.Add, "Computer"` dans le source PowerShell 7 (`git grep` sur origin/HEAD de src/) ; la page MS n'existe qu'en moniker powershell-5.1

## Modernisation

- Appliqué : exemple `Add-Computer -NewName ... -Credential ... -Restart` pour renommer et joindre en un seul redémarrage. Preuve : doc MS -NewName "Specifies a new name for the computer in the new domain", option JoinWithNewName "set automatically" avec -NewName

## Tests

- Aucun test exécuté (pas de Windows disponible) ; source PowerShell 7 (clone ajouté : ~/Documents/work/src/PowerShell, --filter=blob:none --no-checkout) et doc Microsoft Learn pour la partie 5.1, dont le source n'est pas public
- markdownlint-cli2 0.23.0, check_code_blocks.py : OK

## À signaler

- Titre et intro restent centrés sur 2012 R2 (EOL octobre 2023, avertissement déjà présent et correct). L'auteur peut vouloir généraliser le titre à Windows Server
