---
description: Astuces Bash pour l'historique, les variables d'environnement et les optimisations du shell interactif
---

# Astuces bash

## Historique bash

```bash
HISTSIZE=1000
```

Nous permet de définir un historique de 1000 commandes (au lieu de 500
par défaut)

------------------------------------------------------------------------

```bash
HISTFILE = ~/.bash_history
```

Permet de définir un fichier où seront stockées l'historique

------------------------------------------------------------------------

```bash
HISTIGNORE="ls *:man *:history:clear:GCP_KEY*"
```

Nous permet de ne pas logger toutes les commandes, ici, nous ignorons
clear, tous les ls, tous les man, et notre clé GCP.

## Divers

```bash
fc
```

Nous permet d'ouvrir la dernière commande dans notre éditeur par défaut
et de l'éditer plus facilement, puis de la réexécuter dans la foulée

------------------------------------------------------------------------

```bash
sleep $[ ( $RANDOM % 10 )  + 1 ]s
```

Introduit un random entre 1 et 10s

------------------------------------------------------------------------

```bash
# Disconnect the session after 30 minutes of idle
if [ -z "$TMOUT" ] ; then
    TMOUT=1800
    [ -z "$TMUX" ] || TMOUT=345600
fi
```

Comme dis dans le commentaire, permet de deconnecteur automatiquement un user après X secondes, à mettre dans le .bashrc ou autre prompt
