---
description: Astuces pour la stack LGTM — appels API Prometheus, Loki, Grafana et Tempo
tags:
  - Prometheus
  - Grafana
  - Loki
---

# 2-3 tips pour la stack LGTM

Quelques calls API à gauche à droite qui nous sont bien pratiques pour du Prometheus ou autre. Pour plus d'informations sur chacun de ces composants, voir [la stack de monitoring simple](simple_monitoring_stack.md) et [l'alerting avec Loki](loki_alerting.md).

## Prometheus

Notre premier call Prometheus nous permet de lister toutes les métriques disponibles dans notre Prometheus

```sh
curl http://127.0.0.1:9090/api/v1/label/__name__/values
```

## Voir aussi

- [Netdata, Prometheus et Grafana : une stack de monitoring simple et puissante](simple_monitoring_stack.md)
- [Générer des alertes depuis Loki](loki_alerting.md)
