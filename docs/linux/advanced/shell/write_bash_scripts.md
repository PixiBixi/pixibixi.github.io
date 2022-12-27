# Ecrire son script bash

## Introduction

Dans une vie de sysadmin respectable, nous devrons un jour ou l'autre
faire face à un script bash. Il est donc indispensable d'avoir cette
base que je vais essayer de vous expliquer dans cet article. Nous allons
voir comment créer son script de la manière la plus optimale et propre
possible.

## Créer son premier script bash

Un script bash n'est ni plus ni moins qu'un simple fichier texte avec
certaines commandes et une syntaxe précise, voici notre premier script
bash :

```bash
#!/usr/bin/env bash
echo "Mon premier script bash" # Ma commande
```

Tout d'abord, nous observons une ligne commençant par #!, il s'agit du
shebang. Cette ligne est très utile dans le cas où nous lançons le
script via ./mon_script.sh, nous savons ici que ce script
devra être exécuté avec l'interpreteur bash.

Nous avons ici notre première bonne pratique, nous n'utilisons pas
directement /bin/bash en shebang mais /usr/bin/env
bash. Même si le chemin du fichier binaire probablement le
plus connu de Linux est dans une vaste majorité des cas
/bin/bash, il se peut que celui-ci diffère (par exemple
dans une distribution BSD). Ce shebang peut également être adapté à
python ou d'autres langages de scripting.

La commande echo affiche tout simplement le texte qui lui est passé en
argument. echo est une commande dites '"built-in'", c'est à dire
qu'elle sera inclue dans toutes les versions de bash quelque soit la
distribution. Pour voir toutes les commandes built-in, nous utilisons la
commande compgen -b.

Le texte '"Ma commande'" a été écrit après un '# ce qui signifie que le
texte après ce caractère ne sera pas interprété, nous pouvons donc y
mettre ce que nous voulons, généralement, ce sera du texte pour nous
aider à comprendre la ligne précédée.

## Opérations de base

### Les Variables

#### Variables built-in

De nombreuses variables sont incluses dans un script bash, il est utile
d'en connaitres quelques unes.

  * `$1` contient la valeur du premier argument de votre script bash ou
    de votre fonction. ('$0 représente le script lui même)
  * `$#` contient le nombre d'arguments passés à votre script
  * `$?` contient le code retour de votre programme script...
  * `$PWD` contient le chemin du répertoire courant

#### Assignation de variables

Pour assigner une valeur à une variable en bash, qu'une seule façon est
possible :

```bash
#!/bin/bash
VAL="mavaleur"
```

Il est également possible d'assigner dynamiquement une valeur à une
variable. Notre première bonne pratique ici est d'écrire le nom de la
variable en majuscule.

```bash
#!/bin/bash
HOST=$(hostname)
```

La variable HOST contiendra le retour de la commande
hostname. Enfin, il est possible d'attribuer des valeurs
par défauts à des variables si l'utilisateur ne la réécrit pas (par
exemple, via un argument du script).

```bash
#!/bin/bash
FOO=${1:-BAR}
```

Si notre variable '$1 ne contient rien, notre varible FOO prendra alors
la valeur BAR, sinon, la valeur de '$1.

#### Manipulation de variables

Sous bash, il est possible simplement de modifier ses variables
simplement. Dans les exemples suivant, nous supposons que notre variable
**FOO** contienne monfichier.txt et que nous souhaitons
garder que monfichier dans une variable nommée **BASE**.

```bash
#!/bin/bash
BASE=${FOO%%.txt}
```

Comme vous pouvez le voir, via %%.txt, nous supprimons
.txt de notre variable

Il est également possible de subtituer .txt par .pdf par exemple.

```bash
#!/bin/bash
BASE=${FOO/txt/pdf}
```


Nous pouvons également effectuer une sous chaine à partir de la chaine
de base

```bash
#!/bin/bash
# echo ${FOO:position:taille}
${FOO:2:2}
```

Par exemple, ici, nous allons afficher la variable à partir de la
position 2 pour 2 caractères.

