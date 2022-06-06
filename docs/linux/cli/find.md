# La commande find 
 
La commande **find** sous Linux est une commande extrêmement puissante 
qui a une tonne d'options. Elle nous permet de repérer les fichiers les 
plus gros, les fichiers qui n'ont pas été modifiés depuis 30j'... 
 
## Exemples 
 
### Filtre sur le nom 
 
``` bash 
find . -iname power.log 
``` 
 
Cherche dans tous les dossiers contenus dans le répertoire courant un 
fichier se nommant (de manière insensitive) power.log 
 
------------------------------------------------------------------------ 
 
``` bash 
find . -name *.log 
``` 
 
Cherche dans tous les dossiers n'importe quel type de document 
(fichiers/dossiers) finissant par .log 
 
------------------------------------------------------------------------ 
 
``` bash 
find -not -name *log 
``` 
 
Cherche dans le répertoire courant (et uniquement le courant) n'importe 
quel type de document **ne** contenant **pas** **(-not)** log 
 
### Filtre sur le type 
 
``` bash 
find /home/guest1/proj -type f -name .* 
``` 
 
Recherche **uniquement** les **fichiers** **(-type f)** commençant par . 
(Concrêtement, les fichiers cachés de Linux) dans le dossier 
/home/guest1/proj 
 
-   f : File 
-   d : Directory 
-   l : Symlink 
 
------------------------------------------------------------------------ 
 
``` bash 
find /opt /usr /var -name foo.scala -type f 
``` 
 
Il est également possible de chercher un fichier dans plusieurs 
dossiers. (/opt /usr et /var). Ici, nous cherchons le fichier foo.scala 
 
``` bash 
find . -type f '( -name "*.c" -o -name "*.sh" ') 
``` 
 
De plus, nous pouvons chercher plusieurs fichiers à la fois. Dans cet 
exemple, nous cherchons à la fois les fichiers en **.c** et en **.sh** 
 
### Filtrage sur les propriétés des fichiers 
 
``` bash 
find -mtime -2 
``` 
 
Affiche tout ce qui a été modifié il y a moins de 2 jours **(Unité par 
défaut)** 
 
-   '- = Moins de 
-   '+ = Plus de 
-   Ø = Exactement 
 
------------------------------------------------------------------------ 
 
**L'argument -size fonctionne uniquement sur les fichiers** 
 
``` bash 
find -size +10k 
``` 
 
Affiche tous les fichiers de plus de 10KB 
 
-   k = Kilo-octets 
-   M = Mega-octets 
-   G = Giga-octets 
-   '+ = Plus de 
-   '- = Moins de 
-   Ø = Taille exacte 
 
### Exécution 
 
Il est également possible de rediriger la sortie de find automatiquement 
vers les une commande en utilisant **(-exec)** 
 
``` bash 
find report -name *log* -exec rm {} '; 
``` 
 
Recherche tous les fichiers comprenant la chaine *log* et les supprime 
(Le {} indique le fichier courant, et le ''; est **indispensable** (Le 
'' sert juste à echaper le *;* )) 
 
------------------------------------------------------------------------ 
 
Il est également possible de faire cette même commande avec 
**(-delete)** 
 
``` bash 
find report -name *log* -delete 
``` 
 
------------------------------------------------------------------------ 
 
``` bash 
find -name *.txt -exec wc {} + 
``` 
 
Ici, nous prenons tous les fichiers finissant par *.txt* et nous 
exécutons la commande sur tous ces fichiers. La différence avec la 
première est qu'ici nous **cumulons** les résultats (Avec le + (Qui 
n'a pas besoin d'être echaper)) 
