---
article: docs/monitoring/lgtm/alertmanager.md
checked: '2026-11-11'
commit: 78c31a363a04066dce909d87be7f97a23bb1408d
sources:
- repo: alertmanager
  path: dispatch/route.go
  lines: 30-40
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: dispatch/route.go
  lines: 89-98
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/config.go
  lines: 336-349
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/config.go
  lines: 433-473
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/config.go
  lines: 768
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/config.go
  lines: 787-789
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/config.go
  lines: 922-945
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: inhibit/cache.go
  lines: 76-118
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: inhibit/inhibit.go
  lines: 316-325
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/common/inhibitrule.go
  lines: 28-48
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: notify/slack/config.go
  lines: 25-40
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: notify/slack/config.go
  lines: 146-237
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: notify/webhook/config.go
  lines: 27-29
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: notify/pagerduty/config.go
  lines: 36-38
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: notify/opsgenie/config.go
  lines: 29-31
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: template/default.tmpl
  lines: 30
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: docs/configuration.md
  lines: 149-151
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: CHANGELOG.md
  lines: 7-79
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: CHANGELOG.md
  lines: 207-227
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: dispatch/dispatch.go
  lines: 844-876
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: notify/dedup_stage.go
  lines: 52-90
  ref: v0.35.0
  commit: 8cf67a8e75004bad6c3c6bacc829945cf8a3ee65
- repo: alertmanager
  path: config/notifiers.go
  lines: 1-400
  ref: v0.34.1
  commit: 73c6bfe7393929211294c1954f30d8ed78e4d0ad
- repo: prometheus
  path: docs/configuration/configuration.md
  lines: 3738-3745
  ref: v3.16.0
  commit: e2e28adeee2c5883d000fc82aca6008cfbf7e96d
- repo: prometheus
  path: docs/configuration/configuration.md
  lines: 3953-3955
  ref: v3.16.0
  commit: e2e28adeee2c5883d000fc82aca6008cfbf7e96d
unpinned: 2
---
# docs/monitoring/lgtm/alertmanager.md

## Findings

- L14 OUTDATED corrigé : l'article cite la v0.34.1 comme version courante, or la v0.35.0 est sortie le 2026-11-09 (la v0.34.2 du 2026-10-29 est une release de sécurité). Les chemins `notify/slack/config.go` et `config/common/inhibitrule.go` cités n'existent qu'à partir de la v0.35.0 (en v0.34.1 les defaults sont dans `config/notifiers.go`). Citer la v0.35.0. Preuve : CHANGELOG.md:7-79 @ v0.35.0
- L91 et L141 IMPRECISE corrigé : `post_updates_to_thread` est une nouveauté de la v0.35.0 (`[FEATURE] slack: Add post_updates_to_thread`, #5540) et n'existe pas en v0.34.1, la version que l'article annonce. Préciser « depuis la v0.35.0 » ou retirer l'option. `update_message` existe bien avant. Preuve : CHANGELOG.md:7-30 @ v0.35.0 et config/notifiers.go @ v0.34.1
- L85 IMPRECISE corrigé : `resolve_timeout` ne s'applique qu'aux alertes sans `EndsAt`, et la doc dit « This has no impact on alerts from Prometheus, as they always include EndsAt ». Ajouter cette réserve, sinon le lecteur croit que le délai joue sur ses alertes Prometheus. Preuve : docs/configuration.md:149-151 @ v0.35.0
- L33 IMPRECISE corrigé : `group_by: ['...']` crée un groupe par jeu de labels distinct, donc 1 notification par alerte seulement si chaque alerte a des labels uniques (2 alertes aux labels identiques restent dans le même groupe). Preuve : config/config.go:922-945 @ v0.35.0

Vérifié sans écart : défauts de route 30s/5m/4h, héritage de `group_by` par une route enfant, `...` exclusif des autres labels, `send_resolved` par défaut (Slack false, webhook, PagerDuty, Opsgenie true), `resolve_timeout` 5m, ajout de `name` aux inhibit rules en v0.30.0 (#4628) et dans les événements `inhibition_muted_alert` en v0.34.0 (#5315), support des Slack apps en v0.30.0 (#4211), correctif d'inhibition en v0.34.1, `source_match` et `target_match` dépréciés, cache des sources qui ignore les alertes resolved, `excludeTwoSidedMatch`, `app_url` par défaut `https://slack.com/api/chat.postMessage`, les 4 règles de validation Slack (exclusivité api_url et app_token, token global non hérité avec un `api_url` local, erreur `http authorization can't be set when using Slack App tokens`), `update_message` et `post_updates_to_thread` refusés avec webhook ou `api_url_file`, `title_link` par défaut `slack.default.titlelink`, `alert_relabel_configs` sous `alerting:` ou par entrée `alertmanagers`, appliqué après les `external_labels`. Tous les blocs de config passent `amtool check-config` en v0.35.0 (config complète, équivalent manuel, avant), les 3 cas d'erreur annoncés échouent avec le message attendu, `amtool config routes test` renvoie `slack-default`, `promtool check rules` et `check config` passent sur les blocs Prometheus. Le lien `[send_resolved]` de la doc Prometheus HA (`prometheus_replica`) est cohérent avec la doc `alert_relabel_configs`.

## Unpinned

- L191 : « Alertmanager ne les déduplique pas » quand `prometheus_replica` diffère, déduit du fait que le fingerprint porte sur tous les labels, non lu dans une ligne précise du code.
- L51 : « depuis la v0.34.0, le nom de la règle figure dans les événements » lu dans le CHANGELOG seulement, pas dans le code de l'event recorder de la v0.34.0.
