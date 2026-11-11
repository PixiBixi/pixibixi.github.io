---
article: docs/linux/security/slack_notifications_ssh.md
checked: '2026-11-10'
commit: 848f69b5356bddb2fa7cf68884dc9267ba1fb4ec
sources: []
unpinned: 6
---

# docs/linux/security/slack_notifications_ssh.md

## Findings

- L30 ERROR corrigé : ajout de `#!/usr/bin/env bash` en tête du script, avec une phrase qui explique pourquoi. Preuve : linux-pam modules/pam_exec/pam_exec.c@origin/master:487 (`execve (arggv[0], ...)`) ; test Docker debian:12.7 + sshd + pam_exec : sans shebang "nothing received", avec shebang le POST arrive sur le faux webhook.
- L35 ERROR corrigé : retrait de `channel`, `username`, `icon_emoji` du payload ; la section webhook explique qu'avec une Slack app le chan, le nom et l'icône viennent de la config de l'app, un webhook par chan. Preuve : docs.slack.dev/messaging/sending-messages-using-incoming-webhooks ("cannot override" the default channel, username, or icon).
- L50 ERROR corrigé partiellement : `curl --max-time 5`, sortie redirigée vers /dev/null, toujours en arrière-plan ; script en `chmod 700`. Nuance : la remarque "stdout/stderr hérités" ne tient pas, pam_exec redirige déjà stdout vers /dev/null sans option `stdout`/`log` (pam_exec.c@origin/master:334-335, `PAM_MODUTIL_NULL_FD`) et le `&` suffisait pour ne pas bloquer ; le `--max-time` reste une ceinture. waitpid confirmé pam_exec.c:282.
- L21 IMPRECISE corrigé : URL d'exemple remplacée par `TXXXXXXXX/BXXXXXXXX/XXXX...`, ajout d'un paragraphe "cette URL est un secret", stockage dans `/etc/ssh/slack_webhook` en 600 lu par le script. Preuve : même page Slack ("Your webhook URL contains a secret", "Slack actively searches out and revokes leaked secrets").
- L30 IMPRECISE rejeté (pas d'action) : le finding confirme lui-même que la condition `!= close_session` est correcte et que la règle dans /etc/pam.d/sshd ne concerne que SSH.
- L34 IMPRECISE corrigé : JSON construit avec `jq -n --arg`, `PAM_RHOST` vide remplacé par `local`. Preuve : test Docker, payload reçu valide avec User=bob, IP=127.0.0.1, Content-Type application/json.

## En plus

- La fin de l'article ("Et voici le résultat que nous aurons :") pointait vers rien (aucune image dans le repo ni dans l'historique) : remplacée par une phrase qui décrit le message reçu et où lire les erreurs de pam_exec.

## Modernisation

- Slack app + Incoming Webhooks, un webhook par chan : appliqué.
- Corps JSON avec `Content-type: application/json` au lieu de `payload=` urlencodé : appliqué (testé).
- URL dans un fichier root:root 0600 : appliqué.

## Tests

- Docker debian:12.7, openssh-server 1:9.2p1-2+deb12u10, libpam-modules 1.5.2-6+deb12u1, login sshpass, faux webhook Python sur 127.0.0.1:8080. `tested_with: "OpenSSH 9.2 (Debian 12)"` ajouté. L'envoi réel vers Slack (rendu des attachments) n'a pas été testé.

## À signaler

- `systemctl try-restart ssh.service` est probablement inutile (libpam relit /etc/pam.d/sshd à chaque session), laissé tel quel, non vérifié.
- Dépendance `jq` ajoutée (ligne `apt install jq curl`).
