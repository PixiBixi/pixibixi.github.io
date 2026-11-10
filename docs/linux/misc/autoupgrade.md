---
description: Configurer les mises à jour automatiques avec unattended-upgrades sur Debian
tested_with:
  - "unattended-upgrades 2.9 (Debian 12)"
  - "unattended-upgrades 2.12 (Debian 13)"
tags:
  - apt
  - Automation
---

# Mise à jour automatique de ses paquets

## Introduction

Nous le savons tous, mettre à jour ses paquets est une opération longue
et fastidieuse si nous possédons un nombre important de serveurs.

Il nous arrive régulièrement d'oublier les mises à jour, ce qui laisse
le temps à certains pirates malveillants d'exploiter des failles déjà
corrigées et publiées. unattended-upgrades applique ces correctifs dès
leur sortie, il ne protège pas d'une 0day.

Avec cet utilitaire, les paquets vont être mis à jour automatiquement,
ce qui va nous éviter d'y penser, ou de le faire. Par défaut, seules les origines Debian stable et Debian-Security sont couvertes : les dépôts `-updates`, les backports et les dépôts tiers ne bougent pas tant qu'on ne les ajoute pas dans `Origins-Pattern`.

Tout ce que nous avons à faire est d'installer le paquage
**unattended-upgrades**

```bash
apt-get -y install unattended-upgrades
```

Sur Debian 12 et 13, l'installation active déjà les mises à jour quotidiennes : la question debconf est de priorité basse, donc pas posée, et sa réponse par défaut est oui. Le paquet crée alors `/etc/apt/apt.conf.d/20auto-upgrades`. Pour vérifier, ou pour changer d'avis, on reconfigure le paquet :

```bash
dpkg-reconfigure unattended-upgrades
```

À la question « Automatically download and install stable updates? », on répond oui pour avoir les mises à jour quotidiennement. Le déclenchement passe par 2 timers systemd, `apt-daily.timer` (mise à jour des listes) et `apt-daily-upgrade.timer` (installation) :

```bash
systemctl list-timers 'apt-daily*'
```

Pour voir ce qui serait installé sans rien toucher :

```bash
unattended-upgrade --dry-run -d
```

Ce logiciel va générer des logs sauvegardés dans
**/var/log/unattended-upgrades**

* unattended-upgrades.log qui est un fichier généralisé qui va
    récapituler toutes les actions du logiciel
* `unattended-upgrades-dpkg.log` qui contient la sortie de dpkg pour
    chaque exécution, à la suite dans un seul fichier

Toutes les options de configurations sont disponibles dans le fichier
**/etc/apt/apt.conf.d/50unattended-upgrades**

## Plus d'informations

* [Wiki Debian](https://wiki.debian.org/PeriodicUpdates)
* [Debian
    Handbook](https://debian-handbook.info/browse/fr-FR/stable/sect.regular-upgrades.html)
* [Guide
    Ubuntu](https://guide.ubuntu-fr.org/server/automatic-updates.html)
