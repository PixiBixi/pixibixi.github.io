# Troubleshooting GRUB

---

## Diagnostiquer depuis un système qui boote

```bash
# Vérifier que GRUB est installé sur le bon disque
grub-install --dry-run /dev/sda

# Régénérer le fichier de config
update-grub

# Vérifier la config générée
cat /boot/grub/grub.cfg | grep -E "menuentry|linux|initrd"
```

---

## Récupérer un système qui ne boote plus

### 1. Booter sur un live CD / USB

Utiliser une ISO Ubuntu, Debian, ou un rescue disk.

### 2. Identifier les partitions

```bash
lsblk
fdisk -l

# Identifier la partition root et la partition boot
# Exemple typique :
# /dev/sda1 → /boot (ou /boot/efi pour UEFI)
# /dev/sda2 → /
```

### 3. Monter le système cible

```bash
# Système simple (sans LVM)
mount /dev/sda2 /mnt
mount /dev/sda1 /mnt/boot          # si /boot séparé

# Avec LVM
lvdisplay                           # identifier les volumes logiques
vgchange -ay                        # activer tous les VG
mount /dev/vg0/root /mnt
mount /dev/sda1 /mnt/boot
```

### 4. Monter les pseudo-filesystems (obligatoire)

```bash
mount --bind /dev  /mnt/dev
mount --bind /proc /mnt/proc
mount --bind /sys  /mnt/sys

# Si LVM ou systemd en chroot : monter /run aussi
mount --bind /run  /mnt/run
```

### 5. Chroot et réinstaller GRUB

```bash
chroot /mnt /bin/bash

# Système BIOS/MBR
grub-install /dev/sda
update-grub

# Système UEFI
# Monter la partition EFI d'abord
mount /dev/sda1 /boot/efi
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=grub
update-grub
```

---

## Problèmes courants

### `update-grub` ne détecte pas les OS

```bash
# Vérifier que os-prober est installé et activé
apt install os-prober
grep GRUB_DISABLE_OS_PROBER /etc/default/grub
# Si = true, passer à false puis update-grub
```

### `update-grub` échoue silencieusement

Le script `grub-mkconfig` redirige certaines erreurs vers `/dev/null`.
Pour voir les vraies erreurs :

```bash
# Éditer temporairement le script
vi /usr/sbin/grub-mkconfig
# Retirer les redirections >/dev/null 2>&1 sur les lignes suspectes

# Ou lancer directement
grub-mkconfig -o /boot/grub/grub.cfg
```

### Erreur `cannot find a GRUB drive for /dev/sdX`

```bash
# Le device.map est obsolète ou absent
grub-install --recheck /dev/sda

# Regénérer manuellement
ls /boot/grub/device.map
grub-mkdevicemap
```

### GRUB prompt au démarrage (mode rescue)

Depuis le prompt GRUB :

```grub
# Lister les partitions détectées
ls

# Identifier la partition contenant /boot/grub
ls (hd0,1)/boot/grub

# Charger manuellement le module et le config
set root=(hd0,1)
insmod normal
normal
```

Une fois dans le système, réinstaller GRUB proprement.

### Mauvais ordre des disques après ajout/retrait

```bash
# Vérifier l'ordre des disques vu par GRUB
cat /boot/grub/device.map

# Forcer la régénération
grub-install --recheck /dev/sda
update-grub
```

---

## UEFI : cas spécifiques

```bash
# Lister les entrées de boot EFI
efibootmgr -v

# Supprimer une entrée corrompue (ex: Boot0002)
efibootmgr -b 0002 -B

# Recréer l'entrée GRUB
grub-install --target=x86_64-efi \
    --efi-directory=/boot/efi \
    --bootloader-id=grub \
    --recheck
```

!!! tip "Secure Boot"
    Si Secure Boot est activé, `grub-install` peut échouer.
    Désactiver temporairement dans le BIOS/UEFI pour la récupération,
    ou utiliser un shim signé (`shim-signed` + `grub-efi-amd64-signed`).

---

## Checklist de récupération

```text
[ ] Boot sur live CD/USB
[ ] lsblk → identifier root, boot, EFI
[ ] LVM ? → vgchange -ay avant de monter
[ ] mount root + bind dev/proc/sys/run
[ ] chroot
[ ] grub-install sur le bon device
[ ] update-grub → vérifier qu'il détecte le bon kernel
[ ] exit + reboot
```
