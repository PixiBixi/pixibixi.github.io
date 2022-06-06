# Configurer des notifications Slack pour SSH 
 
Slack est une plateforme de chat mondialement connu. Aujourd'hui, nous 
allons voir comment y intégrer un système de notification des connexions 
SSH 
 
## Configuration du Webhook 
 
Tout d'abord, il faut créer votre **Webhook** sur le panneau de 
configuration de votre Workspace. Pour cela, il faut choisir (ou créer) 
un chan où les messages du bot seront envoyés ainsi que le nom du bot. 
Une fois cela fait, penser à copier votre **Webhook URL** (De cette 
forme : 
<https://hooks.slack.com/services/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>) 
 
## Configuration côté serveur 
 
Nous commençons par faire notre fichier qui enverra nos notifications à 
notre Slack : /etc/ssh/notify.sh 
 
``` bash 
if [ "$PAM_TYPE" != "close_session" ]; then 
 url="WEBHOOK_URL" 
 channel="#external-servers" 
 host=$(hostname -f) 
 content="'"attachments'": [ { '"mrkdwn_in'": ['"text'", '"fallback'"], '"fallback'": '"SSH login: $PAM_USER connected to '`$host'`'", '"text'": '"SSH login to '`$host'`'", '"fields'": [ { '"title'": '"User'", '"value'": '"$PAM_USER'", '"short'": true }, { '"title'": '"IP Address'", '"value'": '"$PAM_RHOST'", '"short'": true } ], '"color'": '"#F35A00'" } ]" 
 curl -s -X POST --data-urlencode "payload={'"channel'": '"$channel'", '"mrkdwn'": true, '"username'": '"ssh-bot'", $content, '"icon_emoji'": '":computer:'"}" $url & 
fi 
``` 
 
Penser à remplacer le WEBHOOK_URL et le channel par le votre. On rend 
notre script exécutable 
 
``` bash 
chmod +x /etc/ssh/notify.sh 
``` 
 
Et on modifie notre service PAM SSH /etc/pam.d/sshd en y ajoutant le 
contenu suivant 
 
``` bash 
session optional pam_exec.so seteuid /etc/ssh/notify.sh 
``` 
 
Nous relançons notre service 
 
``` bash 
systemctl try-restart ssh.service 
``` 
 
Et voici le résultat que nous aurons : 
 
![](/slack_bot.png){.align-center width="600"} 
