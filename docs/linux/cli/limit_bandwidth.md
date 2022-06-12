# Simuler des conditions réseau sur Linux

Il peut être intéressant de limiter sa bande passante pour simuler
certaines bande passante ou autre, ou tout simplement pour brider un
processus.

## Méthode barbare

La méthode barbare consiste à tout simplement jouer avec les iproute
directement avec la commande **tc**.

**tc** va nous permettre d'ajouter de la latence artificielle, limiter
le débit'...

D'autres options sont disponibles, mais ne sont que très peu utile
(packet re-ordering, duplication'...)

### Ajout de latence

``` bash
$ tc qdisc add dev eth0 root netem delay 200ms
```

Via cette commande, nous ajoutons sur l'interface **eth0** 200ms de
latence via le network emulator (netem). Une commande plus précise
existe afin de simuler un comportement plus réel d'une connexion
domestique basique

``` bash
$ tc qdisc change dev eth0 root netem delay 100ms 10ms 25%
```

Les arguments supplémentaires de cette commande impliquent un delta de
10ms selon 25% du ping-1

### Perte de paquet

En 4G, il n'est pas rare d'avoir une connexion instable avec perte de
paquets, voici donc comment le simuler :

``` bash
tc qdisc change dev eth0 root netem loss 2%
```

2% de loss seront appliqués sur tous vos paquets, soit 2 paquets sur 100
(en flat)

``` bash
tc qdisc change dev eth0 root netem loss 2% 33%
```

Toujours 2% de pertes, mais correlés avec les 33% des derniers paquets.

### Bande passante

Méthode simple. Il est possible de jouer plus finement avec de la QoS.

``` bash
tc qdisc add dev eth0 root tbf rate 10mbit
```

## Méthode simple

Un wrapper a été développé permettant de manipuler (uniquement) la bande
passante simplement :

``` bash
$ apt-get install wondershaper
```

Et la syntaxe est simplement la suivante : wondershaper '[ interface ']
'[ downlink '] '[ uplink ']

Ce qui nous donne par exemple

``` bash
$ wondershaper eth0 1024 1024
```

On bride ici le traffic de eth0 en DL/UL a 1mbps
