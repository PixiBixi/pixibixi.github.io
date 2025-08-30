# TMUX Multiplexeur de Shell

## Explication

TMUX est un multiplexeur de shell permettant de lancer une multitude de
fenêtre dans une seule, de créer plusieurs instances...

En terme de workflow, tmux permet un gain de productivité incroyable.

Nous verrons en bonus _tmux_xpanes_ qui permet d'automatiser encore plus les taches tmux

## Installation

On update les dépots & on installe notre package

```bash
apt update && apt install tmux
```

## Shortcuts

De base, lorsque nous lançons tmux, nous avons une simple fenêtre, avec
une bar de statut en bas :

![Tmux basique](./_img/tmux_standard.webp)

Puis nous pouvons faire une multitude de choses sur cette simple fenêtre

* **Split horizontal** : `CTRL+B %`
* **Split horizontal** : `CTRL+B "`

Heureusement, nous avons des [repository git](https://github.com/gpakosz/.tmux) qui ont une bonne configuration de base

## Bonus

Il existe un utilitaire qui permet de lancer un batch d'action, nomer [tmux-xpanes](https://github.com/greymd/tmux-xpanes)

Mon utilisation la plus courante de tmux-xpanes est pour ouvrir un batch de sessions SSH par rapport a un nom commun.Je l'utilise souvent couplé a un inventaire ansible

J'utilise un alias csshx

```sh
csshx='tmux-xpanes --ssh'
```

Et enfin, voici le grep pour lancer le batch de sessions SSH :

```sh
csshx $(grep kafka- inventory|sed "s/://g")
```

Avec cet alias, je lance automatiquement une connexion ssh aux serveurs nommés kafka- de mon inventiare ansible.

### Vim

```vim
    set ttymouse=xterm2
    set mouse=a
```

Morceau de code dans le .vimrc afin d'activer la souris dans vim
