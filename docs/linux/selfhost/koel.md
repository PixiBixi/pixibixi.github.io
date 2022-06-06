# Streamer sa musique depuis Koel 
 
![](/koel.png){.align-center width="800"} 
 
## Présentation 
 
A l'instar de Spotify, Deezer, ou bien des autres services 
installables, tel que Sonerezh ou Ampache, Koel se démarque par rapport 
à son Design épuré, se voulant être proche de celui de Spotify, et Koel 
le fait. 
 
De plus, Koel permet de stream sans aucun soucis le contenu FLAC (Sous 
réserve de transcodage via FFMpeg), dispose d'un système de gestion de 
compte, mais également d'une interface mobile de qualité. 
 
## Pré-requis 
 
Koel a besoin d'un grand nombre de pré-requis, autre que PHP et MySQL 
afin de fonctionner correctement. Les prérequis sont 
 
-   Composer 
-   NodeJS 
-   NPM 
-   Gulp 
-   Bower 
 
Si l'un de ces pré-requis n'est pas installé, nous ne pourrons pas 
continuer l'installation de Koel. Soyez donc sur que ceux-ci sont 
présents sur votre machine 
 
*NDLR: Il n'est pas forcément nécéssaire d'avoir nGinx ou autre sur sa 
machine, étant donner que Koel dispose de son propre serveur web* 
 
### Composer 
 
Composer vous permet de gérer simplement les dépendances de votre 
application PHP 
 
``` bash 
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin --filename=composer 
``` 
 
### NodeJS 
 
NodeJS n'est pas utile directement ici, mais il vous sera indispensable 
à l'installation de NPM 
 
``` bash 
wget -qO- https://deb.nodesource.com/setup_5.x | bash - 
``` 
 
Ce script sert just à ajouter les bonnes sources à notre fichier 
sources. Nous l'installons comme d'habitude 
 
``` bash 
apt update && apt install nodejs 
``` 
 
### NPM 
 
NPM va vous permettre d'installer toutes les librairies JS nécéssaires 
au bon fonctionnement de Koel 
 
``` bash 
curl -L https://www.npmjs.com/install.sh | sh 
``` 
 
### Gulp 
 
Gulp va vous permettre de compiler les fichiers JS et SASS 
 
``` bash 
npm install --global gulp 
``` 
 
### Bower 
 
Tout comme Composer, Bower est un gestionnaire de paquet, destiné aux 
dépendances de vos diverses applications Web. 
 
``` bash 
npm install -g bower 
``` 
 
## Installation 
 
Maintenant que les dépendances de Koel sont satisfaites, nous pouvons 
passer à son installation en elle même. 
 
Nous devons tout d'abord préparer la base de donnée qui recevra les 
données de notre Koel 
 
``` bash 
CREATE DATABASE koel DEFAULT CHAR SET utf8 DEFAULT COLLATE utf8_general_ci; 
CREATE USER koel-user@localhost IDENTIFIED BY koel-pass; 
GRANT ALL PRIVILEGES ON koel.* TO koel-user@localhost WITH GRANT OPTION; 
``` 
 
Bien évidemment, il faut remplacer *koel-user* et *koel-pass* par les 
identifiants que vous souhaitez. 
 
Maintenant, nous allons cloner le projet Koel dans notre répertoire Web 
(Généralement, /var/www). N'oubliez pas d'installer **git** pour cela. 
 
``` bash 
git clone https://github.com/phanan/koel.git 
``` 
 
Il est maintenant nécéssaire de télécharges les dépendances nécéssaires 
au bon fonctionnement de Koel (Ne pas oublier de se placer dans le 
répertoire de Koel) 
 
``` bash 
npm install 
``` 
 
``` bash 
composer install 
``` 
 
A ce stade de progression, il est désormais nécéssaire d'éditer le 
fichier de configuration de Laravel (Le framework utilisé par Koel) 
 
``` bash 
cp .env.example .env 
``` 
 
