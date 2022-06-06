# Installer un serveur DHCP sur un routeur Cisco 
 
Il peut être utile dans certains cas d'installer un serveur DHCP sur un 
routeur, voici donc les commandes 
 
    Router#conf t 
    Router(config)#ip dhcp pool CLIENT_LAN 
    Router(dhcp-config)#network 192.168.0.0 255.255.255.0 
    Router(dhcp-config)#dns-server 8.8.8.8 
    Router(dhcp-config)#default-router 192.168.0.1 
 
Dans ces lignes de commande, nous définissons le pool nommé CLIENT_LAN, 
avec comme pool 192.168.0.0/24, ayant comme DNS 8.8.8.8 et comme 
passerelle par défaut 192.168.0.1 
 
Il est possible d'exclure des IPs du pool DHCP 
 
    Router(dhcp-config)#exit 
    Router(config)#ip dhcp excluded-address 192.168.0.240 192.168.0.250 
 
Attention, cette commande n'est pas à faire dans le mode DHCP Config 
