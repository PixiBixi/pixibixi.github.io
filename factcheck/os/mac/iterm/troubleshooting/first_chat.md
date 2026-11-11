---
article: docs/os/mac/iterm/troubleshooting/first_chat.md
checked: '2026-11-11'
commit: 0aa44a3e69a5a3cd85f397ebb0b61aac3af627a7
sources: []
unpinned: 1
---

# docs/os/mac/iterm/troubleshooting/first_chat.md

## Findings

- L15 IMPRECISE corrigé : chemin réécrit en "Settings > Profiles > Terminal, section Shell Integration (tout en bas)", libellé exact "Show mark indicators". Preuve : iTerm2 v3.7.7 `sources/Settings/Base.lproj/PreferencePanel.xib:5198` (checkbox "Show mark indicators"), `:4856` (label "Shell Integration:" dans la même vue), outlet dans `sources/Settings/ProfilesTerminalPreferencesViewController.m:62`.

## En plus

- L16 : les `'>` parasites (rendus tels quels) remplacés par `>`.

## Modernisation

- Aucune suggestion.

## Tests

- iTerm2 3.7.7 local (strings de PreferencePanel.nib), clone iTerm2 tag v3.7.7.

## À signaler

- Rien.
