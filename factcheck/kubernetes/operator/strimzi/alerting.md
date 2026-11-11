---
article: docs/kubernetes/operator/strimzi/alerting.md
checked: '2026-11-11'
commit: 118ee6019897ffe4fe0f4406872c28dfea07765e
sources:
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/prometheus-rules/prometheus-kafka-rules.yaml
  lines: 1-86
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/prometheus-rules/prometheus-mirrormaker2-rules.yaml
  lines: 1-17
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/prometheus-rules/prometheus-strimzi-cluster-operator-rules.yaml
  lines: 1-17
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/prometheus-rules/prometheus-strimzi-entity-operator-rules.yaml
  lines: 1-26
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/prometheus-rules/prometheus-kafka-exporter-topic-rules-group.yaml
  lines: 1-37
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/kube-state-metrics/prometheus-rules.yaml
  lines: 1-200
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/pod-monitors/kafka-resources-metrics.yaml
  lines: 1-45
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/pod-monitors/entity-operator-metrics.yaml
  lines: 1-20
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/prometheus-install/prometheus.yaml
  lines: 56-75
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: helm-charts/helm3/strimzi-kafka-operator/templates/060-Deployment-strimzi-cluster-operator.yaml
  lines: 1-40
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: operator-common/src/main/java/io/strimzi/operator/common/metrics/MetricsHolder.java
  lines: 32-64
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: operator-common/src/main/java/io/strimzi/operator/common/metrics/MetricsUtils.java
  lines: 95-107
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: cluster-operator/src/main/java/io/strimzi/operator/cluster/operator/assembly/AbstractOperator.java
  lines: 515-537
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/kafka-mirror-maker-2-metrics.yaml
  lines: 38-44
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/kafka-mirror-maker-2-metrics.yaml
  lines: 204-226
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: packaging/examples/metrics/strimzi-metrics-reporter/kafka-mirror-maker-2-metrics.yaml
  lines: 38-39
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: cluster-operator/src/main/java/io/strimzi/operator/cluster/operator/resource/KafkaAvailability.java
  lines: 99-135
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: cluster-operator/src/main/java/io/strimzi/operator/cluster/operator/resource/kubernetes/PodOperator.java
  lines: 60-90
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: cluster-operator/src/main/java/io/strimzi/operator/cluster/model/VolumeUtils.java
  lines: 470-476
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: strimzi-kafka-operator
  path: CHANGELOG.md
  lines: 329-336
  ref: origin/main
  commit: 80f73e5b2f4d84e97a1b1c8b08b8e1810a2fef48
- repo: kafka
  path: connect/mirror/src/main/java/org/apache/kafka/connect/mirror/MirrorSourceMetrics.java
  lines: 37-136
  ref: origin/trunk
  commit: a3ee9beeade8d7579a18a86fce002609285eb656
unpinned: 7
---

# docs/kubernetes/operator/strimzi/alerting.md

## Findings

