# Installer PHP7.4

**Article obselete**

Ajout du repo :

``` bash
$ apt-get install apt-transport-https lsb-release ca-certificates
$ wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
$ echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list
```

Puis un petit update/install php7.x, et le tour est joué

``` bash
$ apt update && apt install -y php7.4-fpm
```

**NB** : PHP 7.4 est désormais disponible sur le repository, ne pas
hésiter à se rendre sur le site de Sury pour être à jour avec PHP
