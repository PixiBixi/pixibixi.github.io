---
description: Télécharger les sous-titres en ligne de commande avec addic7ed-cli depuis Addic7ed
tags:
  - Subtitles
tested_with:
  - "addic7ed-cli 1.4.6"
  - "Python 3.12"
---

# Télécharger ses sous-titres en ligne de commande

Pour télécharger ses sous-titres en ligne de commande, il existe un
super outil appelé *addic7ed-cli*

Comme son nom l'indique, cet outil va nous permettre de télécharger nos
sous-titres depuis Addic7ed.

Le projet n'a plus bougé depuis 2019 (version 1.4.6), mais il fonctionne encore. C'est un programme Python : sur les distros récentes (Debian 12+, Ubuntu 23.04+), un `pip install` hors venv est refusé (`externally-managed-environment`), on passe par *pipx*. L'outil importe encore `pkg_resources`, absent des venv Python 3.12+ : on injecte un setuptools d'avant sa suppression, sinon il plante au lancement avec `No module named 'pkg_resources'`.

```bash
pipx install addic7ed-cli
pipx inject addic7ed-cli "setuptools<81"
```

Pour télécharger un sous-titre, il nous suffit de faire la commande
suivante

```bash
addic7ed -l french -l english The.Serie.S02E23.MDR.mkv
```

Dans cet exemple, nous allons télécharger les subs français et anglais
pour The Serie 223.

Le nommage de l'épisode est important : l'outil déduit la recherche du nom de fichier (nom de la série, puis `S02E23` ou `2x23`, puis la release). Avec un mauvais nommage, le script ne trouvera pas de subs. On peut forcer la recherche avec `addic7ed search -q "the serie 2x23" fichier.mkv`.

Quand plusieurs subs correspondent, l'outil demande lequel prendre. `-b` ne demande rien mais abandonne si la recherche renvoie plusieurs résultats, `-bb` (brute-batch) prend le premier résultat de la recherche : pratique en script.

Addic7ed limite les téléchargements à 15 par 24 h en anonyme, 40 avec un compte (`addic7ed login`).
