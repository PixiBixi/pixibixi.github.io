---
description: Récupérer les options de compilation du kernel depuis /proc/config.gz ou /boot
tags:
  - Kernel
---

# Trouver les options de compilation du kernel

## Via /proc/config.gz

Disponible uniquement si le kernel a été compilé avec `CONFIG_IKCONFIG` et `CONFIG_IKCONFIG_PROC`. `CONFIG_IKCONFIG` peut être compilé en module (`=m`) : dans ce cas `/proc/config.gz` n'apparaît qu'après un `modprobe configs`.

On vérifie les deux options :

```bash
zcat /proc/config.gz | grep CONFIG_IKCONFIG
```

Pour chercher une option spécifique :

```bash
zcat /proc/config.gz | grep CONFIG_BPF
```

## Via /boot

Si `/proc/config.gz` n'existe pas, le fichier de config est dans `/boot` :

```bash
cat /boot/config-$(uname -r) | grep CONFIG_BPF
```

Pour lister toutes les options activées (=y ou =m) :

```bash
grep -E "=y|=m" /boot/config-$(uname -r)
```

## Depuis l'image du kernel

Si ni `/proc/config.gz` ni `/boot/config-*` n'existent mais que le kernel a été compilé avec `CONFIG_IKCONFIG`, la config est embarquée dans l'image : le script `scripts/extract-ikconfig` des sources du kernel la ressort :

```bash
./scripts/extract-ikconfig /boot/vmlinuz-$(uname -r) | grep CONFIG_BPF
```
