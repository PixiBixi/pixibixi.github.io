# Réinitialiser son mot de passe root

Pour réinitialiser son mot de passe root, une méthode simple existe.

Lors du GRUB, appuyer sur **E** pour passer en **Edit Mode**

Vous allez voir une ligne commençant par *linux /boot...* et ajouter y
à la fin *init=/bin/bash*. Appuyer sur Ctrl+X pour que vos modifications
soient uniquement appliquées une fois.

Les modifications apportées permettent de booter sur bash en tant que
root sans connaitre le password.

Une fois l'accès au prompt, il faut remonter la partition en RW

```bash
$ mount -rw -o remount /
```

Puis vous pourrez alors changer le password avec l'instruction
**passwd**
