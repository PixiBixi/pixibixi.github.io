---
description: Configurer le hostname et le FQDN - éditer /etc/hostname et /etc/hosts correctement
tags:
  - hostname
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

Désormais, il s'agit du « mélange » des deux éléments précédents (Donc
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

`/etc/hostname` n'est lu qu'au boot. Pour appliquer le nom tout de suite, on le pose aussi à chaud ; `hostname` seul ne change le nom que jusqu'au prochain reboot :

```bash
hostname warrior
```

Sur une machine avec systemd, `hostnamectl` fait les 2 d'un coup (nom courant et `/etc/hostname`) :

```bash
hostnamectl hostname warrior
```

Puis on edit le fichier **/etc/hosts**. La ligne `localhost` ne bouge pas. On ajoute une ligne avec le FQDN en premier puis le nom court en alias, sur l'IP fixe du serveur (IPv4 et IPv6) :

```bash
$ cat /etc/hosts
127.0.0.1 localhost
203.0.113.10 warrior.toto.fr warrior
2001:db8::10 warrior.toto.fr warrior
```

Sans IP fixe, on met cette ligne sur `127.0.1.1` (convention Debian) plutôt que sur `127.0.0.1` :

```bash
127.0.1.1 warrior.toto.fr warrior
```

L'ordre compte : le premier nom de la ligne est le FQDN, les suivants sont des alias. Sans le nom court sur cette ligne, `hostname -f` ne trouve rien et répond `Name or service not known`.

## Vérifications

Concernant les vérifications, celles-ci devront se faire dans **une
autre session SSH** en tant que **root**

Tout va se passer avec la commande **hostname** et différentes options

Voici les différentes commande à effectuer :

```bash
hostname -d
```

Doit retourner le nom de domaine, c'est-à-dire le FQDN sans le premier segment. Si le FQDN ne résout pas (ni `/etc/hosts`, ni DNS), la commande échoue avec `Name or service not known`.

```bash
hostname -f
```

Doit retourner le FQDN

```bash
hostname -a
```

Doit retourner les alias, donc ici l'hostname `warrior` parce qu'on l'a mis en alias dans `/etc/hosts`. Pour le nom court seul, c'est `hostname -s` (ou `hostname` tout court).

Si tout se passe correctement, alleluia, sinon, il faut répeter les
étapes précédentes

---

## Voir aussi

* [Mémo sur la commande IP](ip.md) - configuration réseau avancée au-delà du simple hostname
