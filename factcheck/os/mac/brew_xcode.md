---
article: docs/os/mac/brew_xcode.md
checked: '2026-11-11'
commit: c2a5657caa839d7cc99601f82ae27b3fc080a1d5
sources: []
unpinned: 2
---

# docs/os/mac/brew_xcode.md

## Findings

- L11 IMPRECISE corrigé : la prémisse "il faut passer par Xcode" remplacée par "Homebrew n'a besoin que des Command Line Tools, pour compiler depuis les sources ou installer les bottles sur Intel". Preuve : Homebrew-brew docs/Installation.md:40-42 et note 3 (L205) @origin/HEAD ("On Apple Silicon, casks and bottles can be installed without developer tools. Intel macOS also requires developer tools for bottle installation.")
- L15 IMPRECISE corrigé : ajout de la commande d'installation officielle et d'un renvoi vers brew.md#letape-que-le-script-ne-fait-pas-pour-vous pour le PATH /opt/homebrew sur Apple Silicon ; mention que le script propose lui-même les CLT. Preuve : Homebrew-install install.sh:446 (should_install_command_line_tools), L781-920 (softwareupdate puis xcode-select --install) @7986efa

## En plus

- "finit" corrigé en "finie" dans la phrase réécrite.

## Modernisation

- Renvoi vers os/mac/brew.md appliqué (ancre calculée avec markdown.extensions.toc.slugify).

## Tests

- Aucun test exécuté (macOS install non rejoué), vérification sur les sources Homebrew locales.

## À signaler

- L'article recoupe fortement brew.md (section Installation) : à fusionner en redirect si l'auteur le souhaite.
