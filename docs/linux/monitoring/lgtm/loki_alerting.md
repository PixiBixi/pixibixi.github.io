# Générer des alertes depuis Loki

Avoir des logs c'est bien, les exploiter c'est mieux. Pour cela, nous pouvons générer des alertes et les remonter dans AlertManager, tout comme Prometheus.

Les différentes configuration sont valables pour le [chart Helm](https://github.com/grafana/loki/tree/main/production/helm/loki) officiel `grafana/loki`

Pour cela, la première étape est de link son Loki (plus particulièrement le ruler de Loki) avec son instance de Prometheus :

??? note "Helm : Ruler Configuration"
    ```
    loki:
      rulerConfig:
        evaluation_interval: 15s
        enable_sharding: true
        alertmanager_url: https://alertmanager.domain.tld/
        enable_alertmanager_v2: true
        storage:
          type: local
          local:
            directory: /var/loki/rules
        wal:
          dir: "/var/loki/wal-dir"
        remote_write:
          enabled: true
          client:
            url: http://prometheus-server.dyn-tools.svc.cluster.local/api/v1/write
    ```

Dans ce bloc de configuration, nous définissons en réalité plusieurs paramètres non directement liés à AlertManager:

  * `evaluation_interval` à 15s qui nous permet de réévaluer les records toutes les 15 secondes et de les envoyer à notre Prometheus
  * `enable_sharding` car nous disposons de plusieurs instances du ruler
  * `alertmanager_url` qui nous indique où envoyer les alertes
  * `enable_alertmanager_v2` car nous utilisons un AlertManager récent :)
  * `storage` et subéquent car nous utilisons des règles locales.
    * Dans un monde optimal, nous aurions du utiliser un backed remote type S3
  * `wal.dir` le chart Helm a un bug qui nous force à override la valeur
  * `remote_write` et subséquent pour envoyer nos records à Prometheus (ou VictoriaMetrics...)

Nous avons maintenant besoin de créer les règles Loki et différents éléments liés à Kubernetes dans un fichier `loki-rules.yaml`:
??? note "Helm: loki-rules.yaml"
    ```
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: loki-alerting-rules
      labels:
        release: monitoring-metrics
    data:
      rules.yaml: |
        groups:
          - name: BusinessAlarms
            rules:
              - record: overview:nodebidder:aerospike_error:sum_rate
                expr: sum(rate({host=~"node-bidder-.*"} |~ "AEROSPIKE_ERROR"[1m])) by (pop)
              - alert: AnalyzePipeLastHour
                expr: (count_over_time({job="monitoring_business"} |= "last_hour_vs_last_6_hours,last_hour_vs_last_12_hours"  | json result_code,task | result_code!=0 [1m])) > 0
                for: 2m
                labels:
                  severity: critical
                  destination: monitoring-backend
                annotations:
                  summary: "`Analyze Pipe Last Hour` @ `{{ $labels.pop }}` has issues"
                  description: "`Analyze Pipe Last Hour` @ `{{ $labels.pop }}` has issues, please check Logs if you want more hints"
                  url_grafana: "https://grafana.domain.tld/d/8WbuKiBVz/monitoring-tasks-logs?orgId=1&var-tasks={{ $labels.task }}"
    ```

Vous pouvez le voir, tel que Prometheus, Loki peut gérer les records et les alertes

Comme d'habitude sur K8S, nous appliquons notre manifest
```
kubectl apply -f loki-rules.yaml
```

Pour appliquer les updates de rules, nous devons faire un rolling restart du statefulset loki-backend

```
kubectl rollout restart statefulset loki-backend
```

Enfin, nous montons les différents volumes

??? note "Helm: Loki Volumes"
    ```
    loki:
      backend:
        extraVolumeMounts:
        - name: rules
          mountPath: "/var/loki/rules/fake"
        - name: loki-wal-dir
          mountPath: "/var/loki/wal-dir"
        extraVolumes:
        - name: rules
          configMap:
            name: loki-alerting-rules
        - name: loki-wal-dir
          emptyDir: {}
    ```

