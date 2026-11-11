---
article: docs/os/windows/server/powershell/initiate_iscsi.md
checked: '2026-11-11'
commit: eb911124134eb05e1eb26fc298319c69a680ac97
sources: []
unpinned: 1
---

# docs/os/windows/server/powershell/initiate_iscsi.md

## Findings

- L37 IMPRECISE corrigé : "nos 3 différentes LUN" devient "nos 3 targets (identifiées par leur IQN)", avec la précision que sur ce Synology chaque target expose une LUN mais qu'une target peut en porter plusieurs. Même correction L26 ("voyons les targets"), L39 ("toutes nos targets"), L46 ("la target que l'on veut" au lieu de "le node"), et L52 précise que les LUN apparaissent comme disques une fois les targets connectées. Preuve : doc Microsoft Get-IscsiTarget (learn.microsoft.com/powershell/module/iscsi/get-iscsitarget), "returns an iSCSI target object for each iSCSI target that is registered with the iSCSI initiator", et `-NodeAddress` "Specifies the IQN of the discovered target".

## En plus

- L39 coquille "persistente" corrigée en "persistante".

## Modernisation

- Aucune suggestion.

## Tests

- Aucun (pas de Windows Server disponible), vérification documentaire seulement.

## À signaler

- Rien.
