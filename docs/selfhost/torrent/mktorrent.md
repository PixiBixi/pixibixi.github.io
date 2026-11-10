---
description: Créer des fichiers torrent en ligne de commande avec mktorrent - compilation et options de création
tested_with:
  - "mktorrent 1.1"
tags:
  - mktorrent
  - BitTorrent
---

# Créer ses torrents avec mktorrent

mktorrent est un puissant logiciel de création de torrent en ligne de
commande. Même si la ligne de commande peut vous faire peur, son
utilisation est simplissime.

Le paquet des dépôts Debian/Ubuntu suffit dans la plupart des cas (version 1.1) :

```bash
apt install mktorrent
```

La 1.1 date de 2017. La branche master du dépôt ajoute le calcul automatique de la taille de pièce et l'option `-e` pour exclure des fichiers, mais elle n'a jamais été releasée : pour en profiter, on compile.

Avant de compiler, nous devons être sûr que nous avons bien toutes les
dépendances :

```bash
apt install build-essential libssl-dev git
```

Nous téléchargons les sources de *mktorrent* (le dépôt `Rudde/mktorrent` redirige vers `pobrn/mktorrent`)

```bash
git clone https://github.com/pobrn/mktorrent && cd mktorrent
```

Et on edit les variables qui vont bien (threads, SHA1 d'OpenSSL, options longues) :

```bash
sed -i -e "s/#USE_PTHREADS/USE_PTHREADS/g;" \
       -e "s/#USE_OPENSSL/USE_OPENSSL/g;" \
       -e "s/#USE_LONG_OPTIONS/USE_LONG_OPTIONS/g;" Makefile
```

`USE_LARGE_FILES` n'est utile que sur un OS 32 bits, et `NO_HASH_CHECK` désactive juste une vérification de cohérence pendant le hash : on les laisse commentés.

Et enfin on compile :

```bash
make && make install
```

## Utilisation

Une fois mktorrent installé, nous devons maintenant s'approprier le
logiciel. Heureusement pour nous, mktorrent est plutôt simple
d'utilisation:

* `-a` : Announce pour le torrent
* `-t` : Nombre de threads à utiliser pour la création du torrent (uniquement si compilé avec `USE_PTHREADS`)
* `-p` : Set le flag private du torrent
* `-l` : Taille des pièces (En puissance de 2, par exemple, si l'on tape 18, on aura 2^18 = 256 KiB). Valeurs acceptées : 15 à 28. Sans `-l`, la 1.1 prend 18 par défaut, la version master calcule la taille à partir du contenu

Concrètement, pour la taille de pièce, voici une convention courante (ce n'est pas une règle de mktorrent) :

| Taille de pièce | Taille des fichiers | Représentation dans mktorrent |
| --- | --- | --- |
| 256 KiB | Jusqu'à 256 MiB | 18 |
| 512 KiB | Jusqu'à 1 GiB | 19 |
| 1 MiB | Jusqu'à 2 GiB | 20 |
| 2 MiB | Jusqu'à 4 GiB | 21 |
| 4 MiB | Jusqu'à 8 GiB | 22 |
| 8 MiB | Jusqu'à 16 GiB | 23 |
| 16 MiB | Plus de 16 GiB | 24 |

Plus l'on met une taille de pièce importante, plus le torrent sera de
petite taille, mais il faut faire attention à ne pas mettre une taille
de pièce trop grosse pour un torrent trop petit
