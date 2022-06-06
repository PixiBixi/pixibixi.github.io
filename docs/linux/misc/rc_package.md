# Enlever les paquets '"rc'" sur dpkg 
 
Les paquets en '"rc'" sur dpkg sont juste des paquets qui n'ont pas été 
enlevés à 100% 
 
Généralement, il reste des fichiers de configuration 
 
Pour les enlever à 100%, voici la commande à exécuter 
 
``` bash 
$ dpkg --list |grep "^rc" | cut -d " " -f 3 | xargs dpkg --purge 
``` 
 
Via cette commande, nous choisissons uniquement les paquets commençant 
par '"rc'", puis nous prenons leur nom, et enfin, pour chacune des 
lignes, nous faisons un *dpkg '--purge* 
