---
description: Mettre en place le routage inter-VLAN sur Cisco IOS - router-on-a-stick et sous-interfaces
tags:
  - Cisco
  - VLAN
  - Routing
---

# Cisco : Routage Inter-VLAN

Une fois les VLAN fait, ceux-ci sont isolés logiquement et ne peuvent
donc communiquer entrent-eux.

Nous devons donc agir au niveau du routeur pour faire en sorte qu'ils
puissent communiquer entrent eux

## Exemple concret

On dispose dun Switch (**24 ports FastEthernet**, **2 ports Gigabits**)
et dun routeur (**1 port Gigabit, 1 port série**). On souhaite
attribuer le **VLAN3**
aux interfaces Fa0/6 à Fa0/12

- **Réseau VLAN3 :** 192.168.0.0/24
- **Lien switch-routeur :** port Gi0/1 du switch relié au port Gi0/1 du routeur
- **IP de management du switch (interface VLAN 3) :** 192.168.0.1
- **IP Routeur Gi0/1.3 :** 192.168.0.254, c'est la passerelle par défaut des machines du VLAN 3

## Application côté routeur

Pour cela, nous allons donc devoir faire des sous-interfaces sur
l'interface **Gi0/1** du **routeur**

Une sous interface est une interface logique sur un routeur, nous la
reconnaissons car elle comporte un **.** (Exemple **Gi0/1.3**...)

Généralement, la sous-interface correspond au numéro du VLAN.

Il faut également faire une sous-interface par VLAN.

L'interface physique parent ne porte pas d'IP, mais elle doit être activée : un `no shutdown` sur la seule sous-interface ne suffit pas.

```cisco
    Router(config)#interface Gi0/1
    Router(config-if)#no ip address
    Router(config-if)#no shutdown
    Router(config-if)#exit
    Router(config)#interface Gi0/1.3
    Router(config-subif)#encapsulation dot1Q 3
    Router(config-subif)#ip address 192.168.0.254 255.255.255.0
    Router(config-subif)#exit
```

Ici, nous voyons que nous avons activer l'encapsulation **Dot1Q** avec
le **VLAN 3** afin de taguer les trames en provenance du Routeur et de
les encapsuler au format **802.1Q**

Il est également indispensable d'attribuer une adresse IP à la
sous-interface car celle-ci correspondra à la gateway des machines
appartenant au **VLAN 3**

## Application côté switch

Le port du switch relié au routeur doit être en trunk, sinon les trames taguées 802.1Q n'arrivent jamais à la sous-interface. Sur les switchs qui gèrent aussi l'ISL (3560, 3750...), on ajoute `switchport trunk encapsulation dot1q` avant `switchport mode trunk`, un 2960 ne connaît que le dot1Q.

```cisco
    Switch(config)#interface Gi0/1
    Switch(config-if)#switchport mode trunk
    Switch(config-if)#switchport trunk allowed vlan 3
    Switch(config-if)#no shutdown
    Switch(config-if)#exit
    Switch(config)#ip default-gateway 192.168.0.254
```

On vérifie que le VLAN 3 passe bien sur le trunk :

```cisco
    Switch#show interfaces trunk
```

## Avec un switch L3

Sur un switch L3, pas besoin de routeur : on active le routage et on met la passerelle directement sur l'interface VLAN (SVI) du switch.

```cisco
    Switch(config)#ip routing
    Switch(config)#interface vlan 3
    Switch(config-if)#ip address 192.168.0.254 255.255.255.0
    Switch(config-if)#no shutdown
```
