---
description: Stack LGTM, check_mk et Munin — monitoring, alerting et métriques pour la production.
tags:
  - Prometheus
  - Grafana
  - Loki
  - Monitoring
  - Observability
---

# Monitoring

Sans monitoring, on debug à l'aveugle. Cette section couvre la stack LGTM (Loki, Grafana, Tempo, Prometheus) pour le monitoring moderne, check_mk pour les infras on-premise, et Munin pour les vieux parcs.

## Contenus

- [LGTM — Stack simple](lgtm/simple_monitoring_stack.md) — déployer Prometheus + Grafana + Loki from scratch
- [LGTM — Métriques custom Node Exporter](lgtm/custom_metrics_nodeexporter.md) — exposer des métriques personnalisées
- [LGTM — Alerting Loki](lgtm/loki_alerting.md) — créer des alertes sur les logs
- [LGTM — Tips](lgtm/tips_lgtm.md) — astuces et patterns pour la stack
- [check_mk — Notifications Slack](check_mk/add_slack_notification.md) — envoyer les alertes check_mk dans Slack
- [Munin](munin.md) — configuration et plugins Munin
- [Eztools](eztools.md) — outils de monitoring légers
