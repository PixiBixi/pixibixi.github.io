---
description: Lancer la console iLO ou iDRAC depuis macOS via Java Web Start
tags:
  - HP
  - iLO
---

# Lancer la console iLO depuis un Mac

!!! warning "Obsolète"
    Java Web Start (`javaws`) a été supprimé dans Oracle JDK 11+ et OpenJDK. Cette méthode ne fonctionne plus sur les macOS récents. Préférer l'accès HTML5 intégré aux iLO récents ou [iLOrest](https://github.com/HewlettPackard/python-ilorest-library).

Depuis un Mac, il ne faut pas double cliquer sur le .jnlp, cela ne
marche pas.

Il faut donc passer par la ligne de commande et faire cette commande :

## iLO

```bash
javaws iLO-jirc.jnlp
```

## iDRAC

Pour iDRAC, il se peut que l'on doive tout d'abord faire une exception
de sécurité, pour cela, nous devons modifier la configuration de Java :

```bash
javaws -viewer
```

Puis lancer comme d'habitude le jnlp
