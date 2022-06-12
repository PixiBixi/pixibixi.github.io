# QOS Cisco

## Introduction

La QOS (**Q**uality **O**f **S**ervice) est la mesure de la qualité de
transmission et de la disponibilité des services dun réseau.

Elle dépend de la latence, des pertes, mais également des exigences de
chacun.

La QOS repose sur différentes opérations :

-   Classification et marquage des trames
-   Gestion des trafics
-   Classification des trafics par priorité
-   Reordonnancement des trames

## Application QOS Automatique

Sous Cisco, il est possible d'activer automatiquement la QOS sur les
routeurs mais également sur les switchs

``` cisco
Switch(config)# interface gigabitethernet0/1
Switch(config-if)# auto qos voip trust
Switch(config-if)# mls qos trust cos
```

Il s'agit d'une QoS simplissime, des QoS beaucoup plus complexes
peuvent être appliquées via des class-map et policy-map
