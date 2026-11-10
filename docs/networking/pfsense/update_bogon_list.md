---
description: Mettre à jour manuellement la liste des bogons dans pfSense via l'interface de diagnostic ou en shell
tags:
  - pfSense
---

# Mise à jour de la bogon list via l'interface graphique

Pour mettre à jour la **Bogons List** via
l'interface graphique, il faut aller dans **Diagnostics**, **Tables**.
Et en **Table** on sélectionne **bogons** (ou **bogonsv6**), puis on clique sur **Update** pour mettre à jour la liste.

Depuis un shell sur le pfSense, c'est le script que lance ce bouton. Sans argument il attend un délai aléatoire (jusqu'à 24h) avant de télécharger, `now` le lance tout de suite :

```sh
/etc/rc.update_bogons.sh now
```

La mise à jour automatique se règle dans **System**, **Advanced**, **Firewall & NAT**, section **Bogon Networks** : **Update Frequency** vaut **Monthly** par défaut, on peut passer en **Weekly** ou **Daily**.
