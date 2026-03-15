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

Tout d'abord, il faut créer un **Webhook** sur le panneau de configuration du Workspace. Pour ça, il faut choisir (ou créer) un chan où les messages du bot seront envoyés ainsi que le nom du bot. Une fois cela fait, penser à copier la **Webhook URL** (de cette forme :
<https://hooks.slack.com/services/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>)

## Configuration check_mk (CLI)

Pour check_mk, on va utiliser un plugin disponible sur
[Github](https://github.com/rmblake/check_mk-slack)
(rmblake/check_mk-slack) écrit en python.

Dans le cas d'une installation via le package, il faudra placer le
plugin dans `/omd/sites/<monsite>/share/check_mk/notifications`
sans oublier de rendre le script exécutable :

```bash
wget -O /omd/sites/<monsite>/share/check_mk/notifications https://raw.githubusercontent.com/rmblake/check_mk-slack/master/slack
chmod +x /omd/sites/<monsite>/share/check_mk/notifications
```

Dans ce script, il faudra modifier quelques variables pour que celui-ci fonctionne :

```bash
slack_path = "/services/T6AE8D9QU/BE8UA9LUE/2DtDzTQ61UpURxc4kfMK74JF"
bot_name = "Monitoring"
proxies = {}
```

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

Si l'output de la commande est autre que **200** alors la configuration est incorrecte.

## Configuration check_mk (GUI)

Pour que le nouveau service de notification soit vu par Check_MK, il faut redémarrer le site :

```bash
omd restart <monsite>
```

Une fois la partie CLI correcte, on configure la partie graphique afin de recevoir les notifications via Slack.

Pour cela, rendez-vous dans la partie **Notifications** de Check_MK et cliquer sur **New Rule**.

Dans la partie **Notification method** : choisir **CMK-Slack Websocket Notification** en tant que **Notification method** avec comme option **Call with the following parameters** avec comme paramètre le nom du channel (dans notre cas `monitoring`).

Dans la partie **Contact Selection**, on envoie les notifications uniquement pour le contact **cmkadmin** (ou celui de son choix).

On dispose désormais d'un système de notification Slack fonctionnel.
