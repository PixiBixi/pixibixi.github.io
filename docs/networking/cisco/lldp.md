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
Il est défini par le standard **802.11AB**. Contrairement au CDP (Cisco),
l'avantage du LLDP est qu'il est compatible sur toutes les plateformes sans modification.

## Utilité

Le protocole LLDP permet de retrouver des propriétés intrinsèques à chaque équipement :

* **Vérifier l'état physique d'une connexion** — si le LLDP passe, l'interface est en *Up/Up*
* **Obtenir des informations sur son voisin** — adresse IP, version...
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

```ios
interface Fa0/0
 no lldp enable
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
 lldp enable
exit
```

### Timers LLDP

* `lldp holdtime <x>` — durée de vie de l'information envoyée (10-255)
* `lldp timer <x>` — période de renvoi des informations (5-254)
