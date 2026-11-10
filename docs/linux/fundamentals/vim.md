---
description: Raccourcis essentiels de Vim - fenêtres, édition texte, copie/suppression et plugins
tags:
  - vim
---

# VIM: L'editeur de texte de la mort

Dans cet article, nous allons voir tous les raccourcis, afin d'utiliser
au mieux vim (En illustration, voici un screenshot de mon interface de
vim)

## Raccourcis

### Fenêtres

* Nouvelle fenêtre :
  * `Ctrl W + V` : Verticale Fenêtre
  * `Ctrl W + S` : Horizontale Fenêtre
  * `Ctrl W + N` : Nouvelle fenêtre vide (split horizontal)
* Pour switch de fenêtre : `Ctrl W + Flèche` (ou `h`/`j`/`k`/`l`)
* `Ctrl F` : Descend d'un écran
* `Ctrl B` : Monte d'un écran

### Texte

* `c i` : Pour remove le contenu d'une parenthèse... (Change
    Inside)
* `d s (` : Remove des parenthèse, le contenu reste (plugin vim-surround, voir plus bas). En natif, `da(` supprime les parenthèses **et** leur contenu
* `%s/search/replace/g` : Pour sed un fichier
* `F2, paste normal, puis F2` : Pour coller un texte `sans problème
    de tab`, si `set pastetoggle=<F2>` est dans le vimrc (vide par défaut). Inutile avec un terminal qui gère le bracketed paste (Vim 8.0.0210+), et l'option n'existe plus dans Neovim
* `daw` : Supprime le mot courant (Delete a Word)
* `das` : Supprime la phrase courante (Delete a Sentence)
* `dap` : Supprime tout un bloc de texte tant qu'il n'y a aucune
    ligne vide (Delete a Paragraph)
* `R` : Pour remplacer du texte :
* `J` : Pour joindre 2 lignes
* `g U` : Pour passer du texter en uppercase, suivi d'un mouvement (`gUiw` pour le mot, `gUU` pour la ligne)
* `g u` : Pour passer du texter en lowercase (`guiw`, `guu`)

### Copie/Delete

* `yy` ou `Y` : Copier une ligne
* `v` : Permet de passer en mode visuel pour sélectionner du texte
    caractère par caractère, `V` pour sélectionner des lignes entières
* `dd` : Delete une ligne
* `cw` : Change un mot (le supprime jusqu'à la fin puis passe en mode insertion), `dw` pour juste le supprimer
* `p` : Coller après le curseur (après la ligne courante si on a copié une ligne entière)
* `P` : Coller avant le curseur (avant la ligne courante pour une ligne entière)

<https://jordanelver.co.uk/blog/2014/03/12/sorting-columnds-of-text-in-vim-using-sort/> Faire des colonnes propres

### Misc

* `<<` : Diminiue la tab (`<` en mode visuel)
* `>>` : Augmente la tab (`>` en mode visuel)
* `:r!ls :` Permet d'importer le résultat de la commande ls dans le
    document actuel
* `:r <filename>` : Importe `<filename>` dans le document actuel, sous la ligne du curseur
* `:!ls` : Permet de faire la commande ls depuis vim
* `:!php -l %` : Permet d'exécuter un check syntax sur le document
    actuel
* `:vs` : Editer le même fichier sur 2 colonnes

* `G` : Pour aller tout en bas d'un fichier
* `Ctrl-P` : Liste des fichiers + Ouvrir (plugin [ctrlp.vim](https://github.com/ctrlpvim/ctrlp.vim), fzf.vim ou telescope.nvim font pareil ; en natif, `Ctrl-P` remonte d'une ligne)

* `gf` : Ouvre le lien du fichier
  * `Ctrl-o` : Revenir au fichier original
* `gx` : Ouvre le lien vers un browser
* `gd` : Déclaration locale d'une variable/fonction
* `gD` : Déclaration globale d'une variable/fonction

* `Ctrl a` : Incrémenter un chiffre
* `Ctrl x` : Décrémenter un chiffre

### Plugins

* `tpope/vim-surround` : `cs'"` remplace les quotes simples entourant le mot par des quotes doubles

## Configuration

Pour la configuration, tous mes fichiers sont disponibles sur mon GitHub
([Repository](https://github.com/PixiBixi/dotfiles))

Pour installer ma configuration (Neovim, dans `config/.config/nvim`), rien de plus simple, il vous suffit d'être sur macOS :

```bash
git clone https://github.com/PixiBixi/dotfiles.git ~/dotfiles
cd ~/dotfiles
./scripts/init_mac.sh
```

Et voilà, vous avez avec ma configuration
