---
description: Créer et gérer des VLANs sur Cisco IOS — configuration, trunk et access ports
---

# Cisco : Créér son VLAN

Etant donner que créer son VLAN a toujours été chiant, voici un petit
mémo pour s'en rappeler

## Configurer un VLAN

### Exemple concret

On dispose dun Switch (**24 ports FastEthernet**, **2 ports Gigabits**)
et dun routeur (**1 port Gigabit, 1 port série**). On souhaite
attribuer le **VLAN3**'
aux interfaces Fa0/6 à Fa0/12'
**IP VLAN3 :** 192.168.0.2'
**IP Switch GA0/0 :** 192.168.0.1

### Au niveau du routeur

On se place dans le mode approprié

    Router>en
    Router#configure terminal

On sélectionne l'interface, lui attribue l'IP, et l'active

    Router(config)#interface G0/0
    Router(config-if)#ip address 192.168.0.1 255.255.255.0
    Router(config-if)#description GB SW0-Router
    Router(config-if)#no shutdown

### Au niveau du Switch

Comme dans le routeur, on se place au bon niveau d'exécution

    Switch>en
    Switch#configure terminal

On configure l'interface désirée

    Switch(config)#interface Vlan 3
    Switch(config-vlan)#ip address 192.168.0.2 255.255.255.0
    Switch(config-vlan)#description VLAN3
    Switch(config-vlan)#no shutdown

Enfin, on met un nom à notre Vlan, puis on sélectionne les interfaces
qui doivent être utilisées pour ce Vlan

    Switch(config)interface range Fa0/6-12
    Switch(config-if-range)#switchport mode access
    Switch(config-if-range)#switchport access vlan 3
    Switch(config-if-range)#no shutdown

Maintenant le nom

    Switch(config)#vlan 3
    Switch(config-vlan)#name "VLAN3"
    Switch(config-vlan)#exit

Et enfin, **on n'oublie pas d'attribuer une passerelle par défaut**

    Switch(config)#ip default-gateway 192.168.0.1

Petite commande afin de vérifier la configuration des VLAN :

    Switch(config)#do show vlan
