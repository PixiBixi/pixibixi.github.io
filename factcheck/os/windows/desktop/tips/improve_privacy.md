---
article: docs/os/windows/desktop/tips/improve_privacy.md
checked: '2026-11-11'
commit: 964b109b9709b8389483270db5a37f2c02d5e534
sources: []
unpinned: 5
---

# docs/os/windows/desktop/tips/improve_privacy.md

## Findings

- L22 ERROR corrigé : `*ZuneMusic*` retiré et `*Xbox*` remplacé par `Microsoft.XboxApp`, avec une liste qui explique pourquoi (Media Player, Xbox Identity Provider / TCUI) ; phrase avant le bloc qui précise "utilisateur courant uniquement". Preuve : Raphire/Win11Debloat origin/HEAD Config/Languages/en-US/Apps.json `Microsoft.ZuneMusic` FriendlyName "Media Player", `Microsoft.XboxIdentityProvider` "Xbox sign-in framework, required for some games and Xbox services" ; Config/Apps.json : ZuneMusic "optional", XboxIdentityProvider et Xbox.TCUI "unsafe", XboxApp "safe".
- L2 OUTDATED corrigé : description alignée sur le corps (HardenTools, O&O ShutUp10++, Win11Debloat, Sophia Script) et sur Windows 11 ; intro mentionne la fin de support de Windows 10 au 14 octobre 2025. Preuve : corps de l'article ; date de fin de support Microsoft (connue, page support citée par le fact-check non relue).
- L13 IMPRECISE corrigé : lien vers github.com/hardentools/hardentools, "Projet né chez Security Without Borders, dernière release v2.6 en août 2025". Preuve : `gh api repos/securitywithoutborders/hardentools` renvoie `hardentools/hardentools` (redirection) ; `gh api .../releases/latest` : v2.6 2025-08-09 ; README Credits : Claudio Guarnieri, Mariano Graziano, Florian Probst.
- L14 IMPRECISE corrigé : "Cortana" retiré de la description d'O&O ShutUp10++. Preuve : Win11Debloat Apps.json `Microsoft.549981C3F5F10` "Microsoft Cortana voice assistant (discontinued)". Le contenu actuel d'O&O ShutUp10++ n'a pas été vérifié.
- L20 IMPRECISE rejeté : la ligne `*3DBuilder*` est gardée. Elle est sans effet si l'app est absente, et utile sur un Windows 10 ou un Windows 11 mis à jour depuis 10 ; Win11Debloat la garde aussi dans sa sélection par défaut. Preuve : Config/Apps.json `Microsoft.3DBuilder` SelectedByDefault true. Le "pas préinstallé sous Windows 11" n'est pas vérifié (pas de Windows sous la main).

## En plus

- HardenTools n'applique ses réglages qu'au compte qui le lance, ajouté. Preuve : hardentools README.md origin/HEAD "the modifications made by Hardentools are exclusively contextual to the Windows user account used to run the tool from".

## Modernisation

- Cibler Windows 11 : appliqué (description, intro).
- Préférer Win11Debloat / Sophia au script artisanal : appliqué (une phrase sur Win11Debloat, le script reste pour un nettoyage à la main).

## Tests

- Aucun test Windows possible. Sources : clones ~/Documents/work/src/Win11Debloat et ~/Documents/work/src/hardentools (nouveaux), API GitHub.

## À signaler

- Rien.
