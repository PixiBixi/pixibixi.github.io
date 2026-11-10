---
description: Installer Homebrew sans Xcode en utilisant uniquement les CLI tools pour économiser de l'espace disque
tags:
  - Homebrew
  - Xcode
  - macOS
---

# Brew : L'installer sans Xcode

On croit souvent qu'il faut Xcode pour installer brew. En réalité, Homebrew n'a besoin que des Command Line Tools (CLT) for Xcode, et seulement pour compiler des formules depuis les sources ou, sur Intel, pour installer les bottles.

Xcode est un programme lourd permettant de coder (+/- comme Eclipse),
nous n'en n'avons aucune utilité et il est fréquent que celui-ci
prenne plus de 10GB sur le MAC (Ce qui est énorme sur 250GB), il existe
donc un trick pour n'installer que les ressources utiles à brew.

```bash
xcode-select --install
```

Le script d'installation de Homebrew propose d'ailleurs lui-même d'installer les CLT s'ils manquent. Une fois cette étape finie, on lance l'installeur officiel :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Sur Apple Silicon, il reste à ajouter `/opt/homebrew/bin` au `PATH`, voir [Homebrew sur macOS](brew.md#letape-que-le-script-ne-fait-pas-pour-vous).