Dans le code suivant, toujours en se basant sur la variable FOO, nous
prenons les 3 derniers caractères (le signe - signifie que nous partons
de la fin de la variable), ce qui nous permet par exemple de prendre
juste l'extension du fichier

```bash
#!/bin/bash
EXT=${FOO:(-3)}
```

### Tests conditionnels

### Boucles

```bash
#!/bin/bash
for i in {1..5}
do
   echo "Welcome $i times"
done
```

```bash
#!/bin/bash
for i in {0..10..2}
do
    echo "Welcome $i times"
done
```

```bash
#!/bin/bash
for (( c=1; c<=5; c++ ))
do
   echo "Welcome $c times"
done
```

```bash
#!/bin/bash
for I in 1 2 3 4 5
do
  statements1      #Executed for all values of I, up to a disaster-condition if any.
  statements2
  if (disaster-condition)
  then
    break              #Abandon the loop.
  fi
  statements3          #While good and, no disaster-condition.
done
```

```bash
#!/bin/bash
for s in server0{1..8}
do
    echo "*** Patching and updating ${s} ***"
    ssh root@${s} -- "yum -y update"
done
```

## Astuces de script

### Optimiser le debug

Par défaut, bash est laxiste. Il n'intègre aucun controle d'erreur ou
autre. En définissant un simple shebang, nous n'avons aucun controle.
C'est pour ça que je conseille d'utiliser les options bash suivantes :

```bash
#!/bin/bash
set -euo pipefail
```

Petite explication de ces options :

  * **-e** : Interrompt le script à la moindre commande ne retournant
    pas 0. Implique une manière d'écrire ses scripts afin qu'aucune
    commande ne retourne d'erreur par défaut
  * **-u** : Indique qu'une variable n'a pas été définit. Par défaut,
    bash va bug ou ne rien afficher dans le cas d'un *echo*. Prenons un
    exemple où nous avons un problème de casse :

```bash
jeremy@macbook-pro-de-delgado:~ $ cat l
#!/bin/bash
set -euo pipefail
firstName="Aaron"
fullName="$firstname Maxwell"
echo "$fullName"
jeremy@macbook-pro-de-delgado:~ $ bash l
l: ligne 4: firstname : variable sans liaison
```

  * `-o pipefail` : Sans cette option, une erreur dans un pipe sera
    masquée, et ne sera pas interceptée par le paramètre **-e**

### Template de script

Il est possible d'écrire de bons scripts Shell, mais il est encore plus facile d'en écrire des mauvais. Voici donc un excellent template :

```bash
#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
if [[ "${TRACE-0}" == "1" ]]; then
    set -o xtrace
fi

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
    echo 'Usage: ./script.sh arg-one arg-two

This is an awesome bash script to make your life better.

'
    exit
fi

cd "$(dirname "$0")"

main() {
    echo do awesome stuff
}

main "$@"
```

Ce template ne vient pas de moi mais de cet [excllent site](https://sharats.me/posts/shell-script-best-practices/).

### Misc

Quelques astuces de scripts bash trouvées à gauche ou à droite

```bash
#!/bin/bash
echo avant && : moi  && echo après
```

Ici, le : moi est en faite un commentaire inline, plutôt ingénieux !

------------------------------------------------------------------------

```bash
#!/bin/bash
if doesnotexist |& grep command not found >/dev/null
then
  echo oops
fi
```

Nous connaissons tous les fameux 2&'>1 pour rediriger STDERR dans
STDOUT. Ici, nous redirigons les 2 sorties vers la prochaine instruction
du pipeline, très utile.

------------------------------------------------------------------------

```bash
#!/bin/bash
exec 8<>/dev/tcp/wiki.jdelgado.fr/80
echo -e "GET / HTTP/1.1'r'nHost: wiki.jdelgado.fr'r'n'r'n" >&8
cat <&8
```

Petit snippet utile afin de s'affranchir de toute commande. Dans un
premier temps, nous ouvrons le file descriptor 8. Via cette première
commande, nous ouvrons ainsi un socket TCP sur notre wiki. Secondement,
nous envoyons un header HTTP classique, enfin, nous lisons le contenu du
file descriptor 8
