# STP : Spanning Tree Protocol

Rappel sur les commandes utiles pour le protocole STP

## Montrer les informations utiles

### De tous les VLAN

    Switch(config)# show spanning-tree

### D'un VLAN précis

    Switch(config)# show spanning-tree vlan $id

## Définition du pont racine

### Principal

    Switch(config)# spanning-tree vlan id_de_vlan root primary

### De backup

    Switch(config)# spanning-tree vlan id_de_vlan root secondary

## Modes

### STP

    Switch(config)# spanning-tree mode stp

### RSTP

    Switch(config)# spanning-tree mode rapid-pvst

## BPDU Guard

### Partout

    Switch(config-if-range)# spanning-tree bpduguard enable

### Sur certains interfaces

    Switch(config)# interface range fa0/1–10
    Switch(config-if-range)# spanning-tree bpduguard enable
