# Troubleshooting Grub

GRUB c'est chiant. Voici quelques pistes à vérifier pour son GRUB.

  * Est-il installer ? grub-install
  * Est-il configurer ? update-grub

Si l'update grub ne fonctionne pas, il faut enlever les 2'>/dev/null du
script `grub-mkconfig` (foutu dev). Si vous avez LVM, il faut
également monter le /run dans votre chroot.
