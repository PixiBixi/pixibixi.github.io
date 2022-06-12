# Lancer la console iLO depuis un Mac

Depuis un Mac, il ne faut pas double cliquer sur le .jnlp, cela ne
marche pas.

Il faut donc passer par la ligne de commande et faire cette commande :

## iLO

``` bash
javaws iLO-jirc.jnlp
```

## iDRAC

Pour iDRAC, il se peut que l'on doive tout d'abord faire une exception
de sécurité, pour cela, nous devons modifier la configuration de Java :

``` bash
javaws -viewer
```

Puis lancer comme d'habitude le jnlp
