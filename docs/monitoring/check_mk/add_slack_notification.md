---
description: Configurer les notifications Slack dans Check_MK pour recevoir les alertes de supervision en temps réel
tags:
  - CheckMK
  - Slack
  - Notification
---

# Configurer des notifications Slack pour check_mk

À l'heure actuelle où tout est convergé sur la communication interne via des outils comme Slack ou Mattermost, le mail semble presque dépassé. Dans cette optique, on peut envoyer les notifications sur un channel Slack (ou bien Mattermost).

## Configuration Slack

Tout d'abord, il faut créer un **Webhook** sur le panneau de configuration du Workspace. Pour ça, il faut choisir (ou créer) un chan où les messages du bot seront envoyés ainsi que le nom du bot. Une fois cela fait, penser à copier la **Webhook URL** (de cette forme : `https://hooks.slack.com/services/<TEAM_ID>/<HOOK_ID>/<TOKEN>`). Elle sert de secret : quiconque la connaît peut poster dans le chan.

## Configuration check_mk (GUI)

Depuis la 1.5, Checkmk livre son propre script **Slack or Mattermost** (`share/check_mk/notifications/slack`) : plus rien à installer.

Pour cela, rendez-vous dans la partie **Notifications** de Check_MK et créer une nouvelle règle.

Dans la partie **Notification method** : choisir **Slack or Mattermost** et coller la Webhook URL dans le champ **Webhook-URL** (ou la référencer depuis le password store, c'est mieux qu'en clair dans la règle).

Dans la partie **Contact Selection**, on envoie les notifications uniquement pour le contact **cmkadmin** (ou celui de son choix).

On dispose désormais d'un système de notification Slack fonctionnel.

## Ancienne méthode : plugin rmblake/check_mk-slack

Sur une très vieille version (avant 1.5), on passait par un plugin disponible sur [GitHub](https://github.com/rmblake/check_mk-slack) écrit en python. Il n'est plus maintenu depuis 2019 et son shebang `#!/usr/bin/python` vise Python 2 : sur un Checkmk 2.x, il ne démarre pas tel quel.

Un script maison ne va pas dans `share/` (réservé aux fichiers livrés avec Checkmk) mais dans `local/share/check_mk/notifications/` du site, sans oublier de le rendre exécutable :

```bash
wget -O /omd/sites/<monsite>/local/share/check_mk/notifications/slack https://raw.githubusercontent.com/rmblake/check_mk-slack/master/slack
chmod +x /omd/sites/<monsite>/local/share/check_mk/notifications/slack
```

Dans ce script, il faudra modifier quelques variables pour que celui-ci fonctionne (`proxies` doit être défini, même vide, sinon le script plante) :

```python
slack_path = "/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
bot_name = "Monitoring"
proxies = {}
```

Le channel ne se règle pas ici : le script le lit dans le premier paramètre de la règle de notification (`NOTIFY_PARAMETER_1`), et poste dans `#monitoring` par défaut.

Si tout semble correct, il est possible de tester le script en ligne de commande :

```bash
export NOTIFY_HOSTNAME=TestHost
export NOTIFY_WHAT=""
export NOTIFY_HOSTACKCOMMENT=false
export NOTIFY_NOTIFICATIONAUTHOR=""
export NOTIFY_HOSTSTATE=DOWN
export NOTIFY_NOTIFICATIONTYPE="WARNING"
./slack
```

Le script affiche le code HTTP renvoyé par Slack : si l'output de la commande est autre que **200** alors la configuration est incorrecte.

Pour que le nouveau service de notification soit vu par Check_MK, il faut redémarrer le site :

```bash
omd restart <monsite>
```

Dans la règle de notification, on choisit alors **CMK-Slack Websocket integration** en tant que **Notification method** avec comme option **Call with the following parameters** avec comme paramètre le nom du channel sans `#` (dans notre cas `monitoring`).
