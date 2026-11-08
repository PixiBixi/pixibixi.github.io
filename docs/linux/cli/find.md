---
description: Guide complet de la commande find sous Linux - recherche par nom, taille, date, permissions et exécution d'actions sur les résultats.
tags:
  - find
tested_with:
  - "GNU findutils 4.11"
---

# La commande find

La commande **find** sous Linux est une commande extrêmement puissante
qui a une tonne d'options. Elle nous permet de repérer les fichiers les
plus gros, les fichiers qui n'ont pas été modifiés depuis 30j...

2 réflexes avant tout :

- **toujours quoter les motifs** (`-name '*.log'`). Sans quotes, le shell développe le glob avant que find ne le voie : avec 2 fichiers `.log` dans le dossier courant, find plante (`paths must precede expression`), avec 1 seul il ne cherche plus que ce nom-là ;
- **toujours donner un chemin**, même `.`. `find -name x` sans chemin est une extension GNU : le `find` BSD de macOS répond `illegal option -- n`.

## Exemples

### Filtre sur le nom

```bash
find . -iname power.log
```

Cherche dans tous les dossiers contenus dans le répertoire courant un
fichier se nommant power.log, sans tenir compte de la casse (`-iname`).

------------------------------------------------------------------------

```bash
find . -name '*.log'
```

Cherche dans tous les dossiers n'importe quel type de document
(fichiers/dossiers) finissant par .log

------------------------------------------------------------------------

```bash
find . -maxdepth 1 -not -name '*log'
```

Cherche dans le répertoire courant n'importe quel type de document dont le nom ne finit **pas** **(-not)** par log. find est récursif par défaut : c'est `-maxdepth 1` qui le limite au dossier courant.

### Filtre sur le type

```bash
find /home/guest1/proj -type f -name '.*'
```

Recherche **uniquement** les **fichiers** **(-type f)** commençant par .
(Concrètement, les fichiers cachés de Linux) dans le dossier
/home/guest1/proj

- `f` : File
- `d` : Directory
- `l` : Symlink

------------------------------------------------------------------------

```bash
find /opt /usr /var -name foo.scala -type f
```

Il est également possible de chercher un fichier dans plusieurs
dossiers. (/opt /usr et /var). Ici, nous cherchons le fichier foo.scala

De plus, nous pouvons chercher plusieurs fichiers à la fois. Les parenthèses sont échappées pour que le shell les passe à find :

```bash
find . -type f \( -name '*.c' -o -name '*.sh' \)
```

Dans cet exemple, nous cherchons à la fois les fichiers en **.c** et en **.sh**

### Filtrage sur les propriétés des fichiers

```bash
find . -mtime -2
```

Affiche tout ce qui a été modifié il y a moins de 2 jours **(Unité par
défaut)**

- `-n` = Moins de
- `+n` = Plus de
- `n` = Exactement

find compte en jours entiers et ignore les heures restantes : `-mtime +1` veut dire au moins 2 jours (48h), pas plus de 24h. Pour de la précision, `-mmin` compte en minutes (`-mmin -90`).

------------------------------------------------------------------------

`-size` marche sur tout, dossiers compris : on ajoute `-type f` pour ne garder que les fichiers.

```bash
find . -type f -size +10k
```

Affiche tous les fichiers de plus de 10 Kio

- `k` = Kibioctets (1024 octets)
- `M` = Mébioctets
- `G` = Gibioctets
- sans suffixe : blocs de 512 octets
- `+` = Plus de
- `-` = Moins de
- `Ø` = Taille exacte

!!! warning "-size -1M ne trouve que les fichiers vides"
    find arrondit la taille à l'unité supérieure avant de comparer : un fichier de 1 octet compte pour 1M, donc `-size -1M` ne garde que les fichiers de 0 octet. Pour « moins de 1 Mio » exact, on compte en octets (`c`) : `-size -1048576c`.

### Exécution

Il est également possible de rediriger la sortie de find automatiquement
vers une commande en utilisant `-exec`

```bash
find report -name '*log*' -exec rm {} \;
```

Recherche tous les documents dont le nom contient *log* et les supprime. Le `{}` est remplacé par le chemin trouvé, et le `;` qui termine la commande est **indispensable** : on l'échappe (`\;` ou `';'`) pour que le shell ne le prenne pas pour une fin de commande. `rm` sans `-r` refuse les dossiers (`Is a directory`).

------------------------------------------------------------------------

Il est également possible de faire cette même commande avec
`-delete`

```bash
find report -name '*log*' -delete
```

`-delete` traite les sous-dossiers avant leur parent, mais ne supprime pas un dossier non vide (`Directory not empty`). Il se met **en dernier** : find évalue les options dans l'ordre, et `find . -delete -name '*log*'` supprime tout. On lance d'abord la commande sans `-delete` pour voir ce qu'elle trouve.

------------------------------------------------------------------------

```bash
find . -name '*.txt' -exec wc {} +
```

Ici, nous prenons tous les fichiers finissant par *.txt* et nous lançons `wc` sur tous ces fichiers. La différence avec la première est qu'avec le `+`, find ne lance pas une commande par fichier : il passe un maximum de fichiers à chaque appel de `wc`, bien plus rapide sur des milliers de résultats. Le `{}` doit être juste avant le `+`, qui n'a pas besoin d'être échappé.

Pour passer les résultats à une autre commande, on sépare les noms par un octet nul, ce qui supporte les espaces et les retours à la ligne dans les noms :

```bash
find . -name '*.log' -print0 | xargs -0 ls -l
```

## Voir aussi

- [Remplacer les commandes de base](replace_base_commands.md) - alternative fd, plus rapide et respectant `.gitignore`
