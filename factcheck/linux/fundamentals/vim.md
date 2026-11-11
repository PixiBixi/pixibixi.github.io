---
article: docs/linux/fundamentals/vim.md
checked: '2026-11-10'
commit: 55889dd50d2f480849973020e1d476ec174a0a42
sources: []
unpinned: 12
---

# docs/linux/fundamentals/vim.md

## Findings

- L33 ERROR corrigé : `das` = supprime la phrase, ajout de `dap` pour le bloc jusqu'à la ligne vide. Preuve : `/usr/share/vim/vim91/doc/motion.txt:577,587` ; test Vim 9.1 `-u NONE` : `ggdas` sur "One sentence. Two sentence." ne supprime que "One sentence.", `ggdap` supprime tout le paragraphe.
- L54 ERROR corrigé : `'<`/`'>` remplacés par `<<`/`>>` (et `<`/`>` en visuel). Preuve : `motion.txt:918` (`'<` = mark de début de sélection), `change.txt:492,495,509` ; test `>>` sur une ligne -> une tabulation de plus.
- L58 ERROR corrigé : `:!r<filename>` -> `:r <filename>`, sous la ligne du curseur. Preuve : `insert.txt:2154` ; test `:1r inc.txt` -> contenu inséré en ligne 2.
- L19 IMPRECISE corrigé : `Ctrl W + S` pour le split horizontal, `Ctrl W + N` gardé comme "nouvelle fenêtre vide". Preuve : `windows.txt:154-157` (CTRL-W s / S), `:194-197` (CTRL-W n "editing an empty file").
- L20 IMPRECISE corrigé : `Ctrl W + Flèche` (ou h/j/k/l). Preuve : `windows.txt:424-426`.
- L28 IMPRECISE corrigé : `ds(` attribué au plugin vim-surround (déjà cité dans l'article), alternative native `da(` (supprime aussi le contenu). Preuve : `motion.txt` (objets `a(`), comportement de vim-surround non testé (pas de clone local), basé sur sa doc connue.
- L30 IMPRECISE corrigé : nécessite `set pastetoggle=<F2>` (défaut vide), inutile avec le bracketed paste, absent de Neovim. Preuve : `options.txt:6531` (default ""), `version8.txt:15894` (patch 8.0.0210, bracketed paste ; le finding disait 8.2, c'est 8.0) ; `nvim 0.12.6` : `set pastetoggle=<F2>` -> "E519: Option not supported".
- L37 IMPRECISE corrigé : `gU`/`gu` suivis d'un mouvement (`gUiw`, `gUU`, `guu`). Preuve : `change.txt:338,347,354,357` ; test `gUiw` sur "hello world" -> "HELLO world".
- L43 IMPRECISE corrigé : `v` par caractère, `V` par ligne. Preuve : `visual.txt:62,75`.
- L46 IMPRECISE corrigé : `cw` supprime puis passe en insertion, `dw` pour seulement supprimer. Preuve : `change.txt:181` (`c{motion}` "Delete {motion} text ... and start insert").
- L47 IMPRECISE corrigé : `p`/`P` collent après/avant le curseur (la ligne seulement pour un yank de ligne entière), "Copier" -> "Coller". Preuve : `change.txt:1105,1109`.
- L65 IMPRECISE corrigé : `Ctrl-P` attribué à ctrlp.vim (lien 200), alternatives fzf.vim/telescope.nvim. En natif, en mode normal, `Ctrl-P` = `k` (ligne précédente), pas "complétion/commande précédente" comme le disait le finding (ça, c'est en insertion et en ligne de commande). Preuve : `index.txt:226` "CTRL-P 1 same as k".

## En plus

- L85-90 : `curl https://raw.githubusercontent.com/PixiBixi/dotfiles/master/init.sh | bash` répond 404 (`init.sh` absent de `origin/master` du repo dotfiles). Remplacé par la procédure du README dotfiles (`git clone` + `./scripts/init_mac.sh`), "environnement UNIX/BSD" -> "être sur macOS", et mention que la config est Neovim (`config/.config/nvim`). Preuve : `git ls-tree origin/master` de `~/Documents/perso/git/dotfiles`, `README.md:23-40`.

## Modernisation

- pastetoggle inutile avec bracketed paste / supprimé de Neovim : appliqué (cf. L30).
- ctrlp.vim, fzf.vim, telescope.nvim : appliqué (cf. L65).

## Tests

- Vim 9.1 (macOS `/usr/bin/vim`, `-u NONE -N -es`), Neovim 0.12.6 (Homebrew).

## À signaler

- Le repo dotfiles ne contient plus de config Vim, seulement Neovim : la section Configuration renvoie donc vers une config Neovim. À l'auteur de voir s'il garde cette section.
- L9-11 promet un screenshot de l'interface qui n'est pas dans l'article.
- L50 : l'URL jordanelver ("columnds") répond 200, laissée telle quelle.
