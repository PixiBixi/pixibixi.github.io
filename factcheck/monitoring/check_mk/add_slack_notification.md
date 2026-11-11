---
article: docs/monitoring/check_mk/add_slack_notification.md
checked: '2026-11-11'
commit: e771e8c35220bb7638316ff9e51db7f0f6956df1
sources:
- repo: check_mk-slack
  path: slack
  lines: 21-24
  ref: c77ea44
  commit: c77ea44ab539c4e3c89bbc54db47ab7b23a0463c
- repo: check_mk-slack
  path: slack
  lines: '113'
  ref: c77ea44
  commit: c77ea44ab539c4e3c89bbc54db47ab7b23a0463c
- repo: check_mk-slack
  path: slack
  lines: '2'
  ref: c77ea44
  commit: c77ea44ab539c4e3c89bbc54db47ab7b23a0463c
unpinned: 2
---

# docs/monitoring/check_mk/add_slack_notification.md

## Findings

- L29 ERROR corrigé : `wget -O` et `chmod` visent le fichier `/omd/sites/<monsite>/local/share/check_mk/notifications/slack`. Preuve : Checkmk cmk/utils/paths.py:102 `notifications_dir = _omd_path("share/check_mk/notifications")`, :130 `local_notifications_dir = _local_path(notifications_dir)` @origin/2.3.0.
- L21 OUTDATED corrigé : l'article passe en tête sur le script natif "Slack or Mattermost"; le plugin rmblake devient une section "Ancienne méthode" qui dit qu'il n'est plus maintenu et vise Python 2. Preuve : Checkmk notifications/slack (2e ligne `# Slack or Mattermost`) présent sur les branches 1.5.0, 1.6.0, 2.0.0, 2.3.0; cmk/gui/wato/_notification_parameter/_slack.py:35 `Webhook-URL` @2.3.0; rmblake/check_mk-slack slack:1 `#!/usr/bin/python`, README "I won't be able to accept any commits/updates going forward" @c77ea44 (2019-01-02). Le "ne démarre pas sur 2.x" n'est pas testé dans un conteneur Checkmk.
- L36 IMPRECISE corrigé en partie : webhook au format réel remplacé par `T00000000/B00000000/XXXX...` (aussi L16), phrase ajoutée : le channel vient de `NOTIFY_PARAMETER_1`, `#monitoring` par défaut. Preuve : slack:21-24 @c77ea44. L'article ne prétendait pas que `slack_path` fixait le channel.
- L53 IMPRECISE rejeté : le script affiche bien le code HTTP (`print(conn.status_code)`, slack:113 @c77ea44) et les variables d'env de l'exemple couvrent le chemin "host" du script (`NOTIFY_WHAT` différent de `SERVICE`, `WARNING` présent dans la table de styles). Phrase précisée ("le script affiche le code HTTP renvoyé par Slack").

## En plus

- Nom de la méthode du plugin : "CMK-Slack Websocket Notification" -> "CMK-Slack Websocket integration" (2e ligne du script, c'est elle que Checkmk affiche). Preuve : slack:2 @c77ea44.
- `proxies` doit être défini sinon `NameError` (le script l'utilise ligne 111 alors que la définition est commentée). Preuve : slack:27-30 et 111 @c77ea44.
- Bloc des variables passé de `bash` à `python`.

## Modernisation

- Appliqué : méthode native en méthode principale, avec le password store mentionné pour la Webhook URL (champ vu dans _slack.py @2.3.0).
- Appliqué : chemin `local/share/...` pour les scripts maison.

## Tests

- Aucun conteneur Checkmk lancé; vérification par lecture des sources Checkmk/checkmk (branches 1.5.0 à 2.3.0) et rmblake/check_mk-slack.

## À signaler

- Le libellé exact du menu et du bouton de création de règle varie selon la version (2.3 vs 2.4) : j'ai écrit "créer une nouvelle règle" sans nommer le bouton.
- Si le webhook `T6AE8D9QU/BE8UA9LUE/...` était réel, le révoquer : il reste dans l'historique git.
