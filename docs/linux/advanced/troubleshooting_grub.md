---
description: Récupération GRUB depuis un live CD - procédure chroot, variantes BIOS et UEFI, gestion LVM, erreurs courantes et checklist.
tags:
  - GRUB
  - Recovery
  - Troubleshooting
tested_with:
  - "GRUB 2.06+"
---

# Troubleshooting GRUB

Les commandes `update-grub` et `grub-install` sont celles de Debian/Ubuntu. Sur RHEL et dérivés, on utilise `grub2-mkconfig -o /boot/grub2/grub.cfg` et `grub2-install`.

---

## Diagnostiquer depuis un système qui boote

On vérifie d'abord dans quel mode la machine a booté, tout le reste en dépend :

```bash
[ -d /sys/firmware/efi ] && echo UEFI || echo BIOS
```

`grub-install` n'a pas de mode « dry-run ». En BIOS, on vérifie que le MBR contient bien GRUB (`boot.img` porte la chaîne `GRUB`). En UEFI, on regarde les entrées de boot :

```bash
# BIOS : GRUB est-il dans le MBR de ce disque ?
dd if=/dev/sda bs=512 count=1 2>/dev/null | grep -a -c GRUB

# UEFI : entrées de boot et fichier .efi pointé
efibootmgr -v
```

`grub-mkconfig` sans `-o` affiche la config générée sans rien écrire, pratique avant un `update-grub` :

```bash
grub-mkconfig | grep -E "menuentry|linux|initrd"
```

---

## Récupérer un système qui ne boote plus

<div class="steps" markdown>

### Booter sur un live CD / USB

Utiliser une ISO Ubuntu, Debian, ou un rescue disk. Pour un système UEFI, le live doit booter **en mode UEFI** (pas en legacy/CSM), sinon `grub-install` ne peut pas écrire l'entrée de boot dans la NVRAM.

### Identifier les partitions

```bash
lsblk -o NAME,SIZE,FSTYPE,PARTTYPENAME,MOUNTPOINT
```

Les 2 layouts typiques :

- BIOS/MBR : `/dev/sda1` en `/boot` (optionnel), `/dev/sda2` en `/`
- UEFI/GPT : `/dev/sda1` en partition EFI (vfat, type « EFI System »), `/dev/sda2` en `/`, parfois un `/boot` séparé en plus

### Monter le système cible

```bash
# Système simple (sans LVM)
mount /dev/sda2 /mnt
mount /dev/sda1 /mnt/boot          # BIOS, si /boot séparé
mount /dev/sda1 /mnt/boot/efi      # UEFI : la partition EFI

# Avec LVM
vgchange -ay                        # activer tous les VG
lvs                                 # identifier les volumes logiques
mount /dev/vg0/root /mnt
```

### Monter les pseudo-filesystems (obligatoire)

`--rbind` sur `/sys` embarque aussi `/sys/firmware/efi/efivars`. Avec un simple `--bind`, il manque dans le chroot et `grub-install` échoue en UEFI sur `EFI variables are not supported on this system` :

```bash
mount --rbind /dev  /mnt/dev
mount --bind  /proc /mnt/proc
mount --rbind /sys  /mnt/sys
mount --bind  /run  /mnt/run
```

### Chroot et réinstaller GRUB

```bash
chroot /mnt /bin/bash

# Système BIOS/MBR : sur le disque, pas sur une partition
grub-install /dev/sda
update-grub

# Système UEFI : la partition EFI est déjà montée sur /boot/efi
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=grub
update-grub
```

Si la NVRAM reste inaccessible (live booté en BIOS, firmware capricieux), on ajoute `--removable` : GRUB s'installe dans `EFI/BOOT/BOOTX64.EFI`, le chemin que le firmware essaie par défaut, sans entrée NVRAM. `--no-nvram` installe au chemin normal sans toucher la NVRAM.

</div>

---

## Problèmes courants

### `update-grub` ne détecte pas les autres OS

Depuis GRUB 2.06, os-prober est désactivé par défaut (`GRUB_DISABLE_OS_PROBER` vaut `true` si absent). On l'active explicitement :

```bash
apt install os-prober
echo 'GRUB_DISABLE_OS_PROBER=false' >> /etc/default/grub
update-grub
```

### `update-grub` échoue ou génère une config bancale

Pas besoin d'éditer `grub-mkconfig` : il affiche déjà les erreurs de ses scripts. Pour voir quel script de `/etc/grub.d/` plante, on trace l'exécution :

```bash
bash -x /usr/sbin/grub-mkconfig -o /boot/grub/grub.cfg 2>&1 | tail -40
```

### Erreur `cannot find a GRUB drive for /dev/sdX`, ou disques réordonnés

`device.map` n'est quasiment plus utilisé : `grub.cfg` retrouve les partitions par UUID (`search --fs-uuid`). S'il traîne une vieille version, `--recheck` le supprime avant l'installation et GRUB le régénère :

```bash
grub-install --recheck /dev/sda
update-grub
```

### GRUB prompt au démarrage (mode rescue)

Au prompt `grub rescue>`, seuls quelques modules sont chargés et le `prefix` pointe au mauvais endroit (c'est souvent pour ça qu'on y est). Les partitions s'appellent `(hd0,msdos1)` en MBR, `(hd0,gpt1)` en GPT, `(hd0,1)` marche pour les 2. On cherche celle qui contient `/boot/grub` :

```grub
ls
ls (hd0,2)/boot/grub
```

Puis on corrige `root` **et** `prefix`, sinon `insmod normal` ne trouve pas le module :

```grub
set root=(hd0,2)
set prefix=(hd0,2)/boot/grub
insmod normal
normal
```

Avec un `/boot` séparé, le chemin perd son `/boot` : `set prefix=(hd0,1)/grub`. Une fois dans le système, réinstaller GRUB proprement.

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
    --bootloader-id=grub
```

!!! tip "Secure Boot"
    Avec Secure Boot actif, un GRUB non signé ne boote pas. Sur Debian/Ubuntu, on installe `shim-signed` et `grub-efi-amd64-signed` avant `grub-install`, qui pose alors le shim signé. Sinon on désactive temporairement Secure Boot dans le firmware le temps de la récupération.

---

## Checklist de récupération

```text
[ ] Boot sur live CD/USB, en UEFI si le système est UEFI
[ ] lsblk → identifier root, boot, EFI
[ ] LVM ? → vgchange -ay avant de monter
[ ] mount root (+ /boot, + /boot/efi) puis rbind dev/sys, bind proc/run
[ ] chroot
[ ] grub-install sur le bon device (disque en BIOS, --efi-directory en UEFI)
[ ] update-grub → vérifier qu'il détecte le bon kernel
[ ] exit + reboot
```
