---
description: Astuces pour la stack LGTM - appels API Prometheus, Loki, Grafana et Tempo
tags:
  - Prometheus
  - Grafana
  - Loki
---

# Quelques tips pour la stack LGTM

Quelques calls API à gauche à droite qui nous sont bien pratiques pour du Prometheus ou autre. Pour plus d'informations sur chacun de ces composants, voir [la stack de monitoring simple](simple_monitoring_stack.md) et [l'alerting avec Loki](loki_alerting.md).

## Prometheus

Notre premier call Prometheus nous permet de lister toutes les métriques disponibles dans notre Prometheus

```sh
curl http://127.0.0.1:9090/api/v1/label/__name__/values
```

Pour traquer une explosion de cardinalité, le endpoint `status/tsdb` sort directement le top des métriques et des labels les plus coûteux en séries

```sh
curl -s http://127.0.0.1:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[:10]'
curl -s http://127.0.0.1:9090/api/v1/status/tsdb | jq '.data.labelValueCountByLabelName[:10]'
```

Lister les targets qui ne scrapent pas, avec la raison, évite d'aller cliquer dans l'UI

```sh
curl -s 'http://127.0.0.1:9090/api/v1/targets?state=active' \
  | jq -r '.data.activeTargets[] | select(.health != "up") | "\(.scrapeUrl)\t\(.lastError)"'
```

Recharger la configuration sans redémarrer le process, à condition d'avoir démarré Prometheus avec `--web.enable-lifecycle`

```sh
curl -X POST http://127.0.0.1:9090/-/reload
```

## Loki

Lister les labels disponibles, puis les valeurs d'un label donné. Pratique pour construire une requête LogQL sans deviner

```sh
curl -s http://127.0.0.1:3100/loki/api/v1/labels | jq -r '.data[]'
curl -s http://127.0.0.1:3100/loki/api/v1/label/app/values | jq -r '.data[]'
```

## Grafana

Sortir la liste des dashboards avec leur UID, utile pour un export en masse

```sh
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  'http://127.0.0.1:3000/api/search?type=dash-db' | jq -r '.[] | "\(.uid)\t\(.title)"'
```

Et récupérer le JSON d'un dashboard précis à partir de son UID

```sh
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  http://127.0.0.1:3000/api/dashboards/uid/<UID> | jq '.dashboard'
```

## Tempo

Vérifier que Tempo répond, et lister les tags indexés sur lesquels on peut chercher une trace

```sh
curl -s http://127.0.0.1:3200/api/echo
curl -s http://127.0.0.1:3200/api/search/tags | jq -r '.tagNames[]'
```

## Voir aussi

- [Netdata, Prometheus et Grafana : une stack de monitoring simple et puissante](simple_monitoring_stack.md)
- [Générer des alertes depuis Loki](loki_alerting.md)
