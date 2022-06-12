# Cisco : Désactiver la résolution DNS

## Présentation

Il nous est tous arrivé de taper une commande fausse sur un terminal
Cisco, et de perdre de précieuse minutes à cause d'une résolution qui
se finit par un timeout.. Voici comment désactiver ce fléau.

![](/cisco/noipdomainlookup01.png){.align-center}

## Désactivation

Tout d'abord, on rentre dans le mode configuration

    Routeur>enable
    Routeur#conf terminal

Puis on désactive la résolution DNS, pour ne plus avoir de problème

    Routeur(config)#no ip domain-lookup

Lorsque nous taperons une commande fausse, ou un ping, voici ce que
l'on obtiendra ![](/cisco/noipdomainlookup.jpg){.align-center}

**Raccourci : Alt Maj 6**
