---
article: docs/os/windows/desktop/tips/install_main_softwares.md
checked: '2026-11-11'
commit: 609f7c9fa88280dd0adb4889c51495a71cfa1b70
sources: []
unpinned: 1
---

# docs/os/windows/desktop/tips/install_main_softwares.md

## Findings

- Aucun finding.

## En plus

- Rien.

## Modernisation

- Appliqué : paragraphe winget avec `winget export -o apps.json` puis `winget import -i apps.json`. Preuve : winget-cli origin/master `src/AppInstallerCLICore/Argument.cpp:156` (`import-file`, `-i`) et `:312` (`output`, `-o`), `Commands/ImportCommand.cpp:19`, `Commands/ExportCommand.cpp:18`.

## Tests

- Aucun (pas de Windows), vérification sur le source winget-cli cloné dans `~/Documents/work/src/winget-cli`.

## À signaler

- "fourni avec Windows 11" non testé sur une machine.
