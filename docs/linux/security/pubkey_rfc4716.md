---
description: Exporter une clé publique SSH au format RFC 4716 pour la compatibilité avec certains systèmes
tags:
  - SSH
  - PKI
---

# Générer une clé SSH au format RFC 4716

Dans certains cas, il peut être utile de vouloir générer un format de
clé publique en format RFC 4716.

Par exemple, OpenMediaVault n'acceptait que ce format avant la 5.6. Depuis, il prend aussi une clé au format OpenSSH et la convertit tout seul en RFC 4716.

`-e` exporte au format RFC 4716 par défaut, `-m RFC4716` le rend juste explicite. On passe la clé publique :

```bash
ssh-keygen -e -m RFC4716 -f key.pub
```

Ça marche aussi en pointant la clé privée : `ssh-keygen` prend le `.pub` à côté s'il existe, sinon il lit la partie publique stockée en clair dans une clé privée au format OpenSSH (celui de `-----BEGIN OPENSSH PRIVATE KEY-----`), sans demander la passphrase et sans exiger de `chmod` particulier.

```bash
ssh-keygen -e -f privkey
```
