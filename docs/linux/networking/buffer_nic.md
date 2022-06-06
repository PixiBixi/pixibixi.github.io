# Augmenter le buffer de sa carte réseau 
 
Dans certains cas spécifiques, augmenter le buffer de sa carte réseau 
peut être bénéfique pour votre serveur. Quoi qu'il en soit, il n'y a 
aucune raison de ne pas le pousser au maximum. 
 
## Augmenter ses buffers 
 
Pour augmenter ses buffers, on utilise le merveuilleux outil disponible 
partout, ethtool. On observe dans un premier temps les buffers 
disponibles et ceux qu'on a déjà appliqués. 
 
``` bash 
[vps ~]$ ethtool -g eno1 
Ring parameters for eno1: 
Pre-set maximums: 
RX:             4096 
RX Mini:        0 
RX Jumbo:       0 
TX:             4096 
Current hardware settings: 
RX:             512 
RX Mini:        0 
RX Jumbo:       0 
TX:             512 
``` 
 
On voit ici que nos buffers sont 8x inférieurs à ceux qu'on peut 
potentiellement mettre. Voici comment les appliquer 
 
``` bash 
[vps ~]$ ethtool -G eno1 rx 4096 tx 4096 
``` 
 
### De façon permanente 
 
Malheureusement, ethtool n'agit pas de manière permanente, voici une 
des manières pour rendre permanente le fix 
 
``` bash 
echo "ACTION=="add|change", SUBSYSTEM=="net", KERNEL=="eth*|en*", RUN+="/sbin/ethtool -G $name rx 4096 tx 4096" 
" >> /etc/udev/rules.d/59-net.ring.rules 
``` 
 
Plus d'informations 
[ici](https://fasterdata.es.net/host-tuning/linux/nic-tuning/) 
