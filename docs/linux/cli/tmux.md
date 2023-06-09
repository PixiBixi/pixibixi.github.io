# TMUX Multiplexeur de Shell

## Explication

TMUX est un multiplexeur de shell permettant de lancer une multitude de
fenêtre dans une seule, de créer plusieurs instances...

En terme de workflow, tmux permet un gain de productivité incroyable.

Nous verrons en bonus _tmux_xpanes_ qui permet d'automatiser encore plus les taches tmux

## Installation

Comme pour une grande majorité des paquets, ça sera à `apt` ou à
`aptitude` de faire cette partie du job. Nous avons besoin de la
dernière version, qui se trouve dans le `distrib-backports`, où
distrib est évidemment votre Distribution

On update les dépots

```bash
$ apt update
```

Et on installe tmux en spécifiant qu'il faut utiliser le dépot
distrib-backports

```bash
$ apt-get install tmux
```

En n'oubliant pas de remplacer distrib soit par Wheezy, soit par Jessie

## Shortcuts

De base, lorsque nous lançons tmux, nous avons une simple fenêtre, avec
une bar de statut en bas :

![](/tmux-standard.jpg)

Puis nous pouvons faire une multitude de choses sur cette simple fenêtre

### Split horizontal

```
CTRL+B %
```

### Split Vertical

```
CTRL+B "
```

<https://github.com/gpakosz/.tmux>

```
    set ttymouse=xterm2
    set mouse=a
```

Morceau de code dans le .vimrc afin d'activer la souris dans vim

Petit handler tmux où on pourra gérer les multiples connexions SSH
simplement : [xpanes](https://github.com/greymd/tmux-xpanes)

## Bonus

Il existe un utilitaire qui permet de lancer un batch d'action, nomer [tmux-xpanes](https://github.com/greymd/tmux-xpanes)

Mon utilisation la plus courante de tmux-xpanes est pour ouvrir un batch de sessions SSH par rapport a un nom commun.Je l'utilise souvent couplé a un inventaire ansible

J'utilise un alias csshx

```
csshx='tmux-xpanes --ssh'
```

Et enfin, voici le grep pour lancer le batch de sessions SSH :

```
csshx $(grep kafka- inventory|sed "s/://g")
```

Avec cet alias, je lance automatiquement une connexion ssh aux serveurs nommés kafka- de mon inventiare ansible.
