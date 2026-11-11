---
article: docs/os/windows/server/powershell/storage/pool.md
checked: '2026-11-11'
commit: 73f54cf4eef1b64ec0ac2bf4059f5ab1e7f48b85
sources: []
unpinned: 2
---

# docs/os/windows/server/powershell/storage/pool.md

## Findings

- L21 IMPRECISE corrigé : avertissement que `Get-PhysicalDisk -CanPool $true` prend tous les disques vierges, et exemple avec des disques nommés. Preuve : learn.microsoft.com/en-us/windows-server/storage/storage-spaces/deploy-standalone-storage-spaces, "creates a new storage pool named StoragePool1 that uses all available disks" et exemple `(Get-PhysicalDisk PhysicalDisk1, PhysicalDisk2, ...)` repris tel quel.
- L26 IMPRECISE corrigé : mirror 2 copies = au moins 2 disques. Preuve : même page, "Requires at least two physical disks to protect from single disk failure".

## En plus

- Rien.

## Modernisation

- Appliqué : mirror 3 copies avec `-NumberOfDataCopies 3`, 5 disques minimum hors hot spares. Preuve : même page, exemple New-VirtualDisk et note "at least five physical disks".
- Non appliqué : `New-Volume`, syntaxe non vérifiée dans cette passe.

## Tests

- Aucun (pas de Windows Server disponible).

## À signaler

- Rien.
