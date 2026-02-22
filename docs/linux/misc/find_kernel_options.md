---
description: Récupérer les options de compilation du kernel depuis /proc/config.gz ou /boot
---

# Trouver les options de compilation du kernel

Il est possible de trouver les options de compilation de notre kernel en
observant le fichier **/proc/config.gz**

Cependant, celui-ci n'est disponible uniquement si le kernel a été
compilé avec les options CONFIG_IKCONFIG et CONFIG_IKCONFIG_PROC

Si ce fichier n'est pas disponible, les options de compilation seront
disponibles dans **/boot**
