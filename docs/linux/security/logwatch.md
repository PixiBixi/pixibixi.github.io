# Installer et configurer LogWatch 
 
Logwatch est un petit utilitaire qui permet d'envoyer un rapport sur 
diverses informations tel que les tentatives d'accès infructueuses, 
erreurs kernel'... Etant donner qu'il envoie les rapports par mail, il 
sera nécessaire d'installer un MTA 
 
Simple installation via APT : 
 
``` bash 
$ apt install logwatch 
``` 
 
Par défaut, sans configuration, logwatch va analyser les logiciels 
installés sur la machine pour générer son rapport. Pour mon cas par 
exemple, il contient les drop d'iptables et diverses informations sur 
apache2. 
 
Logwatch va par défaut génerer un rapport par jour, envoyé sur 
l'utilisateur root. 
 
Il est possible de modifier le comportement en modifiant 
**/etc/logwatch/conf/logwatch.conf**. Il n'est pas recommandé 
d'overwrite les valeurs par défaut fourni dans 
**/usr/share/logwatch/default.conf/logwatch.conf** 
 
``` bash 
echo "MailTo=bla@bla.fr" > /etc/logwatch/conf/logwatch.conf 
``` 
 
On peut également forcer la destination avec l'argument **'--mailto**. 
 
Vous pouvez customiser le rapport en copiant les différents fichiers de 
configuration fournis par défaut par logwatch depuis 
/usr/share/logwatch/default.conf dans les différents répertoires 
adéquates /etc/logwatch/conf 
