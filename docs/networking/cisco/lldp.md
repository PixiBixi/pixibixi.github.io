---
description: Présentation et commandes du protocole LLDP (Link Layer Discovery Protocol) pour la découverte de voisins multi-constructeurs
---

# Le Protocole LLDP

## Présentation

Le protocole LLDP (**L**ink **L**ayer **D**iscover **P**rotocol) est un
protocole de découverte de périphériques réseau qui fonctionne au L2. Il
est défini par le standard **802.11AB** Le LLDP fonctionne exactement
comme le protocole LLDP, mais l'avantage de celui-ci est qu'il est
compatible sous toutes les plateformes (Sans aucune modification
nécéssaire)

## Utilité

Comme nous avons pu le dire précédemment, le protocole LLDP permet de
retrouver des propriétés intrinsèque à chaque équipemment, mais nous
pouvons également en tirer d'autres utilités :

* **Vérifier l'état physique d'une connexion**. Si le LLDP passe,
    c'est que l'interface et la couche de liaison est opérationnelle.
    L'interface concernée sera donc en *Up/Up*.
* **Obtenir des informations sur son voisin** telle que son adresse
    IP, numéro de version...
* **Découvrir la topologie du réseau** en passant de machine à
    machine...

## Cisco

Etant donner que LLDP est un protocle assez récent, il n'est disponible
uniquement sur des équipements Cisco et des iOS assez

## Autres

## Utilisation

### Informations de base

show lldp

### Informations LLDP sur les interfaces

#### Toutes les interfaces

show lldp interface

#### Une interface précise

show lldp interface '<type'> '<numero'> show lldp interface Fa 0/0

### Informations Voisines

#### Basique

show lldp neighbors

#### Détaillée

show lldp neighbors detail

### Détail sur une entrée précise

show lldp entry '<id'>

### Effacer la table LLDP

clear lldp table

### Activer ou désactiver LLDP

#### Désactiver

##### Globalement

no lldp run

##### Sur une interface

interface Fa0/0 no lldp enable exit

#### Activer

##### Globalement

lldp run

##### Sur une interface

interface Fa0/0 lldp enable exit

### Packets LLDP

* `lldp holdtime <x>` : Durée de vie de l'information envoyée (10 - 255)
* `lldp timer <x>` : Définit la période à laquelle l'équipement doit renvoyer les informations (5-254)
