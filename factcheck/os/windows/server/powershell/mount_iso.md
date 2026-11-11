---
article: docs/os/windows/server/powershell/mount_iso.md
checked: '2026-11-11'
commit: aed073e47722c867c4d5008603e9c7d5c23d636f
sources: []
unpinned: 1
---

# docs/os/windows/server/powershell/mount_iso.md

## Findings

- L10 ERROR corrigé : "Server 2008" remplacé par "Server 2012", avec la précision que sur Windows Server 2012 seul un administrateur peut monter ou éjecter un ISO. Preuve : doc Microsoft Mount-DiskImage (learn.microsoft.com/powershell/module/storage/mount-diskimage) : "Administrator privileges are not needed to mount an ISO file on Windows 8. On Windows Server 2012, only an administrator is allowed to mount or eject an ISO file."

## En plus

- Paragraphes touchés repassés en "on" (au lieu de "nous"/"vous"), phrase ajoutée avant le bloc de démontage.

## Modernisation

- Appliquée : `Mount-DiskImage ... -PassThru | Get-Volume` pour récupérer la lettre directement. Preuve : doc Get-Volume, paramètre `-DiskImage` "Value from pipeline: True", Inputs `MSFT_DiskImage` ; doc Mount-DiskImage : `-PassThru` renvoie l'objet DiskImage monté.

## Tests

- Aucun (pas de Windows disponible). Vérifié sur la doc Microsoft uniquement.

## À signaler

- Rien.
