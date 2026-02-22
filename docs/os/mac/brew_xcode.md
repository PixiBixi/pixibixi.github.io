---
description: Installer Homebrew sans Xcode en utilisant uniquement les CLI tools pour économiser de l'espace disque
---

# Brew : L'installer sans XCode

Normalement, pour installer brew, nous devons passer par XCode.

XCode est un programme lourd permettant de coder (+/- comme Eclipse),
nous n'en n'avons aucune utilité, et il est fréquent que celui-ci
prenne plus de 10GB sur le MAC (Ce qui est énorme sur 250GB), il existe
donc un trick pour n'installer que les ressources utiles à brew.

```bash
xcode-select --install
```

Quand cette étape sera finit, nous pourrons installer brew sans problème
