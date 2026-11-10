---
description: Ajouter un utilisateur au groupe wheel sous FreeBSD ou OpenBSD pour accès à la commande su
tags:
  - BSD
  - sudo
---

# Ajouter un utilisateur au groupe wheel

Sous BSD, notre utilisateur créé lors de l'installation ne peut pas
faire la commande « su » par défaut. Nous devons l'ajouter au groupe
*wheel*. Il s'agit d'une différence minuscule mais qui a une grande
importance.

Sous FreeBSD, on passe par `pw` (`-m` ajoute le membre sans écraser la liste existante, contrairement à `-M`) :

```bash
pw groupmod wheel -m username
```

`pw` n'existe que sous FreeBSD. Sous OpenBSD, c'est `usermod -G` qui ajoute l'utilisateur au groupe :

```bash
usermod -G wheel username
```

Avec cette commande, on peut effectuer la commande « su » comme de base sous GNU/Linux
