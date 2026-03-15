---
description: Présentation et commandes du protocole CDP (Cisco Discovery Protocol) pour la découverte de voisins réseau
tags:
  - Cisco
  - CDP
---

# Le Protocole CDP

## Présentation

Le protocole CDP (**C**isco **D**iscovery **P**rotocol) est un protocole
de découverte de périphériques réseau qui fonctionne au L2. Développé par Cisco,
il permet de "signaler sa présence" aux voisins afin d'obtenir des informations
intrinsèques à l'équipement : nom, modèle...

## Utilité

Le protocole CDP permet de retrouver des propriétés intrinsèques à chaque équipement :

* **Vérifier l'état physique d'une connexion** — si le CDP passe, l'interface est en *Up/Up*
* **Obtenir des informations sur son voisin** — adresse IP, version...
* **Découvrir la topologie du réseau** en passant de machine en machine

## Condition d'utilisation

CDP est un protocole Cisco — les équipements doivent être de marque Cisco.
L'interface physique doit être up et les deux machines doivent être voisines.

Étant donné que l'IOS est basé sur un noyau Linux, il est possible d'implémenter CDP
sur des machines Linux via `lldpd` avec compatibilité CDP, ce qui peut être pratique
pour un inventaire réseau.

## Utilisation

### Informations de base

```ios
show cdp
```

### Informations CDP sur les interfaces

#### Toutes les interfaces

```ios
show cdp interface
```

#### Une interface précise

```ios
show cdp interface Fa 0/0
```

### Informations voisines

#### Basique

```ios
show cdp neighbors
```

#### Détaillée

```ios
show cdp neighbors detail
```

### Détail sur une entrée précise

```ios
show cdp entry <id>
```

### Effacer la table CDP

```ios
clear cdp table
```

### Activer ou désactiver CDP

#### Désactiver

##### Globalement

```ios
no cdp run
```

##### Sur une interface

```ios
interface Fa0/0
 no cdp enable
exit
```

#### Activer

##### Globalement

```ios
cdp run
```

##### Sur une interface

```ios
interface Fa0/0
 cdp enable
exit
```

### Timers CDP

* `cdp holdtime <x>` — durée de vie de l'information envoyée (10-255)
* `cdp timer <x>` — période de renvoi des informations (5-254)

Source : [ciscomadesimple.be](https://www.ciscomadesimple.be/2010/03/09/cdp-cisco-discovery-protocol/)
