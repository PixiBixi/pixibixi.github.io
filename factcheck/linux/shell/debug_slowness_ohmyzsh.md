---
article: docs/linux/shell/debug_slowness_ohmyzsh.md
checked: '2026-11-11'
commit: bf87c6b96e685a636d64298cbb966fab5861f160
sources:
- repo: ohmyzsh-ohmyzsh
  path: oh-my-zsh.sh
  lines: 219-224
  ref: origin/master
  commit: cca3bdfbef8c52ef8939ce7911ff68852b949daa
- repo: ohmyzsh-ohmyzsh
  path: lib/theme-and-appearance.zsh
  lines: 17-21
  ref: origin/master
  commit: cca3bdfbef8c52ef8939ce7911ff68852b949daa
- repo: ohmyzsh-ohmyzsh
  path: oh-my-zsh.sh
  lines: '131'
  ref: origin/master
  commit: cca3bdfbef8c52ef8939ce7911ff68852b949daa
- repo: ohmyzsh-ohmyzsh
  path: lib/grep.zsh
  lines: 27-28
  ref: origin/master
  commit: cca3bdfbef8c52ef8939ce7911ff68852b949daa
- repo: ohmyzsh-ohmyzsh
  path: lib/correction.zsh
  lines: '1'
  ref: origin/master
  commit: cca3bdfbef8c52ef8939ce7911ff68852b949daa
unpinned: 2
---

# docs/linux/shell/debug_slowness_ohmyzsh.md

## Findings

- L112 OUTDATED corrigé : "il les cherche avec `grep`" devient "il les cherche dans le dump (avec `grep` jusqu'en septembre 2026, en zsh pur depuis)". Preuve : ohmyzsh oh-my-zsh.sh:219-224 @origin/master (`_omz_compdump_has_metadata`, `lines=("${(@f)$(<"$ZSH_COMPDUMP")}")`) ; commit 39334a08 (2026-09-07) ; avant : `992edcc1^:oh-my-zsh.sh:118-119` (`command grep -q -Fx`).
- L137 OUTDATED corrigé : le paragraphe passe au passé ("l'oh-my-zsh.sh mesuré ici lançait") et un paragraphe ajouté dit ce que master a retiré (révision lue dans `.git`, dump lu en zsh, `mkdir`/`zrecompile` conditionnels, cache d'un jour pour diff/ls/scutil), qu'il faut re-mesurer après `omz update`, et que le chargeur et le tableau "Résultat" valent pour les versions antérieures. Preuve : oh-my-zsh.sh:67, 98-127, 138-216, 259-265 @origin/master ; commits 40bddc3c, e7852049, 7ce781ea, 39334a08, 0da79193, 992edcc1 ; ancienne liste des forks confirmée dans `992edcc1^:oh-my-zsh.sh` (lignes 67, 103, 114, 118-119, 139, 151-153).
- L137 OUTDATED corrigé : `lib/grep.zsh` ne forke plus à chaque ouverture, et ce depuis 2020 (cache `Nm-1`, commit dc190d87 2020-03-01) ; `theme-and-appearance.zsh` en cache depuis 7ce781ea (2026-09-18). Texte ajusté dans le même paragraphe. Preuve : lib/grep.zsh:1-6, lib/theme-and-appearance.zsh:17-21 @origin/master.
- L34 IMPRECISE corrigé : on relance seulement la dernière ligne avec le même `$ZD` ; relancer le bloc recrée un dossier vide. Preuve : oh-my-zsh.sh:131 @origin/master (`ZSH_COMPDUMP="${ZDOTDIR:-$HOME}/..."`) + `ZD=$(mktemp -d)` du bloc.
- L167 IMPRECISE corrigé : `alias egrep='grep -E' fgrep='grep -F'` ajouté au chargeur. Preuve : lib/grep.zsh:27-28 @origin/master ; syntaxe testée avec `zsh -f` 5.9.
- L185 IMPRECISE corrigé : `correction` ajouté à la liste des libs écartées, avec la précision qu'elle ne fait rien sans `ENABLE_CORRECTION="true"`. Preuve : lib/correction.zsh:1 @origin/master (tout est sous `if [[ "$ENABLE_CORRECTION" == "true" ]]`).
- L190 IMPRECISE corrigé : sans `SHORT_HOST`, le fichier devient `~/.ssh/environment-`, l'agent est réutilisé ; le vrai risque est la collision entre machines qui partagent `$HOME`. Preuve : plugins/ssh-agent/ssh-agent.plugin.zsh:2, 21-25 @origin/master.

## En plus

- Rien.

## Modernisation

- "Re-mesurer avant de remplacer oh-my-zsh.sh" : appliqué (L137).
- Alias egrep/fgrep : appliqué (L167).

## Tests

- zsh 5.9 (macOS) pour la syntaxe d'alias. Pas de re-mesure des temps d'ouverture avec un oh-my-zsh à jour : les chiffres de l'article restent ceux de l'auteur.

## À signaler

- Le tableau "Résultat" (340 -> 300 -> 95ms) et le "90ms" datent d'avant les commits de septembre 2026. Une re-mesure sur oh-my-zsh à jour dirait si la section "Se passer de oh-my-zsh.sh" vaut encore le coup.
- Sur macOS, oh-my-zsh calcule `SHORT_HOST` avec `scutil --get LocalHostName` (oh-my-zsh.sh:98-122), le chargeur avec `${HOST/.*/}` : les 2 noms peuvent différer, donc `ssh-agent` change de fichier d'état au passage au chargeur (un nouvel agent une fois). Non modifié.
