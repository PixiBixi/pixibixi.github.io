---
description: Astuces Bash pour l'historique, les variables d'environnement et les optimisations du shell interactif
tags:
  - Bash
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
HISTFILE=~/.bash_history
```

Permet de définir le fichier où est stocké l'historique (`~/.bash_history` est déjà la valeur par défaut). Pas d'espace autour du `=`, sinon bash cherche une commande `HISTFILE`.

------------------------------------------------------------------------

```bash
HISTIGNORE="ls:ls *:man *:history:clear:GCP_KEY*"
```

Nous permet de ne pas logger toutes les commandes, ici, nous ignorons clear, tous les ls, tous les man et les lignes qui commencent par `GCP_KEY`. Chaque motif doit matcher la ligne entière depuis le début : `ls *` ne couvre pas un `ls` seul (d'où le `ls` à part), et un `export GCP_KEY=...` reste dans l'historique.

## Divers

```bash
fc
```

Nous permet d'ouvrir la dernière commande dans notre éditeur (`$FCEDIT`, sinon `$EDITOR`, sinon `vi`) et de l'éditer plus facilement, puis de la réexécuter dans la foulée

------------------------------------------------------------------------

```bash
sleep $(( RANDOM % 10 + 1 ))
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

Comme dit dans le commentaire, permet de déconnecter automatiquement un user après X secondes, à mettre dans le .bashrc ou autre prompt
