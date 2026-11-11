---
article: docs/os/mac/iterm/troubleshooting/alt_arrow.md
checked: '2026-11-11'
commit: f9eca98b4556881fb0d4c193cd72cadd891866d4
sources: []
unpinned: 1
---

# docs/os/mac/iterm/troubleshooting/alt_arrow.md

## Findings

- L12 IMPRECISE corrigé : liste réécrite en français avec le chemin actuel, Settings (Preferences sur les vieilles versions) > Profiles > Keys > onglet Key Bindings, menu Presets… sous la liste, puis Natural Text Editing. Le fact-check proposait "Key Mappings", mais en 3.7.7 l'onglet s'appelle "Key Bindings". Preuve : iTerm2 v3.7.7 `sources/Settings/Base.lproj/PreferencePanel.xib:5988,6442` (vue "Prefs - Profiles - Keys", onglets General / Key Bindings), `sources/Settings/Base.lproj/iTermKeyMapping.xib:159` (popup "Presets…"), `plists/PresetKeyMappings.plist:321` (Natural Text Editing). L'item de menu reste "Preferences…" dans `MainMenu.xib:92`, macOS 13+ l'affiche "Settings…".

## En plus

- Rien.

## Modernisation

- Aucune suggestion.

## Tests

- iTerm2 3.7.7 installé localement (strings des nibs), clone `~/Documents/work/src/iTerm2` tag v3.7.7.

## À signaler

- Le renommage "Preferences" en "Settings" vient d'AppKit (macOS 13+), pas d'iTerm2 : non vérifié visuellement dans l'app.
