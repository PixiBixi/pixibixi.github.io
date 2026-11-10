---
description: Référence sur les dénominations fibre optique - longueurs d'onde, monomode, multimode et connecteurs
tags:
  - Fiber
  - Transceiver
---

# Informations utile sur les dénominations fibre optique

## Longeur d'onde

- **1310/1550nm** : Monomode en général
- **850nm** : Multimode

La règle n'est pas stricte : du 1310nm tourne aussi sur du multimode (10GBASE-LRM, ou 1000BASE-LX avec un patch de conditionnement au-delà de 300m).

## Connecteur

- **LC** : Connecteur le plus « basique »
- **DAC** : Direct Attach Cables : Généralement pour stacker les switchs

## Dénominations

- **SR** = Short Reach = Multimode (850nm)
- **SM** / **SMF** = Monomode (Single-Mode Fiber)
- **MM** / **MMF** = Multimode (Multi-Mode Fiber)

## Récapitulatif

EX, ZX, EZX (en SFP) et ZR (en SFP+) ne sont pas des normes IEEE mais des désignations constructeur : la portée réelle dépend du modèle, on vérifie la fiche technique.

### SFP

|  Connecteur |  Nom    | Fibre | Longeur |
| :---------: |:------: | :---: | :------:|
| SFP         |SX   | Multimode, 850nm | 550m (OM2), 220-275m (OM1) |
| SFP         |LX   | Monomode, 1310nm | 10km (5km dans la norme IEEE) |
| SFP         |EX   | Monomode, 1310nm | 40km |
| SFP         |ZX   | Monomode, 1550nm | 70-80km |
| SFP         |EZX  | Monomode, 1550nm | 120km et plus selon le constructeur |

### SFP+

|  Connecteur   |   Nom  | Fibre | Longeur |
|  :---------:  |:------:| :---: | :------:|
|  SFP+         |SR       | Multimode, 850nm | 300m (OM3), 400m (OM4), 33-82m (OM1/OM2) |
|  SFP+         |LRM      | Multimode, 1310nm | 220m |
|  SFP+         |LR       | Monomode, 1310nm | 10km |
|  SFP+         |ER       | Monomode, 1550nm | 40km |
|  SFP+         |ZR       | Monomode, 1550nm | 80km |

Moyen mnémotechnique : les noms en **X** (1000BASE-X, codage 8b/10b) sont du 1G, donc du **SFP**, et les noms en **R** (10GBASE-R, codage 64b/66b) sont du 10G, donc du **SFP+**.

## Diagnostic

La plupart des optiques exposent du DOM (Digital Optical Monitoring, SFF-8472) : température, tension, courant du laser, puissance TX et RX. Sous Linux, on le lit avec `ethtool -m` :

```bash
ethtool -m eth0
```

Une puissance RX très basse pointe vers une fibre sale, abîmée ou une optique incompatible (monomode d'un côté, multimode de l'autre).

Enormement d'informations sont disponibles dans le [wiki fibre](https://fibre.wiki/index.php/Accueil)
