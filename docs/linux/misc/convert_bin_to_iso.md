# Convertir des .bin en .iso 
 
Un .bin est souvent problématique sur Windows. Pour éviter ce problème, 
Linux dispose d'un formidable outil appelé **iat**. 
 
**iat** vous permet de convertir vos .bin, .mdf ou tout autre format 
farfelu en .iso d'une manière extrêmement simpliste 
 
Il faut évidemment commencer par installer iat 
 
``` bash 
$ apt install iat 
``` 
 
Puis nous convertissons simplement notre fichier .bin en .iso 
 
``` bash 
$ iat source.bin source.iso 
``` 
 
Et voilà, après processing de la part de iat, nous nous retrouvons avec 
un .iso prêt à être exploité sur les OS de votre choix. 
