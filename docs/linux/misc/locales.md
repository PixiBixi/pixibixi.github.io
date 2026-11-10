---
description: Gagner de l'espace disque en supprimant les locales inutiles avec localepurge
tags:
  - locale
---

# Gagner de la place en supprimant les locales inutiles

Les locales sont des fichiers sous Linux prenant plus ou moins de place
comprenant différents éléments pour la langue.

Ceux-ci pèsent plus ou moins lourd, mais toute fois, il s'agit d'un
moyen facile pour gagner de la place.

On commence par installer le binaire, **localepurge** (paquet Debian/Ubuntu)

```bash
apt-get -y install localepurge
```

Laissez les options par défaut pour le moment, nous reviendrons sur la
configuration plus tard.

Attention, tant qu'on n'a coché aucune locale, le filtre dpkg posé par défaut (`/etc/dpkg/dpkg.cfg.d/50localepurge`) fait déjà que les paquets installés ensuite arrivent sans aucune traduction. On configure donc tout de suite les locales à garder. Les man pages des langues non cochées sont supprimées aussi (option cochée par défaut), et la purge se relance d'elle-même après chaque `apt install`.

Pour configurer le paquet, voici comment procéder :

```bash
dpkg-reconfigure localepurge
```

<https://memo-linux.com/localepurge-faire-de-la-place-sur-son-disque-en-supprimant-les-locales/>
