# Générer une clé SSH au format RFC 4716

Dans certains cas, il peut-être utile de vouloir générer un format de
clé public en format RFC 4716.

Par exemple, OpenMediaVault n'accepte que ce type de clé.

Voici donc la commande à faire :

```bash
ssh-keygen -e -f privkey
```

Attention à bien mettre la privkey en chmod 400

Il est également possible de faire la même commande pour la clé publique

```bash
ssh-keygen -e -f pubkey
```
