# Gagner de la place en supprimant les locales inutiles

Les locales sont des fichiers sous Linux prenant plus ou moins de place
comprenant différents éléments pour la langue.

Ceux-ci pèsent plus ou moins lourd, mais toute fois, il s'agit d'un
moyen facile pour gagner de la place.

On commence par installer le binaire, **localepurge**

```bash
$ apt-get -y install localepurge
```

Laissez les options par défaut pour le moment, nous reviendrons sur la
configuration plus tard.

Pour configurer le paquet, voici comment procéder :

```bash
$ dpkg-reconfigure localepurge
```

<http://memo-linux.com/localepurge-faire-de-la-place-sur-son-disque-en-supprimant-les-locales/>
