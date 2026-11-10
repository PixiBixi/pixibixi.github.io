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

* **Vérifier l'état physique d'une connexion** - si le CDP passe, l'interface est en *Up/Up*
* **Obtenir des informations sur son voisin** - adresse IP, version...
* **Découvrir la topologie du réseau** en passant de machine en machine

## Condition d'utilisation

CDP est un protocole Cisco - les équipements doivent être de marque Cisco.
L'interface physique doit être up et les deux machines doivent être voisines.

Côté Linux, `lldpd` implémente aussi CDP (option `-c`) : un serveur peut alors apparaître dans `show cdp neighbors` et voir ses switchs, ce qui peut être pratique pour un inventaire réseau.

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

CDP annonce le modèle, la version d'IOS et l'IP de management à quiconque est branché : on le coupe sur les ports d'accès (côté utilisateurs), sauf là où un téléphone IP Cisco s'en sert pour récupérer son voice VLAN.

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

* `cdp holdtime <x>` - durée de vie de l'information envoyée (10-255, 180 s par défaut)
* `cdp timer <x>` - période de renvoi des informations (5-254, 60 s par défaut)

Le holdtime doit rester supérieur au timer, sinon les voisins disparaissent de la table entre 2 annonces.

Source : [ciscomadesimple.be](https://www.ciscomadesimple.be/2010/03/09/cdp-cisco-discovery-protocol/)
