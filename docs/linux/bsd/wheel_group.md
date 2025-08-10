# Ajouter un utilisateur au groupe wheel

![BSD Logo](/linux_bsd/bsd-logo-full.png)

Sous BSD, notre utilisateur créé lors de l'installation ne peut pas
faire la commande '"su'" par défaut. Nous devons l'ajouter au groupe
*wheel*. Il s'agit d'une différence minuscule mais qui a une grande
importance.

```bash
pw groupmod wheel -m username
```

Avec cette commande, vous pourriez effectuer la commande '"su'" comme de
base sous GNU/Linux
