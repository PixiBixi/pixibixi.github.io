# mktorrent

mktorrent est un puissant logiciel de création de torrent en ligne de
commande. Même si la ligne de commande peut vous faire peur, son
utilisation est simplissime.

Cependant, pour pouvoir s'en servir, nous devons le compiler avec les
bonnes options.

Avant de compiler, nous devons être sûr que nous avons bien toutes les
dépendances :

``` bash
apt build-dep mktorrent && apt install git
```

Nous téléchargons les sources de *mktorrent*

``` bash
git clone https://github.com/Rudde/mktorrent && cd mktorrent
```

Et on edit les variables qui vont bien :

``` bash
sed -i -e "s/#USE_PTHREADS/USE_PTHREADS/g;" '
       -e "s/#USE_OPENSSL/USE_OPENSSL/g;" '
       -e "s/#USE_LONG_OPTIONS/USE_LONG_OPTIONS/g;" '
       -e "s/#NO_HASH_CHECK/NO_HASH_CHECK/g;" '
       -e "s/#USE_LARGE_FILES/USE_LARGE_FILES/g;" Makefile
```

Et enfin on compile :

``` bash
make && make install
```

## Utilisation

Une fois mktorrent installé, nous devons maintenant s'approprier le
logiciel. Heureusement pour nous, mktorrent est plutôt simple
d'utilisation:

-   **-a** : Announce pour le torrent
-   **-t** : Nombre de threads à utiliser pour la création du torrent
-   **-p** : Set le flag private du torrent
-   **-l** : Taille des pièces (En puissance de 2, par exemple, si l'on
    tape 18, on aura 2'^18 = 256Kb)

Concrètement, pour la taille de pièce, voici ce qu'il faut faire :

  Taille de pièce   Taille des fichiers   Représentation dans mktorrent
  ----------------- --------------------- -------------------------------
  256Kb             Jusqu'à 256Mb        18
  512Kb             Jusqu'à 1GB          19
  1024Kb            Jusqu'à 2GB          20
  2048Kb            Jusqu'à 4GB          21
  4096Kb            Jusqu'à 8GB          22
  8192Kb            Jusqu'à 16GB         22
  16384Kb           Plus de 16G           23

Plus l'on met une taille de pièce importante, plus le torrent sera de
petite taille, mais il faut faire attention à ne pas mettre une taille
de pièce trop grosse pour un torrent trop petit
