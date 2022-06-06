# Configurer des notifications Slack pour check_mk 
 
![](/monitoring/check_mk/screenshot_slack_monitoring.png){.align-center} 
 
À l'heure actuelle où tout est convergé, la communication interne via 
des outils comme Slack ou Mattermost, le mail semble presque dépassé. 
Dans cette optique, nous pouvons envoyer les notifications sur un 
channel Slack (ou bien Mattermost). 
 
## Configuration Slack 
 
Tout d'abord, il faut créer votre **Webhook** sur le panneau de 
configuration de votre Workspace. Pour cela, il faut choisir (ou créer) 
un chan où les messages du bot seront envoyés ainsi que le nom du bot. 
Une fois cela fait, penser à copier votre **Webhook URL** (De cette 
forme : 
<https://hooks.slack.com/services/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>) 
 
## Configuration check_mk (CLI) 
 
Pour check_mk, nous allons utiliser un plugin disponible sur 
[Github](https://github.com/rmblake/check_mk-slack) 
(rmblake/check_mk-slack) écrit en python. 
 
Dans le cas d'une installation via le package, il faudra placer le 
plugin dans */omd/sites/**'<monsite'>**/share/check_mk/notifications* 
sans oublier de rendre le script exécutable 
 
``` bash 
λ jeremy ~ → wget -O /omd/sites/**<monsite>**/share/check_mk/notifications https://raw.githubusercontent.com/rmblake/check_mk-slack/master/slack && chmod +x /omd/sites/**<monsite>**/share/check_mk/notifications 
``` 
 
Dans ce script, il faudra modifier quelques variables pour que celui-ci 
fonctionne 
 
``` bash 
slack_path = "/services/T6AE8D9QU/BE8UA9LUE/2DtDzTQ61UpURxc4kfMK74JF" 
bot_name = "Monitoring" 
proxies = {} 
``` 
 
Si tout vous semble correct, il est possible de tester le script en 
ligne de commande : 
 
``` bash 
λ jeremy ~ → export NOTIFY_HOSTNAME=TestHost 
λ jeremy ~ → export NOTIFY_WHAT="" 
λ jeremy ~ → export NOTIFY_HOSTACKCOMMENT=false 
λ jeremy ~ → export NOTIFY_NOTIFICATIONAUTHOR="" 
λ jeremy ~ → export NOTIFY_HOSTSTATE=DOWN 
λ jeremy ~ → export NOTIFY_NOTIFICATIONTYPE="WARNING" 
λ jeremy ~ → ./slack 
``` 
 
Si l'output de la commande est autre que **200** alors votre 
configuration est incorrecte 
 
## Configuration check_mk (GUI) 
 
Pour que notre nouveau '"service de notification'" soit vu par Check_MK, 
il faut redémarrer le site 
 
``` bash 
λ jeremy ~ → omd restart <monsite> 
``` 
 
Une fois la partie CLI correcte, nous allons maintenant configurer notre 
partie graphique afin de recevoir nos notifications via Slack. 
 
Pour cela, rendez-vous dans la partie **Notifications** de Check_MK et 
cliquer sur **New Rule** 
 
Dans la partie **Notification method** : Nous allons choisir **CMK-Slack 
Websocket Notification** en tant que **Notification method** avec comme 
option **Call with the following parameters** avec comme paramètre le 
nom de votre channel (Dans notre cas monitoring) 
 
![](/monitoring/check_mk/check_mk_notification_method.png){.align-center} 
 
Dans la partie **Contact Selection**, nous envoyons les notifications 
uniquement pour le contact **cmkadmin** (ou celui que vous souhaitez) 
 
![](/monitoring/check_mk/check_mk_user.png){.align-center} 
 
Et voilà, nous avons désormais un système de notification Slack 
fonctionnel 
