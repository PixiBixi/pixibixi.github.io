---
description: Récupérer les options de compilation du kernel depuis /proc/config.gz ou /boot
tags:
  - Kernel
---

# Trouver les options de compilation du kernel

## Via /proc/config.gz

Disponible uniquement si le kernel a été compilé avec `CONFIG_IKCONFIG` et `CONFIG_IKCONFIG_PROC` :

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
