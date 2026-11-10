---
description: Installer plusieurs logiciels en une seule fois avec Ninite - automatiser le setup d'un poste Windows
tags:
  - Windows
---

# Installer tous les logiciels de base via un simple installateur

Ninite est un site formidable. Via une interface web simple, nous
pouvons installer tous les programmes du quotidien.

Pas de blabla inutile, si vous voulez découvrir ninite, c'est
[ici](https://ninite.com/) que ça se passe

Pour un truc scriptable, winget (fourni avec Windows 11) fait la même chose en ligne de commande. On exporte la liste des logiciels d'un poste déjà installé, puis on la rejoue sur le nouveau :

```powershell
winget export -o apps.json
winget import -i apps.json
```
