---
description: Commandes utiles du Spanning Tree Protocol (STP) sur Cisco - vérification, priorité et protection
tags:
  - Cisco
  - STP
---

# STP : Spanning Tree Protocol

Rappel sur les commandes utiles pour le protocole STP

## Montrer les informations utiles

Les `show` se tapent en mode privilégié (`Switch#`). Depuis le mode config, on les préfixe par `do`.

### De tous les VLAN

    Switch# show spanning-tree

### D'un VLAN précis

    Switch# show spanning-tree vlan $id

## Définition du pont racine

### Principal

    Switch(config)# spanning-tree vlan id_de_vlan root primary

### De backup

    Switch(config)# spanning-tree vlan id_de_vlan root secondary

## Modes

IOS propose 3 modes : `pvst`, `rapid-pvst` et `mst`. Un seul est actif pour tous les VLAN.

### PVST+ (STP classique, une instance par VLAN)

    Switch(config)# spanning-tree mode pvst

### Rapid PVST+ (RSTP, une instance par VLAN)

    Switch(config)# spanning-tree mode rapid-pvst

### MST (802.1s, plusieurs VLAN par instance, pour les grands réseaux)

    Switch(config)# spanning-tree mode mst

## BPDU Guard

### Partout

En global, BPDU Guard s'applique à tous les ports en PortFast (pas aux autres) :

    Switch(config)# spanning-tree portfast bpduguard default

### Sur certains interfaces

    Switch(config)# interface range fa0/1 - 10
    Switch(config-if-range)# spanning-tree bpduguard enable
