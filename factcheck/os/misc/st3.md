---
article: docs/os/misc/st3.md
checked: '2026-11-10'
commit: 26b7a17547e3f46315654740a9e5519e65cdaf76
sources: []
unpinned: 8
---

# docs/os/misc/st3.md

## Findings

- L23 ERROR corrigé : "la majorité de ces paquets auront besoin de PHP (5.6.* minimum)" remplacé par "Seuls les plugins qui lancent PHP (phpcs, et CodeFormatter pour le formatage PHP) ont besoin d'un PHP installé". Preuve : README benmatselby/sublime-phpcs (`phpcs_php_path`, `phpcs_executable_path`) et akalongman/sublimetext-codeformatter (`php_path`) via `gh api .../readme`. Le fait que PHP Companion n'appelle pas de binaire PHP n'est pas vérifié.
- L2 OUTDATED corrigé : description et préambule précisent "écrit pour ST3, valable en grande partie sous ST4" (titre H1 inchangé, il ne mentionne pas de version). Preuve : Preferences.sublime-settings du build 4200 contient toujours les clés utilisées dans le fichier de config de l'article.
- L254 OUTDATED corrigé : PSR-2 remplacé par PSR-12 (avec mention du remplacement), liens en https. Preuve : <https://www.php-fig.org/psr/psr-2/> "As of 2019-08-10 PSR-2 has been marked as deprecated".
- L264 OUTDATED corrigé : admonition "Material Theme n'est plus maintenu", lien vers le miroir SublimeText/material-theme, paragraphe Appbar au passé sans lien mort. Preuve : `gh api repos/equinusocio/material-theme` redirige vers vira-soft/vira-assets ("official successor... premium version") ; README du miroir "This project is no longer maintained" ; release v41.5.0 "deprecated" ; `equinusocio/material-theme-appbar` 404.
- L221 IMPRECISE corrigé : Vintage est bien ignoré par défaut, mais l'article avait raison de le garder : un `ignored_packages` utilisateur remplace la liste par défaut. Formulation précisée. Preuve : Default.sublime-package/Preferences.sublime-settings build 4200 ligne 913 `"ignored_packages": ["Vintage"]`.
- L228 IMPRECISE corrigé : `overlay_scroll_bars` décrit comme "`enabled` force les barres en overlay, fines et masquées tant qu'on ne scrolle pas", valeurs listées. Preuve : même fichier ligne 644-645 `// Valid values are "system", "enabled" and "disabled"`, défaut `"system"`. La sémantique visuelle d'"overlay" vient de la convention macOS, pas d'un texte Sublime.
- L338 IMPRECISE corrigé : warning reformulé sans généralité chiffrée ("Beaucoup de plugins listés ici datent de ST2/ST3... on regarde la date du dernier commit"), et le conseil d'installer depuis Git plutôt que Package Control est retiré. Preuve : aucune source pour "la plupart" ; état de maintenance plugin par plugin non vérifié.
- L402 IMPRECISE corrigé : lien SFTP remplacé par codexns.io avec "(payant, licence à 30 $)". Preuve : `curl` wbond.net/sublime_packages/sftp en 301 vers https://codexns.io/products/sftp_for_sublime, page qui affiche "for $30".

## En plus

- L224 corrigé : `line_padding_bottom` et `line_padding_bottom` remplacé par `line_padding_top` et `line_padding_bottom`. Preuve : bloc de config juste au-dessus.
- L316, L317, L325, L326 corrigé : apostrophes parasites après les autoliens supprimées (artefact de conversion).
- Lien joshfrankel.me passé en https. Preuve : `curl` http en 301 vers https.

## Modernisation

- ST4 : mentionné dans le préambule et l'admonition (thème par défaut suffisant). Pas de mention "Adaptive" : le défaut du build 4200 est `"theme": "auto"`, je n'ai pas confirmé ce qu'il résout.
- PSR-12 : appliqué.
- LSP à la place des plugins de lint, format .sublime-color-scheme : non appliqué, ce serait une réécriture de l'article ; les blocs `color_scheme` `.tmTheme` restent ceux du Material Theme.

## Tests

- Téléchargement de sublime_text_build_4200_x64.tar.xz (scratchpad fc/st-dl), lecture de Packages/Default.sublime-package/Preferences.sublime-settings. API GitHub et curl pour les liens.

## À signaler

- Le fichier s'appelle encore `st3.md` (URL publique), non renommé.
- La liste des plugins n'a pas été vérifiée lien par lien (plusieurs ST2-era, ex. st2-zonefile).
