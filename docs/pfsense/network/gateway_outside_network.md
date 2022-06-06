# Ajouter une gateway en dehors de son réseau 
 
Il est désormais commun d'avoir une gateway en dehors de son réseau 
avec les IP FailOver (Exemple typique avec Online ne fournissant qu'une 
Gateway quelque soit son IP : 62.210.0.1). Cependant, lors de la 
première initialisation de pfSense en ligne de commande, celui-ci refuse 
une gateway en dehors de son réseau. 
 
Si vous n'avez pas d'interface graphique, ne renseignez pas de gateway 
dans un premier temps. 
 
Lorsque vous aurez accès au shell, rentrez les commandes suivantes 
 
``` bash 
route add -net 62.210.0.1/32 -iface vmx0 
route add default 62.210.0.1 
``` 
 
Il faut bien évidemment penser à changer l'adresse et l'interface à 
votre convenance. Une fois ceci fait, tapez **pfctl -d** pour désactiver 
le pare-feu temporairement. 
 
Une fois ceci fait, nous passons sur l'interface graphique : **System / 
Routing / Gateways / '[+ Add']** 
 
Il y a un bouton **'"Display Advanced'"** en bas de la page et vers la 
fin de ces options, nous avons **'"Use non-local gateway'"** à cocher 
