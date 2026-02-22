---
description: Configurer OSPFv3 en IPv6 sur Cisco IOS — différences avec OSPFv2 et commandes essentielles
---

# OSPF en IPv6

l'OSPF en IPv6 fonctionne globalement pareil qu'en v4. Cependant, il y
a quelques différences.

## Configuration globale

La configuration globale d'OSPF en v4 et en v6 est différente :

En OSPFv2

    (config)# router ospf pid
    (config-router)#

En OSPFv3

    (config)# ipv6 router ospf pid
    (config-rtr)#

Mais avant cela, nous devons activer le routage IPv6

    (config)# ipv6 unicast-routing

Nous gardons évidemment le PID en OSPFv2 et v3

## router-id

En OSPFv2, ce sera l'adresse IP des loopback la plus élevée qui fera le
rôle de router-id, sans cela, l'adresse IP des interfaces

    (config-router)# router-id A.B.C.D

En OSPFv3, le comportement est le même

    (router-rtr)# router-id A.B.C.D

**Pour rappel, le router-id est le premier paramètre devant être
configuré, sans cela, nous sommes obliger de reload le processus**

    clear ipv6 ospf process // OSPFv3
    clear ip ospf process // OSPFv2

## Passive interface

Pour rappel, une interface dites *passive* est une interface qui n'est
pas destinée à recevoir des messages OSPF (Typiquement, lorsqu'il y a
un PC derrière)

Pour éviter de compromettre la sécurité de notre réseau, nous
*passivons* l'interface afin que celle-ci ne recoive plus aucun
message.

Le procédé est le même en OSPFv2/OSPFv3 (Seul le prompt changera)

    (config-router)# passive-interface e0/0
    (config-rtr)# passive-interface e0/0

## Activation de l'OSPF

Une fois l'OSPF correctement configuré, il faut maintenant
'"l'activer'" (C'est à dire, lui dire quels réseaux annoncer)

Pour se faire, il existe 2 manières en OSPFv2 mais **une seule** en
OSPFv3

Commencons par la manière unique à OSPFv2 :

    network 192.168.80.0 255.255.255.0 area 0

Dans cette ligne, nous annonçons le réseau 192.168.80.0/24 en OSPF dans
la zone 0

**Originellement, nous devons mettre le wildcard mask en OSPF, mais la
grande majorité des IOS peuvent convertir masque '"normal'" en wildcard
mask**

La seconde méthode, utilisable en OSPFv2 et indispensable en OSPFv3 et
de se placer directement sur l'interface. Via cette méthode, il n'y a
aucune erreur possible.

    (config)# interface e0/1
    (config-if)# ip ospf pid area area-id // OSPFv2
    (config-if)# ipv6 ospf pid area area-id // OSPFv3
