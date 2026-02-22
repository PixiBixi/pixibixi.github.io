---
description: Présentation et commandes du protocole CDP (Cisco Discovery Protocol) pour la découverte de voisins réseau
---

# Le Protocole CDP

## Présentation

Le protocole CDP (**C**isco **D**iscover **P**rotocol) est un protocole
de découverte de périphériques réseau qui fonctionne au L2. Comme son
nom l'indique est développé par Cisco dans le but de '"signaler sa
présence'" à ses voisins, afin d'obtenir différentes informations
intrinsèque à l'équipement tel que son nom, modèle...

## Utilité

Comme nous avons pu le dire précédemment, le protocole CDP permet de
retrouver des propriétés intrinsèque à chaque équipemment, mais nous
pouvons également en tirer d'autres utilités :

* **Vérifier l'état physique d'une connexion**. Si le CDP passe,
    c'est que l'interface et la couche de liaison est opérationnelle.
    L'interface concernée sera donc en *Up/Up*.
* **Obtenir des informations sur son voisin** telle que son adresse
    IP, numéro de version...
* **Découvrir la topologie du réseau** en passant de machine à
    machine...

## Condition d'utilisation

Comme son nom l'indique **C**isco **D**iscover **P**rotocol est un
protocole Cisco, il est donc impératif que les matériels utilisés soient
de marque Cisco. Toutefois, étant donner que l'iOS est basé sur un
noyau Linux, il est possible de l'implémenter sur des machines Linux,
ce qui peut être pratique pour un inventaire réseau par exemple.

A part cela, il n'y a aucun réel pré-requis pour utiliser le procole
CDP. A noter cependant que l'interface physique doit être up, que les
deux machines doivent être voisines.

## Utilisation

### Informations de base

show cdp

### Informations CDP sur les interfaces

#### Toutes les interfaces

show cdp interface

#### Une interface précise

show cdp interface '<type'> '<numero'> show cdp interface Fa 0/0

### Informations Voisines

#### Basique

show cdp neighbors

#### Détaillée

show cdp neighbors detail

### Détail sur une entrée précise

show cdp entry '<id'>

### Effacer la table CDP

clear cdp table

### Activer ou désactiver CDP

#### Désactiver

##### Globalement

no cdp run

##### Sur une interface

interface Fa0/0 no cdp enable exit

#### Activer

##### Globalement

cdp run

##### Sur une interface

interface Fa0/0 cdp enable exit

### Packets CDP

cdp holdtime '<x'> : Durée de vie de l'information envoyée (10 - 255)
cdp timer '<x'> : Définit la période à laquelle l'équipement doit
renvoyer les informations (5-254)

<https://www.ciscomadesimple.be/2010/03/09/cdp-cisco-discovery-protocol/>
