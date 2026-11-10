---
description: Supprimer complètement les paquets 'rc' en dpkg qui n'ont pas été désinstallés
tags:
  - dpkg
  - Package
---

# Enlever les paquets « rc » sur dpkg

Les paquets en « rc » sur dpkg sont juste des paquets qui n'ont pas été
enlevés à 100%

Généralement, il reste des fichiers de configuration

Pour les enlever à 100%, voici la commande à exécuter (`dpkg --purge` demande les droits root) :

```bash
dpkg-query -W -f='${db:Status-Abbrev} ${Package}\n' | awk '$1 == "rc" {print $2}' | xargs -r sudo dpkg --purge
```

Via cette commande, on demande à `dpkg-query` le statut abrégé et le nom de chaque paquet, on garde uniquement ceux en « rc », puis on fait un `dpkg --purge` dessus. Le `-r` de `xargs` évite de lancer `dpkg --purge` sans argument quand il n'y a rien à purger.

On évite de parser `dpkg --list` avec `cut` : sa sortie est faite pour être lue par un humain, et le man de `dpkg-query` prévient que son format varie avec la largeur du terminal.

Avec un apt récent, les patterns font la même chose en une commande (`~c` sélectionne les paquets dont il ne reste que la configuration) :

```bash
sudo apt purge '~c'
```

`apt autoremove --purge` ne suffit pas : il purge les dépendances qu'il retire, mais laisse les paquets déjà en « rc ».
