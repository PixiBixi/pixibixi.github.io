---
article: docs/automation/terraform/cheatsheet.md
checked: '2026-11-11'
commit: 4fe078a1d515deaa5c77957d51e835958b1999b7
sources: []
unpinned: 1
---

# docs/automation/terraform/cheatsheet.md

## Findings

- Aucun finding.

## En plus

- `terraform get -update=true` simplifié en `terraform get -update` (les deux marchent). Preuve : `terraform get -update=true` et `terraform get -update` rc=0 sur Terraform v1.16.5.

## Modernisation

- Appliqué : ajout de `terraform init -upgrade` (modules et providers dans les contraintes de version). Preuve : `terraform init -help` v1.16.5 ("Install the latest module and provider versions allowed within configured constraints"), `terraform get -help` dit lui-même "you should rarely need to run this command separately".

## Tests

- Terraform v1.16.5 local (Homebrew).

## À signaler

- Rien.
