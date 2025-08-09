# Cisco : Désactiver la résolution DNS

## Présentation

Il nous est tous arrivé de taper une commande fausse sur un terminal Cisco, et de perdre de précieuse minutes à cause d'une résolution qui se finit par un timeout.. Voici comment désactiver ce fléau.

## Désactivation

Tout d'abord, on rentre dans le mode configuration

```cisco
    Routeur>enable
    Routeur#conf terminal
```

Puis on désactive la résolution DNS, pour ne plus avoir de problème

```cisco
    Routeur(config)#no ip domain-lookup
```

Lorsque nous taperons une commande fausse, ou un ping, on aura juste une erreur, plus un affreux timeout :)

**Raccourci : Alt Maj 6**
