# Résoudre l'erreur '"VM is locked'" 
 
Sous promxox, de ma faible expérience, il est fréquent d'avoir un 
problème de VM locked. Pour cela, 2 moyens 
 
Le premier est de supprimer le fichier de lock à la main : 
 
XXX représente la VM ID 
 
```bash
rm /var/lock/qemu-server/lock-XXX.conf 
``` 
 
Si cela ne marche pas, il existe également une commande en ligne de 
commande 
 
```bash
qm unlock XXX 
``` 
