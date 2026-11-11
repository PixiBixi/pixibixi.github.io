---
article: docs/monitoring/lgtm/workload_alerting.md
checked: '2026-11-11'
commit: 18fd13d793c14676b0fa9f0a3ac74f689d615831
sources:
- repo: kube-state-metrics
  path: docs/metrics/workload/deployment-metrics.md
  lines: 9-14
  ref: origin/main
  commit: 5e7546610118ae5fc9cd20ad7b053bbfe6a21de7
- repo: kube-state-metrics
  path: docs/metrics/workload/statefulset-metrics.md
  lines: 8-12
  ref: origin/main
  commit: 5e7546610118ae5fc9cd20ad7b053bbfe6a21de7
- repo: kube-state-metrics
  path: docs/metrics/workload/horizontalpodautoscaler-metrics.md
  lines: 16-17
  ref: origin/main
  commit: 5e7546610118ae5fc9cd20ad7b053bbfe6a21de7
- repo: kube-state-metrics
  path: docs/developer/cli-arguments.md
  lines: '66'
  ref: origin/main
  commit: 5e7546610118ae5fc9cd20ad7b053bbfe6a21de7
- repo: kubernetes-mixin
  path: alerts/apps_alerts.libsonnet
  lines: 100-125
  ref: origin/master
  commit: 909cdb0f39b735c8da772f41e02c1be4317418f4
- repo: kubernetes-mixin
  path: alerts/apps_alerts.libsonnet
  lines: 362-398
  ref: origin/master
  commit: 909cdb0f39b735c8da772f41e02c1be4317418f4
- repo: kubernetes-mixin
  path: alerts/resource_alerts.libsonnet
  lines: 105
  ref: origin/master
  commit: 909cdb0f39b735c8da772f41e02c1be4317418f4
- repo: kubernetes-mixin
  path: alerts/resource_alerts.libsonnet
  lines: 255-275
  ref: origin/master
  commit: 909cdb0f39b735c8da772f41e02c1be4317418f4
- repo: prometheus
  path: docs/configuration/alerting_rules.md
  lines: 42-47
  ref: v3.16.0
  commit: e2e28adeee2c5883d000fc82aca6008cfbf7e96d
- repo: prometheus
  path: docs/configuration/unit_testing_rules.md
  lines: 174-186
  ref: v3.16.0
  commit: e2e28adeee2c5883d000fc82aca6008cfbf7e96d
unpinned: 2
---

# docs/monitoring/lgtm/workload_alerting.md

## Findings

- L9 IMPRECISE corrigé : `tested_with` annonce Prometheus 3.15, la v3.16.0 est sortie le 2026-11-05. Les règles et le test passent à l'identique avec le `promtool` 3.16.0 (exécutés dans `prom/prometheus:v3.16.0`), donc passer à "Prometheus 3.16 (promtool)" ou garder 3.15 si c'est bien la version utilisée. Preuve : docs/configuration/alerting_rules.md:42-47 @ v3.16.0
- L193-200 IMPRECISE corrigé : la sortie `promtool test rules` montrée est `SUCCESS`, la 3.16.0 imprime d'abord `Processing test file: workload.test.yml`. Ajouter cette ligne ou couper l'exemple de sortie. Preuve : exécution `promtool test rules workload.test.yml` avec `prom/prometheus:v3.16.0`, nom de fichier du bloc L147.
- L64 IMPRECISE corrigé : le mixin a aussi `KubeHpaReplicasMismatch` (L368, `for: 15m`), l'équivalent exact de `HpaStuckBelowDesired`. Le paragraphe L86 ne cite que `KubeHpaMaxedOut`, on peut mentionner l'alerte jumelle. Preuve : alerts/apps_alerts.libsonnet:362-368 @ origin/master

Vérifié et correct : noms et labels `kube_deployment_spec_replicas`, `kube_deployment_status_replicas_unavailable`, `kube_statefulset_replicas`, `kube_statefulset_status_replicas_ready`, `kube_horizontalpodautoscaler_status_{current,desired}_replicas` (label `horizontalpodautoscaler`), `--metric-labels-allowlist` et `label_team` ; `KubeDeploymentReplicasMismatch` (spec > available et `changes(..._updated[10m]) == 0`, `for: 15m`) ; `KubeHpaMaxedOut` (current == max, max != min, `ScalingLimited` vrai, 15m, warning) ; `CPUThrottlingHigh` (severity info, 25 %, 15m) ; description de `keep_firing_for` ; `promtool check rules` ("3 rules found") et `promtool test rules` verts sur les règles et les 2 cas de test extraits tels quels ; le bloc Alertmanager passe `amtool check-config`.

## Unpinned

- L68 le contrôleur HPA réécrit `spec.replicas` du Deployment à chaque décision de scale (comportement Kubernetes core, non relu dans le code).
- L92 un conteneur avec une limit CPU est throttlé dès qu'il consomme tout son quota CFS (comportement noyau, non relu).
