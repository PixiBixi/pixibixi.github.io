# Rappel des commandes de base

![Linux GNU](./_img/gnu_and_tux.png)

Linux est un système incroyable, malheureusement complexe pour les
néophytes. Dans cet article, nous allons voir les commandes de base que
vous devez maitriser. Dans ce wiki, vous avez de nombreuses pages vous
permettant de rentrer dans les entrailles de GNU/Linux

## Dossiers

`mkdir <dir>` : **m**a**k**e **dir**ectory

`rmdir <dir>` : **r**e**m**ove **dir**ectory

`pwd <dir>` : **p**rint **w**orking **d**irectory : Permet d'afficher
le répertoire courant

`ls <dir|file>` : **l**ist **s**orted : Permet de lister les éléments
d'un dossier

* -a : Affiche les dossiers cachés
* -l : Affichages détaillé
* -r : Affichage inversé
* -t : Du plus récent au plus ancien
* -S : Date décroissante

`cd <dir>` : **c**hange **d**irectory : Permet de se déplacer dans les
répertoires

## Fichiers

`ln <src> <dst>` : **l**i**n**k : Permet de créer un lien entre deux
fichiers

* -s : Lien symoblique (A la place d'un lien '"dur'" (hardlink))

`touch <file>` : Met à jour l'heurodatage ou créé le document si
celui-ci n'existe pas

`type <file>` : Permet de trouver le chemin d'un binaire ainsi que son
type

`diff <file1> <file2>`: Différence entre 2 fichiers

`file <file>` : Permet de déterminer le type d'un fichier

* -i : Permet de connaitre le type MIME d'un fichier

`cp <src> <dst>` : **c**o**p**y

* -v : Affiche les informations en mode verbose
* -r : Copie récursivement
* -L : Permet de suivre les liens symboliques

`mv <src> <dst>` : **m**o**v**e

* -v : Affiche les informations en mode verbose
* -i : Mode interactif
* -n : Ne pas écraser si le fichier existe déjà

`rm <file'|dir>` : **r**e**m**ove

* -R : Remove recursivement (Pour des dossiers non vides)
* -v : Affiche les infos détaillées

## Droits

`chmod <xyz> <file'|directory>` : **ch**ange file **mod**e bits

![Tableau des chmod](./_img/chmod.png)

* **x** correspond aux droits pour le propriétaire
* **y** les droits du groupe
* et **z** les droits pour tous les autres
* -R pour changer les droits récursivement

`chown <user:group> <file>` : **ch**ange **own**er

* -R pour changer les propriétaires récursivement

`umask <xxx>` : (**u**ser file creation mode **mask**) Droits sur les
nouveaux fichiers

* Par défaut, l'umask est de 022 (777-022 => Les fichiers seront
    créés en 755)

## Misc

`ssh <ndd|ip>` : **s**ecure **sh**ell

* -p : Permet de spécifier le port

`scp` : **s**ecure **c**o**p**y

`rsync` : **r**emote **sync**

`sed` : **s**tream **ed**itor

`grep` : Permet de rechercher un motif dans un document

* -v : Inverse les résultats
* -i : Ignore la casse
* -c : Compte le nombre d'occurence qui correspondent à la regex
* -R : Recherche recursivement
* -n : Affiche le numéro de lignes

`find` : Permet de rechercher un fichier ([article complet](https://wiki.jdelgado.fr/linux/cli/find/))

`less/more` :

`wc` : **w**ord **c**ount

* -l : Line
* -w : Word
* -c : chars

`cut` :

* -d : Delimiteur
* -f : Champs

`head <filename>` : Affiche les premières lignes d'un fichier (Par défaut, affiche les **10** premières lignes)

* -n : Permet de spécifier le nombre de lignes (Ex: -n5 pour les 5 premières lignes)

`tail/less` :

## Espace disque

`df` : **d**isk **f**ree : Affiche l'espace restant dans les partitions

* -h : Affiche de manière compréhensible l'espace restant

`du` : **d**isk **u**sage : Affiche l'utilisation d'un dossier

* -sh : Affiche la taille du dossier
* -hc '--max-depth=1 : Affiche la taille des dossiers comme des
    fichiers dans le répertoire courant

## Gestion des processus

`top` : Affiche les processus Linux

* k puis pid : Permet de kill un processus spécifique
* q : Quitter top

free : Affiche les informations sur la RAM/Swap

* -m : Affiche la mémoire en MB
* -h : Lisible par un humain (Affichage plus compréhensible)
* -t : Ajoute une ligne additionnant SWAP + RAM
* -s : Permet de préciser un intervalle de refresh (en secondes)

`ps` : **p**rocess **s**tatus

* aux : Montrer tous les processus de tous les utilisateurs
* f : Formate l'affichage sous forme d'arbre

`pstree` : **p**rocess **s**tatus tree

* -p : Affiche les processus

`kill <pid>` : Tue un processus (via son PID)

* kill 9 permet de forcer le kill d'un processus (A utiliser en
    **dernier recours**)

`killall <processus_name>` : Tue un processus (via son nom)
