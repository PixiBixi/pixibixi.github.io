---
article: docs/os/windows/server/powershell/install_drivers.md
checked: '2026-11-11'
commit: a8d214c23adb5899d8de465932cc7df865d93266
sources: []
unpinned: 1
---

# docs/os/windows/server/powershell/install_drivers.md

## Findings

- L16 IMPRECISE corrigé : on précise que `/add-driver` existe depuis Windows 10 1607 / Server 2016, et on ajoute la variante legacy `PNPUtil.exe -i -a` pour Server 2012 R2 et plus ancien (toujours acceptée sur les versions récentes). Preuve : learn.microsoft.com/windows-hardware/drivers/devtest/pnputil-command-syntax, "/add-driver ... Command available starting in Windows 10, version 1607" et section "Legacy Command Mapping" `-a [-i] <filename.inf> ==> /add-driver <filename.inf> [/install]`, "still supported, but are legacy".

## En plus

- Rien.

## Modernisation

- Appliqué : `pnputil.exe /add-driver "C:\mydrivers\*.inf" /subdirs /install` en commande principale. Preuve : même page, `PNPUTIL /add-driver <filename.inf | *.inf> [/subdirs] [/install] [/reboot]`, "/subdirs - traverse sub directories for driver packages", disponible depuis 1607. La boucle Get-ChildItem d'origine est conservée comme alternative.

## Tests

- Aucun (pas de Windows disponible), vérification documentaire seulement.

## À signaler

- Rien.
