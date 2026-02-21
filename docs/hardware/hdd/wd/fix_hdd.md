# WD Green HDD, Comment prémunir le old_age prématuré

Ce problème est du à la technologie **IntelliPark** qui a été introduite
dans les WD Green ainsi que les RED. Cette technologie défaillante
provoque un vieillissement prématuré du disque dur.

Pour la désactiver, nous allons utiliser l'outil **idle3-tools**
disponible [ici](http://idle3-tools.sourceforge.net/) ou alors dans les
repos Debian/Ubuntu :

```bash
apt install idle3-tools
```

Nous commencons par voir l'état du IntelliPark

```bash
idle3ctl -g /dev/sda
```

Si celui-ci est différent de disabled, alors nous le désactivons :

```bash
idle3ctl -d /dev/sda
```

Repeter l'opération pour chaque disque dur, puis redémarrer.
