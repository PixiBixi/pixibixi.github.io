# Tester la bande passante effective de son serveur avec des '"proofs files'" 
 
## Préambule 
 
Ce wiki va nous aider à déterminer la bande passante réelle de son 
serveur. Evidemment, plusieurs critères rentrent en jeu, tel que la 
location physique de son serveur, sa bandwidth théorie/garantie, son 
peering'... 
 
Par exemple, si l'on a un serveur Gbps chez Online, et que l'on 
effectue un test sur un serveur appartenant à Online, le test ne 
reflétera pas le débit réel, étant donner qu'on dispose généralement 
d'une bande passante importante. 
 
Si le réseau internet est surchargé au moment ou vous effectuez le test, 
il est possible que le résultat soit en dessous de la réalité. 
 
## Qu'est ce qu'un proof file ? 
 
Un *proof file* est un fichier stocké sur un serveur disposant d'une 
importante bande passante (Généralement du Gbps vroi 10Gbps) afin 
d'effectuer des tests de vitesse avec différents hébergeur. Il existe 
des fichier de différente taille selon les différents hébergeurs (1Go, 
2.5Go'...) Cela permet de refléter le débit réel d'un réseau avec un 
autre réseau, et donc de tester son peering 
 
## Liste des proofs files disponibles 
 
  **Provider**   **Lien** 
  -------------- ------------------------------------------------------------------------------- 
  I3D            [Ici](https://customer.i3d.net/mirror/) 
  Tele2          [Ìci](http://speedtest.tele2.net/) 
  Vultr          [Ici](https://vultrcoupons.com/test-vultr-download-speed-from-your-location/) 
  Free           [Ici](http://test-debit.free.fr/) 
  Linode         [Ici](https://www.linode.com/speedtest) 
  Feral          [Ici](https://www.feral.io/test.bin) 
  Myloc          [Ici](http://speed.myloc.de/) 
  LeaseWeb       [Ici](http://mirror.leaseweb.com/speedtest/) 
  OVH            [Ici](http://proof.ovh.net/) 
  Online (AMS)   [Ici](http://ping-ams1.online.net/) 
  Online         [Ici](http://ping.online.net/) 
  Test Debit     [Ici](https://testdebit.info/) 
  X4B            [Ici](http://lg.x4b.net/) 
  Serverius      [Ici](http://speedtest.serverius.net/) 
  Hetzner        [ici](https://speed.hetzner.de/) 
  Belwue         [ici](http://speedtest.belwue.net/) 
  LG             [ici](http://lg.core-backbone.com) 
 
Durant les cours intéréssants, j'ai finis par développer (Ou plutôt 
fork) un script permettant de lancer des DLs à partir d'une multitude 
de location, le script est disponible sur Dropbox. 
 
Voici le rendu du script : 
 
![](/lbw9ftu.jpg){.align-center} 
 
## Iperf, kezako ? 
 
iperf est un logiciel nécessitant un serveur et un client compatible 
IPv4 et IPv6, se basant sur les protocoles UDP, TCP et SCTP disponible 
sur Windows, Linux, et même Android et iOS. 
 
Il s'agit de la solution la plus pure pour tester la vitesse d'un 
réseau car une multitude d'options sont disponibles : taille du paquet, 
connections simultanées, port'.... 
 
Par défaut, le port utilisé par iPerf est le 5001, sur le protocole TCP. 
 
2 options sont toutefois indispensables à l'utilisation de iperf : 
 
-   **-s** pour exécuter iperf en mode **serveur** 
-   **-c** pour exécuter iperf en mode **client** 
 
Voici l'exemple typique de la commande à lancer côté client : 
 
``` bash 
$ iperf -c ping.online.net -i 2 -t 2 -r 
``` 
 
Dans cette commande, nous pouvons voir que nous lancons iperf en mode 
client (-c) sur l'hôte *ping.online.net*, que nous faisons 2 essais (-t 
2), et que nous faisons un test bi-directionnel (-r), quand au (-i 2), 
celui-ci signifie que nous attendons 2 secondes avant de faire le 
prochain test. 
 
Pour plus d'informations, je vous invite à aller consulter [la 
documentation officielle](https://iperf.fr/iperf-doc.php) du logiciel. 
 
Voici le résultat que nous devrions obtenir : 
 
![](/iperf_client.jpg){.align-center} 
 
Nous pouvons clairement apercevoir plusieurs parties sur le screen. 
 
Tout d'abord, le mode de transfert choisi (TCP), le port d'écoute du 
serveur (soit 5001, le port par défaut), ainsi que la '"TCP Window 
Size'" (85KB) 
 
Suivi des informations côté client, qui sont logiquement les mêmes que 
celle serveur, soit TCP, port 5001, et une Window Size +/- identique 
(Ici, 0.3KB de différence, soit un gain négligable) 
 
Et enfin, nous observons enfin les données qui nous sont utiles. Tout 
d'abord, sous l'identifiant '"5'", il s'agit des données qui sont 
envoyées par le serveur, et enfin, sous le champ '"4'", les données qui 
sont réellement reçus par le serveur '"hôte'". 
 
Nous pouvons apercevoir d'une perte de 10mbps, ce qui est plutôt 
faible, mais qui n'est tout de même pas insignifiant. Nous pouvons 
supposer (et c'est quasi une certitude) que des paquets sont perdus en 
route, ce qui peut montrer une qualité plutôt mauvaise du réseau. 
 
A savoir qu'il existe une petite liste officielle de serveurs publics 
disponible sur [le site officiel](https://iperf.fr/iperf-servers.php) de 
l'éditeur du logiciel, à laquelle je rajouterai *iperf.ovh.net* que je 
viens de découvrir en farfouillant sur Internet ou encore 
*iperf.worldstream.nl*. 
