---
description: Envoyer des alertes Telegram lors des connexions SSH via un bot Telegram et pam_exec, sans exposer le token du bot
tags:
  - SSH
  - Telegram
  - Notification
variables:
  - name: bot_token
    default: "123456:ABC-DEF"
  - name: chat_id
    default: "123456789"
---

# Configurer des notifications Telegram pour SSH

Ce tutoriel reprend le principe de la [notification Slack](slack_notifications_ssh.md) pour une autre plateforme de messagerie. Le principe diffère légèrement : ici, on passe par un bot Telegram et son API plutôt que par un webhook.

## Configuration du bot Telegram

On crée le bot en parlant à [@BotFather](https://core.telegram.org/bots/features#botfather) (`/newbot`), qui renvoie le token du bot. Ce token donne le contrôle total du bot, il se traite comme un mot de passe.

Pour récupérer son `chat_id`, on envoie un message au bot, puis on lit les updates :

```bash
curl -s "https://api.telegram.org/bot<bot_token>/getUpdates"
```

Le `chat_id` est le champ `message.chat.id` de la réponse.

## Configuration côté serveur

Le token ne va ni dans le script ni sur la ligne de commande de curl : un argument est visible par tous les utilisateurs locaux via `ps` le temps de l'appel. On le met dans un fichier de config curl (`-K`), lisible par root seulement :

```bash
mkdir -p /etc/ssh/telegram
cat > /etc/ssh/telegram/curl.conf << 'EOF'
url = "https://api.telegram.org/bot<bot_token>/sendMessage"
data-urlencode = "chat_id=<chat_id>"
EOF
chown -R root:root /etc/ssh/telegram
chmod 700 /etc/ssh/telegram
chmod 600 /etc/ssh/telegram/curl.conf
```

Puis le script qui envoie la notification, `/etc/ssh/notify.sh`. Il tourne sous `pam_exec`, qui ne lui passe que l'environnement PAM : pas de `SSH_CLIENT` ni de `USER` comme dans un shell, mais `PAM_USER`, `PAM_TYPE` et `SSH_CONNECTION` (que sshd ajoute à l'environnement PAM) :

```bash
cat > /etc/ssh/notify.sh << 'EOF'
#!/usr/bin/env bash

# A session rule runs on open AND close: notify on open only
[ "${PAM_TYPE:-}" = "open_session" ] || exit 0

# SSH_CONNECTION = "client_ip client_port server_ip server_port"
read -r CLIENT_IP _ SRV_IP _ <<< "${SSH_CONNECTION:-}"
SRV_HOSTNAME="$(hostname -f)"
DATE="$(date "+%d %b %Y %H:%M")"
IPINFO="https://ipinfo.io/${CLIENT_IP}"

TEXT="Connection from <b>${CLIENT_IP}</b> as <b>${PAM_USER}</b> on <b>${SRV_HOSTNAME}</b> (${SRV_IP})
Date: ${DATE}
More informations: <a href=\"${IPINFO}\">${IPINFO}</a>"

# pam_exec waits for the script: cap the call so a slow API cannot hang the login
curl -s --max-time 5 -K /etc/ssh/telegram/curl.conf \
  --data-urlencode "text=${TEXT}" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode 'link_preview_options={"is_disabled":true}' > /dev/null

exit 0
EOF
```

Quelques choix dans ce script :

- `--data-urlencode` encode le texte : avec un simple `-d`, un `&` ou un `+` dans le message le tronque ou le déforme
- `parse_mode=HTML` plutôt que `markdown`, un mode legacy qui refuse le message dès qu'un `_` traîne dans un hostname ou un user
- `link_preview_options` remplace `disable_web_page_preview`, qui n'apparaît plus dans la doc de `sendMessage`

On rend le script exécutable par root seulement :

```bash
chmod 700 /etc/ssh/notify.sh
```

Et on modifie notre service PAM SSH `/etc/pam.d/sshd` en y ajoutant la ligne suivante :

```text
session optional pam_exec.so seteuid /etc/ssh/notify.sh
```

PAM relit sa configuration à chaque connexion, pas besoin de relancer sshd. On teste en ouvrant une nouvelle session SSH, en gardant l'actuelle ouverte au cas où.

Nous avons désormais une notification à chaque ouverture de session SSH.
