# Remplacer les commandes de base Linux par des versions plus performantes

## Built-in

De nos jours, les commandes de bases linux sont désuètes. Il existe des
commandes faisant le même travail, mais plus rapidement, ou alors avec
une syntaxe simplifiée. Ces logiciels sont généralement écrit en
language rust et Open Source.

### Remplacant de ls

En remplacement ls, nous avons l'excellent outil
[exa](https://the.exa.website/), disponible sur Linux et MacOS. exa est
un excellent outil pour beaucoup de choses. Par exemple, celui-ci
intègre la fonctionnalité tree (Visualisation des fichiers sous forme
d'arbre) via '--tree. Celui-ci intègre également un thème visuel nous
permettant d'observer au premier coup d'oeil certaines choses comme la
présence d'un lien symbolique rompus'...

### Remplacant de du

Si comme moi vous vous prenez toujours la tête avec du pour savoir quel
fichier/dossier est le plus, gros,
[dust](https://github.com/bootandy/dust) est fait pour vous. Disponible
sur Linux et Mac, duty affiche simplement les plus gros éléments et
affiche également un visuel, extrêmement pratique

### Remplacant de df

df est un outil vieillissant et peu visuel mais suffisant. Cependant,
pour un usage domestique et plus visuel, deux outils sont disponibles.

-   dfc, outil écrit en C, un tout petit peu plus visuel que df mais
    quasiment aussi rapide
-   duf, outil écrit en Go, plus lent que dfc mais bien plus visuel et
    paramétrable

### Remplacant de find

find est un outil très puissant que nous utilisons tous. Cependant, il
existe encore un outil plus puissant se nommant
[fd](https://github.com/sharkdp/fd). fd nous permet simplement de
simples recherches. Par exemple, [fd -e md]{.underline} nous permettra
de rechercher tous les fichiers du répertoire (et sous-répertoire)
courant. De nombreux exemples sont disponibles dans le Github

### Remplacant de cat

Arrêtons d'afficher nos textes avec cat et utilisons son petit frère,
[bat](https://github.com/sharkdp/bat). Il s'agit d'un logiciel
puissant pouvant afficher les numéros de lignes, intégrant une
coloration syntaxique pour nos différents scripts. De plus, si le texte
est trop long ou large, pas besoin d'utiliser less, bat l'intègre
automatiquement. Enfin, d'un simple coup d'oeil, nous pouvons observer
la différence entre notre version et celle que nous avons clone depuis
Git car bat se base sur l'index de git pour montrer les modifications.

### Remplacant de grep

ripgrep est un remplacant extrêmement efficace à grep. Il est en moyenne
2x plus rapide pour une recherche que grep.
[ripgrep](https://github.com/BurntSushi/ripgrep) ignore par défaut les
fichiers contenu dans le .gitignore. Un [tutoriel
détaillé](/[[https///blog.burntsushi.net/ripgrep/) est disponible sur le
blog de Burntsushi

## Bonus

### Remplacant de dig

dig est déjà un excellent outil face à nslookup. Cependant, un outil
encore plus performant existe, [dog](https://github.com/ogham/dog/).
Malheureusement, il n'y a pas d'équivalent de dig -x.

### Remplacant de gzip

Aujourd'hui, j'ai découvert un outil qui s'appelle
[pigz](https://zlib.net/pigz/). Il s'agit tout simplement d'un gzip
mais multithread. Nous avons facilement un gain de performance de x3. Un
benchmark est [disponible](https://rachaellappan.github.io/pigz/)

### Complément de git

Pout git, il existe un autre outil lightweight et très sympa :
[tig](https://github.com/jonas/tig) permet une visualisation simple de
son repository'...
