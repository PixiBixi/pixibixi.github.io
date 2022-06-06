# TMUX Multiplexeur de Shell 
 
## Explication 
 
TMUX est un multiplexeur de shell permettant de lancer une multitude de 
fenêtre dans une seule, de créer plusieurs instances'... 
 
## Installation 
 
Comme pour une grande majorité des paquets, ça sera à **apt** ou à 
**aptitude** de faire cette partie du job. Nous avons besoin de la 
dernière version, qui se trouve dans le **distrib-backports**, où 
distrib est évidemment votre Distribution 
 
### Wheezy 
 
``` bash 
$ deb http://http.debian.net/debian wheezy-backports main 
``` 
 
### Jessie 
 
``` bash 
$ deb http://http.debian.net/debian jessie-backports main 
``` 
 
Puis on l'update ses dépots : 
 
``` bash 
$ apt update 
``` 
 
Et on installe tmux en spécifiant qu'il faut utiliser le dépot 
distrib-backports 
 
``` bash 
$ apt-get -t distrib-backports install tmux 
``` 
 
En n'oubliant pas de remplacer distrib soit par Wheezy, soit par Jessie 
 
## Shortcuts 
 
De base, lorsque nous lançons tmux, nous avons une simple fenêtre, avec 
une bar de statut en bas : 
 
![](/tmux-standard.jpg){.align-center} 
 
Puis nous pouvons faire une multitude de choses sur cette simple fenêtre 
 
### Split horizontal 
 
CTRL+B % 
 
### Split Vertical 
 
CTRL+B '" 
 
<https://github.com/gpakosz/.tmux> 
 
    set ttymouse=xterm2 
    set mouse=a 
 
Morceau de code dans le .vimrc afin d'activer la souris dans vim 
 
Petit handler tmux où on pourra gérer les multiples connexions SSH 
simplement : [xpanes](https://github.com/greymd/tmux-xpanes) 
