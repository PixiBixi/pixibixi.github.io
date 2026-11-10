---
description: Réinitialiser le mot de passe root via GRUB et init=/bin/bash
tags:
  - Recovery
---

# Réinitialiser son mot de passe root

Pour réinitialiser son mot de passe root, une méthode simple existe. Elle demande un accès console, et ne passe pas si GRUB est protégé par mot de passe. Sur un disque chiffré (LUKS), la passphrase reste demandée au boot.

<div class="steps" markdown>

1. Lors du GRUB, appuyer sur **E** pour passer en **Edit Mode**

2. Vous allez voir une ligne commençant par *linux /boot...* et ajouter y
    à la fin *init=/bin/bash*. Appuyer sur Ctrl+X pour que vos modifications
    soient uniquement appliquées une fois.

    Les modifications apportées permettent de booter sur bash en tant que
    root sans connaitre le password.

3. Une fois l'accès au prompt, il faut remonter la partition en RW

    ```bash
    mount -rw -o remount /
    ```

4. Puis vous pourrez alors changer le password avec l'instruction
    **passwd**

    Sur une distro avec SELinux (RHEL, Fedora, Rocky...), on force un relabel au prochain boot, sinon le nouveau `/etc/shadow` garde un mauvais contexte et le login échoue :

    ```bash
    touch /.autorelabel
    ```

5. systemd ne tourne pas (bash est le PID 1), donc un simple `reboot` répond `System has not been booted with systemd as init system`. On écrit tout sur le disque, puis on redémarre sans passer par l'init, ou on laisse le boot normal reprendre :

    ```bash
    sync
    reboot -f
    # ou : exec /sbin/init
    ```

</div>

Sur RHEL et dérivés, la méthode documentée passe plutôt par `rd.break` à la place de `init=/bin/bash` : on atterrit dans l'initramfs, puis `mount -o remount,rw /sysroot`, `chroot /sysroot`, `passwd`, `touch /.autorelabel` et deux `exit`.
