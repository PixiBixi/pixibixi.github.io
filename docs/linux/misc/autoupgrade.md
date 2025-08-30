# Mise à jour automatique de ses paquets

## Introduction

Nous le savons tous, mettre à jour ses paquets est une opération longue
et fastidieuse si nous possédons un nombre important de serveurs.

Il nous arrive régulièrement d'oublier les mises à jour, ce qui peut
permettre à certains pirates malveillants d'exploiter des failles de
types 0day.

Avec cet utilitaire, les paquets vont être mis à jour automatiquement,
ce qui va nous éviter d'y penser, ou de le faire.

Tout ce que nous avons à faire est d'installer le paquage
**unattended-upgrades**

```bash
apt-get -y install unattended-upgrades
```

Cependant, les mises à jour automatiques ne sont pas activées par
défaut, nous devons donc reconfigurer le paquet

```bash
dpkg-reconfigure unattended-upgrades
```

Voici l'écran que vous allez avoir :

![Unattended Reconfigure](/unattended-reconfigure.webp)

Lorsque vous aurez cet écran, répondez tout simplement oui pour avoir
les mises à jour quotidiennement

Ce logiciel va générer des logs sauvegardés dans
**/var/log/unattended-upgrades**

* unattended-upgrades.log qui est un fichier généralisé qui va
    récapituler toutes les actions du logiciel
* unattended-upgrades-dpkg'_**date**'_**heure**.log qui va indiquer ce
    qui a été fait un tel jour

Toutes les options de configurations sont disponibles dans le fichier
**/etc/apt/apt.conf.d/50unattended-upgrades**

## Plus d'informations

* [Wiki Debian](https://wiki.debian.org/UnattendedUpgrades)
* [How To
    Forge](https://www.howtoforge.com/how-to-configure-automatic-updates-on-debian-squeeze)
* [Debian
    Handbook](https://debian-handbook.info/browse/fr-FR/stable/sect.regular-upgrades.html)
* [Guide
    Ubuntu](https://guide.ubuntu-fr.org/server/automatic-updates.html)
