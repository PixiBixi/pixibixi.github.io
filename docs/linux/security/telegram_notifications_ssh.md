# Configurer des notifications Telegram pour SSH 
 
Ce tutoriel reprend le principe de la notification Slack pour une autre 
plateforme de Messagerie, le principe diffère légèrement car nous avons 
ici 
 
## Configuration du bot Telegram 
 
Voici comment [créer son bot 
Telegram](https://www.teleme.io/articles/create_your_own_telegram_bot?hl=fr), 
n'oublions pas de récupérer les tokens importants. 
 
## Configuration côté serveur 
 
Nous commençons par faire notre fichier qui enverra nos notifications à 
notre Telegram : /etc/ssh/notify.sh 
 
``` bash 
#!/usr/bin/env bash 
 
# Import credentials form config file 
. /opt/ssh-login-alert-telegram/credentials.config 
 
URL="https://api.telegram.org/bot${KEY}/sendMessage" 
DATE="$(date "+%d %b %Y %H:%M")" 
 
CLIENT_IP=$(echo $SSH_CLIENT | awk {print $1}) 
 
SRV_HOSTNAME=$(hostname -f) 
SRV_IP=$(hostname -I | awk {print $1}) 
 
IPINFO="https://ipinfo.io/${CLIENT_IP}" 
 
TEXT="Connection from *${CLIENT_IP}* as ${USER} on *${SRV_HOSTNAME}* (*${SRV_IP}*) 
Date: ${DATE} 
More informations: [${IPINFO}](${IPINFO})" 
 
curl -s -d "chat_id=${USERID}&text=${TEXT}&disable_web_page_preview=true&parse_mode=markdown" $URL 
``` 
 
Nous utilisons un autre fichier afin de contenir les credentials : 
 
    # Your USERID or Channel ID to display alert and key, we recommend you create new bot with @BotFather on Telegram 
    USERID="USERID" 
    KEY="BOT_TOKEN" 
 
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
 
Nous avons désormais une notification avec chaque ouverture de session 
SSH 
