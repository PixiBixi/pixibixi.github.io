# Mémo sur la commande IP 
 
Comme vous le savez certainement, la commande **ifconfig** est 
maintenant depreciated depuis bon nombre de mois/années, pourtant, nous 
avons toujours comme habitue d'utiliser cette commande. 
 
Pourtant, la commande **ip** propose bien plus d'options que son 
ancêtre **ifconfig**, mais les habitudes sont durs à changer. 
 
## Principe de base 
 
``` bash 
$ ip OBJECT COMMAND 
$ ip [options] OBJECT COMMAND 
$ ip OBJECT help 
``` 
 
## Activer/désactiver une interface 
 
Pour **activer** une interface : 
 
``` bash 
$ ip link set wlan0 up 
``` 
 
Pour **désactiver** une interface 
 
``` bash 
$ ip link set wlan0 down 
``` 
 
## Parametrer une adresse IP 
 
``` bash 
$ ip addr add 192.168.1.8/24 dev wlan0 
``` 
 
Afin de vérifier que l'adresse IP a bien été prise en compte 
 
``` bash 
$ ip addr show wlan0 
``` 
 
Et voici l'output que nous devons obtenir : 
 
    3: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000 
        link/ether 00:25:00:3d:e1:aa brd ff:ff:ff:ff:ff:ff 
        inet 192.168.1.8/24 brd 192.168.1.255 scope global wlan0 
        valid_lft forever preferred_lft forever 
 
Si nous souhaitons supprimer une adresse IP, il suffit de remplacer 
**add** par **del** 
 
``` bash 
$ ip addr del 192.168.1.8/24 dev wlan0 
``` 
 
## Route 
 
En plus des simples commandes d'IP, nous pouvons manipuler les routes 
via la commande ip 
 
### Montrer les routes 
 
``` bash 
$ ip route show 
``` 
 
### Ajoute une route 
 
``` bash 
$ ip route add default via 192.168.1.1 
``` 
 
### Supprime une route 
 
``` bash 
$ ip route del default via 192.168.1.1 
``` 
 
## Statistiques 
 
Tout comme **ifconfig**, nous pouvons obtenir les statistiques des 
interfaces 
 
### Toutes interfaces 
 
``` bash 
$ ip -statistics link 
``` 
 
Output : 
 
    1: lo: <LOOPBACK,UP,LOWER_UP> mtu 16436 qdisc noqueue state UNKNOWN mode DEFAULT  
        link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00 
        RX: bytes  packets  errors  dropped overrun mcast    
        439862908634 45470372 0       0       0       0       
        TX: bytes  packets  errors  dropped carrier collsns  
        439862908634 45470372 0       0       0       0       
    2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT qlen 1000 
        link/ether bc:30:5b:df:5a:36 brd ff:ff:ff:ff:ff:ff 
        RX: bytes  packets  errors  dropped overrun mcast    
        151855161674 446514789 0       0       0       47717941 
        TX: bytes  packets  errors  dropped carrier collsns  
        909110766609 783458587 0       0       0       0       
    3: eth1: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc mq state DOWN mode DEFAULT qlen 1000 
        link/ether bc:30:5b:df:5a:37 brd ff:ff:ff:ff:ff:ff 
        RX: bytes  packets  errors  dropped overrun mcast    
        0          0        0       0       0       0       
        TX: bytes  packets  errors  dropped carrier collsns  
        0          0        0       0       0       0       
    4: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UNKNOWN mode DEFAULT qlen 100 
        link/none  
        RX: bytes  packets  errors  dropped overrun mcast    
        2316028442 35517985 0       0       0       0       
        TX: bytes  packets  errors  dropped carrier collsns  
        87027484021 64846840 0       567     0       0       
 
### Interface spécifique 
 
``` bash 
$ ip -statistics link show eth0 
``` 
 
Output 
 
    2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT qlen 1000 
        link/ether bc:30:5b:df:5a:36 brd ff:ff:ff:ff:ff:ff 
        RX: bytes  packets  errors  dropped overrun mcast    
        151856389090 446526528 0       0       0       47722861 
        TX: bytes  packets  errors  dropped carrier collsns  
        909111458731 783462602 0       0       0       0       
 
## ARP 
 
Nous pouvons également observer différents éléments ARP avec la commande 
ip. Pour rappel, ARP fait la correspondance IP '<-'> MAC dans un réseau 
local. 
 
### Ajout Statique 
 
``` bash 
ip neigh add 192.168.0.1 lladdr 00:11:22:33:44:55 nud permanent dev eth0 
``` 
 
### Désactiver la résolution ARP 
 
``` bash 
ip link set dev eth0 arp off 
``` 