Si vous n'avez pas de .env.example, je vous invite à vous rendre 
[ici](https://github.com/phanan/koel/blob/master/.env.example) afin de 
le télécharger. 
 
A l'intérieur de ce fichier, il y a plusieurs lignes à editer : 
 
-   **DB_CONNECTION** : Moteur de base de donnée à employer 
    (Généralement, MySQL) 
-   **DB_HOST** : Host sur lequel est hébergée votre base de donnée 
    (Généralement, localhost) 
-   **DB_DATABASE** : Nom de la base de donnée (Selon notre tutoriel, 
    Koel) 
-   **DB_USERNAME** : Nom d'utilisateur pour vous connecter à votre 
    base de donnée (Définis précédemment) 
-   **DB_PASSWORD** : Password pour vous connecter à votre base de 
    donnée (Définis précédemment) 
 
Nous modifions premièrement les identifiants de connexion à SQL. Nous 
devons maintenant les informations de connexion à Koel 
 
-   **ADMIN_EMAIL** : Identifiant de connexion à Koel (Peut être fake) 
-   **ADMIN_NAME** : Nom de l'utilisateur 
-   **ADMIN_PASSWORD** : Mot de passe de connexion à Koel 
 
Accessoirement, voici quelques valeurs qu'il peut être possible 
d'éditer, selon ses besoins : 
 
-   **APP_MAX_SCAN_TIME** : Temps maximum passé durant le scan d'une 
    bibliothèque. Peut être utile d'augmenter si vous disposez d'une 
    large bibliothèque 
-   **STREAMING_METHOD** : Méthode utilisée pour envoyer les musiques 
 
```{=html} 
<!-- --> 
``` 
-   **LASTFM_API_SECRET** : Identifiant secret pour activer 
    l'utilisation de Last.FM dans Koel 
-   **LASTFM_API_KEY** : Clé secrète pour activer l'utilisation de 
    Last.FM dans Koel 
 
Pour obtenir ces identifiants LastFM, rendez-vous 
[ici](http://www.last.fm/api/account/create) 
 
-   **FFMPEG_PATH** : Chemin absolu vers le bin de ffmpeg, afin de 
    pouvoir transcoder 
-   **OUTPUT_BIT_RATE** : Bitrate utilisée pour le transcodage (128 par 
    défaut, 256 recommandé) 
 
Afin de créer le premier compte, qui sera l'admin, il est nécéssaire de 
rentrer des valeurs dans les variables **ADMIN_EMAIL**, **ADMIN_NAME** 
et **ADMIN_PASSWORD**. 
 
Une fois cela fait, nous allons utiliser une nouvelle fois artisan afin 
de les générer en base de données : 
 
``` bash 
php artisan db:seed 
``` 
 
Nous allons générer les JS & CSS de notre Koel 
 
``` bash 
bower install --allow-root 
``` 
 
``` bash 
gulp --production 
``` 
 
Et enfin, toujours en étant dans le dossier Koel, nous initialisons le 
premier lancement de Koel 
 
``` bash 
php artisan koel:init 
``` 
 
Puis, nous pouvons lancer un serveur Web (Qui tournera sur le port 8000) 
 
``` bash 
php artisan koel:serve --host 0.0.0.0 
``` 
 
Pour que ce serveur intégrer puisse fonctionner, nous avons besoin de 
quelques librairies: 
 
``` bash 
apt-get install libcrystalhd-dev libvdpau1 
``` 
 
Si vous souhaitez avoir Koel qui tourne sur le port 80, vous pouvez 
ajouter **'--port 80** à la ligne ci-dessus. 
 
## Bonus 
 
### Auto-update librairie 
 
Il est possible d'automatiser la mise à jour de sa bibliothèque vient 
une simple ligne cron. 
 
Pour cela, ajoutez cette ligne 
 
``` bash 
0 0 * * * cd /var/www/koel/ && /usr/bin/php artisan koel:sync >/dev/null 2>&1 
``` 
 
### nGinx 
 
Il est également possible de se passer du '"serveur'" intégré à Koel et 
de faire son propre server block pour nginx. Koel nous en fournit déjà 
un par défaut qui fonctionne très bien. 
 
Je vous invite à aller voir 
[ici](https://github.com/phanan/koel/blob/2.0/nginx.conf.example) et de 
l'adapter selon vos besoins. 
 
### Serveur en tache de fond 
 
Si toutefois, vous souhaitez utiliser le serveur intégré à Koel (ce que 
je ne comprendrais pas), vous devrez l'exécuter en tâche de fond 
 
Créer l'instance screen 
 
``` bash 
screen -S Koel 
``` 
 
Puis on lance la commande habituelle 
 
``` bash 
php artisan koel:serve --host 0.0.0.0 
``` 
 
Et enfin, on sort du screen avec *CTRL+A* pour attached, puis *CTRL+D* 
pour detached 