- L104 ERROR corrigé : "Un rolling update déclenché par l'opérateur fait redémarrer tous les brokers à la suite, donc l'alerte sonne N fois" est faux pour `KafkaBrokerRestarted`. Le roller supprime le pod et attend un nouvel UID, le pod recréé a un nouveau label `uid` dans `kube_pod_container_status_restarts_total` et repart de 0, donc `increase(...[30m]) > 0` ne se déclenche pas (vérifié avec un `promtool test rules`, aucune alerte sur le changement d'`uid`). La règle ne voit que les restarts de conteneur dans le même pod (OOMKill, liveness). Un nœud évincé recrée aussi le pod, donc il n'est pas vu non plus. Corriger la phrase, retirer le conseil de `group_by` lié aux rollouts, et dire que cette règle ne couvre pas les restarts du roller. Preuve : cluster-operator/src/main/java/io/strimzi/operator/cluster/operator/resource/kubernetes/PodOperator.java:60-90 @ origin/main
- L110 et L113 ERROR corrigé : "`UnderMinIsrPartitionCount` ... passe à 1 pendant tout rolling restart" et "il passe aussi à 1 pendant un rollout, donc il reçoit le même `for` allongé". Le roller ne redémarre un broker que si l'ISR ne tombe pas sous `min.insync.replicas` (`wouldAffectAvailability` refuse de rouler dans ce cas), donc avec RF > minISR un rollout normal produit de l'under-replicated mais pas d'under-min-ISR. Un `UnderMinIsrPartitionCount` pendant un rollout est un vrai signal, il doit garder un `for` court. Seul le cas RF <= minISR (déjà sans marge) le déclenche. Par ailleurs la métrique est un compte de partitions, pas "1". Preuve : cluster-operator/src/main/java/io/strimzi/operator/cluster/operator/resource/KafkaAvailability.java:99-135 @ origin/main
- L54 OUTDATED corrigé : "avec ZooKeeper, ses PVC `data-my-cluster-zookeeper-<n>` matchent aussi ce regex". Le support des clusters Kafka basés sur ZooKeeper a été retiré de Strimzi en 0.46.0, la dernière version est 1.3.1 (1.4.0 en cours sur main). Retirer l'incise ZooKeeper ou la dater. Preuve : CHANGELOG.md:329-333 @ origin/main
- L26 IMPRECISE corrigé : "Les PodMonitors upstream ne scrapent que les pods dont le label `strimzi.io/kind` vaut `cluster-operator`, `Kafka`, `KafkaConnect` ou `KafkaMirrorMaker2`". Le PodMonitor du entity operator (topic et user operator) sélectionne sur `app.kubernetes.io/name: entity-operator` et celui du bridge existe aussi. Le `Prometheus` d'exemple a de plus `serviceMonitorSelector: {}` (tous les ServiceMonitors). Reformuler en "le PodMonitor de `kafka-resources-metrics` ne scrape que ...". Preuve : packaging/examples/metrics/prometheus-install/pod-monitors/entity-operator-metrics.yaml:7-14 @ origin/main
- L121 à L131 IMPRECISE corrigé : les métriques de l'opérateur portent bien `kind` et `namespace` à l'exposition, mais le PodMonitor d'exemple du cluster operator n'a ni `honorLabels` ni relabeling : le label `namespace` de l'opérateur (namespace surveillé) entre en conflit avec le label `namespace` de la cible et passe en `exported_namespace`, `namespace` valant alors le namespace du pod de l'opérateur. Les `sum by (kind, namespace)` et `{{ $labels.namespace }}` des 2 règles sont à vérifier sur un scrape réel (comportement `honor_labels: false`, non rejoué ici). Preuve : packaging/examples/metrics/prometheus-install/pod-monitors/cluster-operator-metrics.yaml:14-16 @ origin/main
- L134 IMPRECISE corrigé : le compteur `strimzi_reconciliations_failed_total` est créé à la première erreur (`getCounter` paresseux dans `handleResult`), donc après un redémarrage de l'opérateur la toute première erreur d'un `kind` naît à 1 et `increase()` ne la voit pas. Sans conséquence pour le `for: 15m` (les échecs répétés sont vus), à mentionner si on dit "un échec isolé". Preuve : cluster-operator/src/main/java/io/strimzi/operator/cluster/operator/assembly/AbstractOperator.java:515-537 @ origin/main
- L170 IMPRECISE corrigé : "Ces métriques n'apparaissent que si le `KafkaMirrorMaker2` référence une `metricsConfig` pointant sur cette ConfigMap". Vrai pour `type: jmxPrometheusExporter`. L'exemple `strimzi-metrics-reporter` utilise `type: strimziMetricsReporter` sans ConfigMap et les dashboards associés lisent les mêmes noms `kafka_connect_mirror_*`. Ajouter l'alternative. Preuve : packaging/examples/metrics/strimzi-metrics-reporter/kafka-mirror-maker-2-metrics.yaml:38-39 @ origin/main

Vérifié sans écart : liste des alertes de `prometheus-kafka-rules.yaml` (L20), `MirrorMaker2ContainerDown` seule (L21), alertes cluster/entity operator limitées aux conteneurs (L22), alertes de `prometheus-kafka-exporter-topic-rules-group.yaml` (L23), `*NotReady`/`*Warnings`/`*Deprecated` avec `for: 15m` et `1h` pour `KafkaRebalanceProposalPending` et `KafkaRebalanceRebalancing` (L24), `podMonitorSelector` `app: strimzi` et `ruleSelector` `role: alert-rules` + `app: strimzi` (L26), relabelings de `kafka-resources-metrics.yaml` (L30), `label_replace` et `and on(namespace,pod)` de `KafkaRunningOutOfSpace` et regex `data(-[0-9]+)?-(.*)` (L32, L54), `release` sur le Deployment seulement et labels de pod `name` et `strimzi.io/kind` (L46), 15 % de seuil fixe (L85, L180), heuristique de `KafkaContainerRestartedInTheLast5Minutes` (L90), `for: 10s` de réplication et controller (L108-111), noms des compteurs de `MetricsHolder`, labels `kind`, `namespace`, `selector` (L121), `locked_total` incrémenté sans `failed_total` (L147), noms des métriques MirrorSourceConnector et labels (L153), `ScrapeProblem` `3m` et filtre `openshift-` (L182), valeurs du tableau (L177-183). Les 5 blocs `yaml` passent `promtool check rules`.

## Unpinned

- L48 : `PrometheusRule` ignoré par kube-prometheus-stack si la release change (`ruleSelector` basé sur le label `release`), comportement du chart, non lu.
- L52 : sémantique de `predict_linear` (régression linéaire sur la fenêtre, valeur dans N secondes), doc Prometheus, non épinglée.
- L111 : `AbnormalControllerState` peut passer un court instant pendant une élection de controller lors d'un rolling restart, comportement non rejoué.
- L121 : suffixes Micrometer côté Prometheus (`_total`, `_duration_seconds_max`), dépend du registre, déduit des noms `strimzi.reconciliations.*` sans scrape réel.
- L46 : `kube_deployment_labels` n'expose le label `release` que si kube-state-metrics l'autorise (`--metric-labels-allowlist`), formulé avec une réserve dans l'article, non vérifié.
- L84 : effet d'une fenêtre de rétention sur la pente de `predict_linear`, raisonnement non épinglé.
- L86 : la présence des séries `kubelet_volume_stats_*` dépend du driver de stockage, comportement du kubelet et des CSI, non épinglé.
