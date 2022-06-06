# Cisco : Routage Inter-VLAN 
 
Une fois les VLAN fait, ceux-ci sont isolés logiquement, et ne peuvent 
donc communiquer entrent-eux. 
 
Nous devons donc agir au niveau du routeur pour faire en sorte qu'ils 
puissent communiquer entrent eux 
 
### Exemple concret 
 
On dispose dun Switch (**24 ports FastEthernet**, **2 ports Gigabits**) 
et dun routeur (**1 port Gigabit, 1 port série**). On souhaite 
attribuer le **VLAN3**' 
aux interfaces Fa0/6 à Fa0/12 
 
**Réseau VLAN3 :** 192.168.0.0/24' 
**IP Switch GA0/0 :** 192.168.0.1 
 
**IP Routeur GA0/1.3 :** 192.168.0.254 
 
### Application côté routeur 
 
Pour cela, nous allons donc devoir faire des sous-interfaces sur 
l'interface **GA0/1** du **routeur** 
 
Une sous interface est une interface logique sur un routeur, nous la 
reconnaissons car elle comporte un **.** (Exemple **GA0/1.3**'...) 
 
Généralement, la sous-interface correspond au numéro du VLAN. 
 
Il faut également faire une sous-interface par VLAN. 
 
    Router(config)#interface Ga0/1.3 
    Router(config-subif)#encapsulation dot1Q 3 
    Router(config-subif)#ip address 192.168.0.254 255.255.255.0  
    Router(config-subif)#no shutdown 
    Router(config-subif)#exit 
 
Ici, nous voyons que nous avons activer l'encapsulation **Dot1Q** avec 
le **VLAN 3** afin de taguer les trames en provenance du Routeur et de 
les encapsuler au format **802.1Q** 
 
Il est également indispensable d'attribuer une adresse IP à la 
sous-interface car celle-ci correspondra à la gateway des machines 
appartenant au **VLAN 3** 
