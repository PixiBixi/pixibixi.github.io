# Télécharger ses sous-titres en ligne de commande 
 
Pour télécharger ses sous-titres en ligne de commande, il existe un 
super outil appelé *addic7ed-cli* 
 
Comme son nom l'indique, cet outil va nous permettre de télécharger nos 
sous-titres depuis Addic7ed. 
 
Pour l'installer, étant donner qu'il s'agit ici un programme écrit en 
Python, nous allons utiliser le gestionnaire de paquet *pip*. 
 
``` bash 
$ pip install addic7ed-cli 
``` 
 
Pour télécharger un sous-titre, il nous suffit de faire la commande 
suivante 
 
``` bash 
$ addic7ed -l french -l english The.Serie.S02E23.MDR.mkv 
``` 
 
Dans cet exemple, nous allons télécharger les subs français et anglais 
pour The Serie 223. 
 
Le nommage de l'épisode est important. Avec un mauvais nommage, le 
script ne trouvera pas de subs. 
