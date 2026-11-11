---
article: docs/linux/cli/tmux.md
checked: '2026-11-11'
commit: de64344ef12f45dc78c74220451c30688a129993
sources: []
unpinned: 6
---

# docs/linux/cli/tmux.md

## Findings

- L92 IMPRECISE corrigé : redimensionnement = préfixe puis Ctrl+flèche (1 cellule) ou Alt+flèche (5 cellules), avec répétition. Preuve : tmux key-bindings.c@3.8:469-476 (`bind -r M-Up ... resize-pane -U 5`, `bind -r C-Up ... resize-pane -U`) et L450 (`bind -r Up { select-pane -U }`).
- L109 IMPRECISE corrigé : précisé Ctrl+Espace / Alt+W en mode emacs, et que tmux passe en vi si $VISUAL/$EDITOR contient "vi" ; le bloc de conf devient "pour forcer". Preuve : tmux.c@3.8:544-549 ; key-bindings.c@3.8:567 (copy-mode C-Space begin-selection), 585 (copy-mode Space page-down), 635 (M-w copy-pipe-and-cancel), 656/662 (copy-mode-vi Enter / Space). Test tmux 3.8 local : `EDITOR=nvim` -> mode-keys vi, `EDITOR=nano` -> mode-keys emacs.
- L156 IMPRECISE corrigé : `screen-256color` remplacé par `tmux-256color`, commentaire indiquant que c'est le défaut des builds récents. Preuve : CHANGES@3.8:1168-1170 "pick default-terminal from the first of tmux-256color, tmux, screen-256color, screen" ; tmux.h@3.8:100-101 TMUX_TERM "screen" en repli ; test local tmux 3.8 `show -g default-terminal` -> tmux-256color. Affirmation du fact-check "screen-256color perd les italiques" non vérifiée et non reprise.
- L176 IMPRECISE rejeté : depuis un shell dans tmux, la commande cible bien la window courante, c'est le cas décrit. Preuve : test tmux 3.8, `tmux set-window-option synchronize-panes on` tapé dans un pane -> `show -w synchronize-panes` = on.
- L193 IMPRECISE corrigé : ajout d'une phrase sur `--ssh` = `StrictHostKeyChecking=no` et l'alternative `xpanes -c 'ssh {}'`. Preuve : greymd/tmux-xpanes README.md@384b127:182 et bin/xpanes:97 `XP_SSH_CMD_UTILITY="ssh -o StrictHostKeyChecking=no {} "`.
- L223 IMPRECISE corrigé : `ttymouse=xterm2` -> `ttymouse=sgr`. Preuve : vim runtime/doc/options.txt@2fa9f0ae8 : `xterm` "only works up to 223 columns", `sgr` "works even in columns beyond 223 ... backward compatible with xterm2" ; sous tmux ('term' commence par "tmux") Vim pose `xterm` par défaut sauf entrée terminfo XM 1006, donc le réglage explicite reste utile.

## En plus

- L69 corrigé : tiret demi-cadratin entre `0` et `9` (règle d'écriture) remplacé par "`0` à `9`".
- L209-214 corrigé : tmux-xpanes active déjà synchronize-panes sur la window créée (sauf `-d`), la phrase "activer la synchronisation" était inutile ; le bloc montre maintenant comment la couper (`off`). Preuve : bin/xpanes@384b127:104 `XP_OPT_IS_SYNC=1`, L1733-1736 `set-window-option ... synchronize-panes on`, README L160 "-d,--desync Make synchronize-panes option off".

## Modernisation

- default-terminal tmux-256color : appliqué.
- Alias `csshx` vs le vrai csshX : non appliqué, l'alias est un choix de l'auteur ; signalé ci-dessous.

## Tests

- tmux 3.8 local (macOS, Homebrew), serveurs isolés `-L fc*` avec `-f /dev/null`, tués après test. tmux-xpanes 4.2.0 (Homebrew, version seulement, pas lancé). Sources : ~/Documents/work/src/tmux (tag 3.8), ~/Documents/work/src/tmux-xpanes et ~/Documents/work/src/vim (clonés dans cette passe, blob:none).

## À signaler

- L'alias `csshx` (minuscules) ne masque pas `csshX` dans zsh (noms sensibles à la casse), mais prête à confusion avec lui ; l'auteur peut préférer un autre nom.
- Ctrl+flèche est capturé par Mission Control sur macOS par défaut : Alt+flèche reste utilisable (non testé dans Terminal/iTerm).
