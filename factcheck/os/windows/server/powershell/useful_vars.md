---
article: docs/os/windows/server/powershell/useful_vars.md
checked: '2026-11-11'
commit: b5ce803baed743cc762edfd9d4c2c488eeff16f9
sources: []
unpinned: 3
---

# docs/os/windows/server/powershell/useful_vars.md

## Findings

- L16 IMPRECISE corrigé : `USERDOMAIN` = domaine (NetBIOS) du compte courant, nom de la machine pour un compte local. Preuve : pas de page Microsoft officielle trouvée ; comportement documenté par plusieurs sources secondaires (fil Samba, forums) et constant sur Windows.
- L18 IMPRECISE corrigé : `LOGONSERVER` = DC pour un compte AD, `\\<machine>` pour un compte local, valeur figée à l'ouverture de session. Preuve : Microsoft Q&A "LOGONSERVER variable keep previous DC logon" (valeur périmée), KB 141714 (variable non documentée), fil Samba (vaut le nom de la machine hors domaine). Le cas "session en cache" du finding n'est pas confirmé par une source, non écrit.
- L20 IMPRECISE corrigé : `PROCESSOR_ARCHITECTURE` décrit l'architecture du processus, valeurs `AMD64`/`ARM64`/`x86`, et `PROCESSOR_ARCHITEW6432` dans un processus 32 bits. Preuve : learn.microsoft.com "WOW64 Implementation Details", table Environment Variables.

## En plus

- L23 : `PROGRAMFILES` vaut `Program Files (x86)` depuis un processus 32 bits, ajout de `$env:ProgramW6432`. Preuve : même table WOW64.

## Modernisation

- Aucune suggestion.

## Tests

- Aucun (pas de Windows disponible).

## À signaler

- Rien.
