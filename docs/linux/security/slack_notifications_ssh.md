---
description: Envoyer des alertes Slack en temps réel lors des connexions SSH via webhooks et PAM
tested_with:
  - "OpenSSH 9.2 (Debian 12)"
tags:
  - SSH
  - Slack
  - Notification
---

# Configurer des notifications Slack pour SSH

Slack est une plateforme de chat mondialement connu. Aujourd'hui, nous
allons voir comment y intégrer un système de notification des connexions
SSH

## Configuration du Webhook

Tout d'abord, on crée une Slack app avec la fonctionnalité **Incoming Webhooks** (les webhooks "custom integration" legacy sont dépréciés). À l'activation, on choisit le chan où les messages seront envoyés : avec une app, le chan, le nom et l'icône du bot viennent de la config de l'app et ne peuvent plus être changés dans le message. Pour envoyer dans un autre chan, on crée un autre webhook. Une fois cela fait, penser à copier votre **Webhook URL** (de cette forme : `https://hooks.slack.com/services/<TEAM_ID>/<HOOK_ID>/<TOKEN>`)

Cette URL est un secret : n'importe qui la connaissant peut poster dans le chan, et Slack révoque celles qu'il trouve en ligne. On la stocke dans un fichier lisible par root seul plutôt qu'en dur dans le script :

```bash
echo 'https://hooks.slack.com/services/<TEAM_ID>/<HOOK_ID>/<TOKEN>' > /etc/ssh/slack_webhook
chmod 600 /etc/ssh/slack_webhook
```

## Configuration côté serveur

Le script construit le JSON avec `jq` (un nom d'utilisateur contenant un guillemet ne casse plus le payload), on l'installe :

```bash
apt install jq curl
```

Nous commençons par faire notre fichier qui enverra nos notifications à
notre Slack : /etc/ssh/notify.sh. Le shebang est obligatoire : `pam_exec` lance le script via `execve()`, qui refuse un fichier sans `#!` et rien n'est envoyé.

```bash
#!/usr/bin/env bash
if [ "$PAM_TYPE" != "close_session" ]; then
  url=$(cat /etc/ssh/slack_webhook)
  host=$(hostname -f)
  payload=$(jq -n --arg user "$PAM_USER" --arg rhost "${PAM_RHOST:-local}" --arg host "$host" '{
    attachments: [{
      mrkdwn_in: ["text", "fallback"],
      fallback: "SSH login: \($user) connected to `\($host)`",
      text: "SSH login to `\($host)`",
      fields: [
        {title: "User", value: $user, short: true},
        {title: "IP Address", value: $rhost, short: true}
      ],
      color: "#F35A00"
    }]
  }')
  curl -s --max-time 5 -H 'Content-type: application/json' --data "$payload" "$url" >/dev/null 2>&1 &
fi
```

`pam_exec` attend la fin du script avant de rendre la main : le `curl` part en arrière-plan avec un `--max-time`, un Slack lent ou injoignable ne retarde donc jamais le login. On rend notre script exécutable par root seul

```bash
chmod 700 /etc/ssh/notify.sh
```

Et on modifie notre service PAM SSH /etc/pam.d/sshd en y ajoutant le
contenu suivant

```bash
session optional pam_exec.so seteuid /etc/ssh/notify.sh
```

Nous relançons notre service

```bash
systemctl try-restart ssh.service
```

À la prochaine connexion SSH, un message arrive dans le chan avec l'utilisateur et l'IP source. En cas de souci, les erreurs de `pam_exec` (`execve(...) failed`) sont dans `/var/log/auth.log` ou `journalctl -u ssh`.
