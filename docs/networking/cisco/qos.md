---
description: Configurer la QoS (Quality of Service) sur Cisco IOS - marquage, classification et politiques de file d'attente
tags:
  - Cisco
  - QoS
---

# QoS Cisco

## Introduction

La QoS (**Q**uality **O**f **S**ervice) est la mesure de la qualité de
transmission et de la disponibilité des services d'un réseau.

Elle dépend de la latence, des pertes, mais également des exigences de
chacun.

La QoS repose sur différentes opérations :

* Classification et marquage des trames
* Gestion des trafics
* Classification des trafics par priorité
* Reordonnancement des trames

## Application QoS Automatique

Sous Cisco, il est possible d'activer automatiquement la QoS (AutoQoS) sur les routeurs mais également sur les switchs. La syntaxe dépend de la plateforme.

Sur les Catalyst legacy (2960, 3560, 3750), on active AutoQoS sur le port avec `auto qos voip trust`. La commande active `mls qos` en global et pose elle-même `mls qos trust cos` sur un port switché (`mls qos trust dscp` sur un port routé), inutile de l'ajouter à la main :

```cisco
Switch(config)# interface gigabitethernet0/1
Switch(config-if)# auto qos voip trust
```

Sur Catalyst 9000, `mls qos` n'existe plus : AutoQoS génère des class-map et policy-map MQC. On fait confiance aux marquages avec `auto qos trust cos` ou `auto qos trust dscp` (sans mot-clé, CoS sur un port L2 et DSCP sur un port routé) :

```cisco
Switch(config)# interface gigabitethernet1/0/1
Switch(config-if)# auto qos trust dscp
```

Sur un routeur, c'est `auto qos voip` sur l'interface, avec CEF actif. Sans `trust`, le routeur classe la voix via NBAR et la marque lui-même, avec `trust` il garde les marquages DSCP reçus :

```cisco
Router(config)# interface gigabitethernet0/0
Router(config-if)# auto qos voip trust
```

Il s'agit d'une QoS simplissime, des QoS beaucoup plus complexes
peuvent être appliquées via des class-map et policy-map
