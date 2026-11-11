---
article: docs/os/mac/brew.md
checked: '2026-11-11'
commit: e05412d9ddd5b115b65695d45ce7045913447794
sources: []
unpinned: 5
---

# docs/os/mac/brew.md

## Findings

- L59 ERROR corrigé : `brew upgrade` met à jour formules et casks ; seuls les casks `auto_updates true` et `version :latest` sont sautés, `--greedy`, `--greedy-auto-updates`, `--greedy-latest` les incluent, `--cask` limite aux casks. Exemple réécrit. Preuve : `brew upgrade --help` sur Homebrew 7.0.12 local (« Upgrade outdated, unpinned packages », options greedy citées).
- L20 IMPRECISE corrigé : « avant 2019 » -> « avant 2020 (passage à install.sh en janvier 2020), script Ruby supprimé en 2023 ». Preuve : clone Homebrew/install : 1a209f5 2020-01-23 « git mv install install.sh », 135edd1 2020-01-24 « add deprecation notice in the Ruby script », 330d461 2023-01-18 « {,un}install: delete. ».
- L77 IMPRECISE corrigé, et plus grave que le finding : `--describe` n'est pas « toujours accepté », il est refusé. Commande remplacée par `brew bundle dump --force --file=~/Brewfile`, texte : descriptions par défaut, `--no-describe` pour les retirer, `--force` pour écraser. Preuve : Homebrew 7.0.12 local : `brew bundle dump --describe` -> `Error: Calling the --describe switch is disabled! Use the default behaviour instead.` rc=1 ; dump sans option -> 259 lignes de commentaires ; 2e dump sans --force -> `Brewfile.t already exists`.
- L80 IMPRECISE corrigé : `cleanup` désinstalle après confirmation (pas un listing), `--force` saute la question. Preuve : docs/Manpage.md de Homebrew 7.0.12 local : « Unless --force is passed, this prompts before removing anything and returns a 1 exit code if the prompt is declined ». Non exécuté sur la machine (risque de désinstallation).
- L101 IMPRECISE corrigé : auto-update « au plus une fois toutes les 24 h par défaut », et ajout de `HOMEBREW_AUTO_UPDATE_SECS` pour l'espacer. Preuve : docs/Manpage.md local : « Default: 86400 (24 hours), 3600 (1 hour) if a developer command has been run » ; la doc de HOMEBREW_NO_AUTO_UPDATE recommande elle-même d'augmenter HOMEBREW_AUTO_UPDATE_SECS.

## En plus

- Aucun. Vérifié sans changement : `brew cask` déprécié en 2.6.0 et désactivé en 2.7.0 (déc. 2020, clone Homebrew/brew, `odisabled` dans cask/cmd.rb@2.7.0), donc « supprimé en 2020 » tient (code retiré en 2023, 4.0.15).

## Modernisation

- Appliquée : `--greedy-auto-updates` / `--greedy-latest`.

## Tests

- Homebrew 7.0.12-211 local : `brew upgrade --help`, `brew bundle dump` (avec et sans --describe, re-dump sans --force) dans le scratchpad, fichiers supprimés ensuite.
- Clone ajouté : ~/Documents/work/src/Homebrew-install (blob:none).

## À signaler

- Rien.
