---
description: Créer un VLAN sur un switch Cisco IOS - ports en access, interface VLAN de management et passerelle par défaut
tags:
  - Cisco
  - VLAN
---

# Cisco : Créer son VLAN

Étant donné que créer son VLAN a toujours été chiant, voici un petit
mémo pour s'en rappeler

## Configurer un VLAN

### Exemple concret

On dispose d'un Switch (**24 ports FastEthernet**, **2 ports Gigabits**) et d'un routeur (**1 port Gigabit, 1 port série**). On souhaite attribuer le **VLAN3** aux interfaces Fa0/6 à Fa0/12.

- **Réseau VLAN3 :** 192.168.0.0/24
- **IP de management du switch (interface VLAN 3) :** 192.168.0.1
- **IP du routeur (passerelle du VLAN 3) :** 192.168.0.254

### Au niveau du routeur

Le routeur est relié au port Gi0/1 du switch, en trunk, et porte la passerelle 192.168.0.254 sur la sous-interface Gi0/1.3. La configuration des 2 côtés du lien est détaillée dans [Routage Inter-VLAN](routage_vlan.md).

### Au niveau du Switch

On se place au bon niveau d'exécution

```cisco
Switch>en
Switch#configure terminal
```

On crée le VLAN et on lui donne un nom

```cisco
Switch(config)#vlan 3
Switch(config-vlan)#name VLAN3
Switch(config-vlan)#exit
```

Puis on sélectionne les interfaces qui doivent être utilisées pour ce VLAN

```cisco
Switch(config)#interface range Fa0/6-12
Switch(config-if-range)#switchport mode access
Switch(config-if-range)#switchport access vlan 3
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit
```

On configure l'interface VLAN, qui porte l'IP de management du switch

```cisco
Switch(config)#interface VLAN 3
Switch(config-if)#ip address 192.168.0.1 255.255.255.0
Switch(config-if)#description VLAN3
Switch(config-if)#no shutdown
Switch(config-if)#exit
```

Et enfin, **on n'oublie pas d'attribuer une passerelle par défaut**

```cisco
Switch(config)#ip default-gateway 192.168.0.254
```

Petite commande afin de vérifier la configuration des VLAN :

```cisco
Switch(config)#do show vlan
```
