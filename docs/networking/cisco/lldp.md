---
description: Présentation et commandes du protocole LLDP (Link Layer Discovery Protocol) pour la découverte de voisins multi-constructeurs
tags:
  - Cisco
  - LLDP
---

# Le Protocole LLDP

## Présentation

Le protocole LLDP (**L**ink **L**ayer **D**iscovery **P**rotocol) est un
protocole de découverte de périphériques réseau qui fonctionne au L2.
Il est défini par le standard **IEEE 802.1AB**. Contrairement au CDP (Cisco), l'avantage du LLDP est que c'est un standard ouvert, parlé par la plupart des constructeurs. Il n'est pas forcément actif pour autant : sur IOS il est désactivé par défaut (il faut un `lldp run`), et les TLV optionnels annoncés varient d'un équipement à l'autre.

## Utilité

Le protocole LLDP permet de retrouver des propriétés intrinsèques à chaque équipement :

* **Vérifier l'état physique d'une connexion** - si le LLDP passe, l'interface est en *Up/Up*
* **Obtenir des informations sur son voisin** - adresse IP, version...
* **Découvrir la topologie du réseau** en passant de machine en machine

## Utilisation

### Informations de base

```ios
show lldp
```

### Informations LLDP sur les interfaces

#### Toutes les interfaces

```ios
show lldp interface
```

#### Une interface précise

```ios
show lldp interface Fa 0/0
```

### Informations voisines

#### Basique

```ios
show lldp neighbors
```

#### Détaillée

```ios
show lldp neighbors detail
```

### Détail sur une entrée précise

```ios
show lldp entry <id>
```

### Effacer la table LLDP

```ios
clear lldp table
```

### Activer ou désactiver LLDP

#### Désactiver

##### Globalement

```ios
no lldp run
```

##### Sur une interface

Sur IOS, il n'y a pas de `lldp enable` : on coupe l'émission et la réception séparément.

```ios
interface Fa0/0
 no lldp transmit
 no lldp receive
exit
```

#### Activer

##### Globalement

```ios
lldp run
```

##### Sur une interface

```ios
interface Fa0/0
 lldp transmit
 lldp receive
exit
```

### Timers LLDP

* `lldp holdtime <x>` - durée de vie de l'information envoyée (0-65535 secondes, 120 par défaut)
* `lldp timer <x>` - période de renvoi des informations (5-65534 secondes, 30 par défaut)
