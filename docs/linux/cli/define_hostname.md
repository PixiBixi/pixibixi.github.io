---
description: Configurer le hostname et le FQDN — éditer /etc/hostname et /etc/hosts correctement
---

# Configurer correctement son hostname

Dans cet article, nous allons voir comment configurer correctement notre
nom de domaine

## Vocabulaire

Tout d'abord, pour bien installer son nom de domaine, voici un peu de
vocabulaire spécifique dont nous aurons besoin par la suite :

* Nom de domaine principal : domain.tld

Il s'agit du nom de domaine que l'ont vient d'acheter (Par exemple :
toto.fr)

* Nom dhôte : hostname

Il s'agit ce coup-ci du nom que portera notre machine (Par exemple :
warrior)

* FQDN : hostname.domain.tld

Désormais, il s'agit du '"mélange'" des deux éléments précédents (Donc
dans notre cas : warrior.toto.fr)

* Reverse : hostname.domain.tld

Attention, il se peut qu'il y ai parfois un . à la fin de celui-ci
(Dans notre cas : warrior.toto.fr.)

## Installer correctement le nom de domaine sur son serveur

Tout d'abord, nous devons configurer l'hostname

Tout au long du tutoriel, nous allons prendre en exemple nos valeurs
d'exemple

```bash
echo "warrior" > /etc/hostname
```

Ou alors, une autre possibilité :

```bash
hostname warrior
```

Puis on edit le fichier **/etc/hosts**

```bash
$ cat /etc/hosts
127.0.0.1 warrior.toto.fr warrior
127.0.0.1 localhost.localdomain localhost
IPv4 warrior.toto.fr warrior
IPv6 warrior.toto.fr warrior
```

Les lignes concernant 127.0.0.1 ne sont pas à éditer

## Vérifications

Concernant les vérifications, celles-ci devront se faire dans **une
autre session SSH** en tant que **root**

Tout va se passer avec la commande **hostname** et différentes options

Voici les différentes commande à effectuer :

```bash
hostname -d
```

Doit retourner le nom de domaine

```bash
hostname -f
```

Doit retourner le FQDN

```bash
hostname -a
```

Doit retourner l'hostname

Si tout se passe correctement, alleluia, sinon, il faut répeter les
étapes précédentes
