---
description: "Alerting Strimzi Kafka : prédiction de remplissage disque avec predict_linear, lag MirrorMaker 2, échecs de reconciliation de l'opérateur, redémarrages des brokers, partitions under-replicated et offline, pièges de labels."
tags:
  - Strimzi
  - Kafka
  - Prometheus
  - Alerting
variables:
  - name: cluster
    default: my-cluster
---

# Alerting Strimzi : disque, MirrorMaker 2, reconciliation et brokers

Sur une flotte Kafka, les règles Prometheus d'exemple de Strimzi donnent des pages pour rien à chaque rolling update d'un côté et un disque plein sans avertissement de l'autre : `for: 10s` sur presque toutes les alertes, un seuil disque fixe à 15 %, rien sur le lag de MirrorMaker 2 ni sur les échecs de reconciliation. On part de ces règles upstream pour dire ce qu'elles couvrent, puis on ajoute les alertes qui manquent (prédiction de remplissage disque, lag de MirrorMaker 2, échecs de reconciliation, redémarrages de brokers) avec leurs pièges.

L'article voisin sur le [rollout d'un composant Strimzi](rollout_strimzi.md) couvre le redémarrage manuel. Celui-ci ne traite que de ce qui doit sonner.

## Ce que Strimzi fournit

Le repo upstream livre ses règles dans `packaging/examples/metrics/prometheus-install/prometheus-rules/` et celles basées sur kube-state-metrics dans `packaging/examples/metrics/kube-state-metrics/prometheus-rules.yaml`. On les lit une fois en entier avant d'écrire les nôtres.

- `prometheus-kafka-rules.yaml` : `KafkaRunningOutOfSpace`, `UnderReplicatedPartitions`, `AbnormalControllerState`, `OfflinePartitions`, `UnderMinIsrPartitionCount`, `OfflineLogDirectoryCount`, `ScrapeProblem`, `KafkaNodeContainersDown`, `KafkaContainerRestartedInTheLast5Minutes`
- `prometheus-mirrormaker2-rules.yaml` : uniquement `MirrorMaker2ContainerDown`
- `prometheus-strimzi-cluster-operator-rules.yaml` et `prometheus-strimzi-entity-operator-rules.yaml` : le conteneur de l'opérateur, du topic operator et du user operator est absent
- `prometheus-kafka-exporter-topic-rules-group.yaml` : `UnderReplicatedPartition`, `TooLargeConsumerGroupLag`, `NoMessageForTooLong`, qui demandent Kafka Exporter
- `kube-state-metrics/prometheus-rules.yaml` : `*NotReady`, `*Warnings` et `*Deprecated` pour la plupart des CRDs (`Kafka`, `KafkaTopic`, `KafkaUser`, `KafkaConnect`, `KafkaMirrorMaker2`...), avec `for: 15m` (`1h` pour `KafkaRebalanceProposalPending` et `KafkaRebalanceRebalancing`)

Le PodMonitor `kafka-resources-metrics` ne scrape que les pods dont le label `strimzi.io/kind` vaut `cluster-operator`, `Kafka`, `KafkaConnect` ou `KafkaMirrorMaker2`. Le entity operator (topic et user operator) a son propre PodMonitor, qui sélectionne sur `app.kubernetes.io/name: entity-operator`, et il en existe un autre pour le bridge. Le `Prometheus` d'exemple ne les sélectionne que s'ils portent `app: strimzi` (`podMonitorSelector`). Il ne charge que les `PrometheusRule` portant `role: alert-rules` et `app: strimzi` (`ruleSelector`). Un PodMonitor ou une règle sans ces labels est ignoré sans aucune erreur.

## Vérifier les labels avant de copier une règle

Les règles upstream joignent des séries de plusieurs origines. La jointure repose sur des labels que seul le PodMonitor upstream pose. Le bloc `relabelings` de `kafka-resources-metrics.yaml` transforme les labels de pod `strimzi.io/*` en `strimzi_io_*` et écrit le nom du pod dans `kubernetes_pod_name`.

Ensuite `KafkaRunningOutOfSpace` fait un `label_replace` sur le nom du PVC pour retrouver le pod, puis un `and on(namespace,pod)` avec `up{strimzi_io_component_type="kafka"}`. Si le scrape passe par un autre PodMonitor ou un ServiceMonitor sans ces relabelings, `kubernetes_pod_name` n'existe pas, la jointure ne renvoie rien et l'alerte ne se déclenche jamais, sans que rien ne signale l'erreur.

On vérifie donc les labels réellement présents avant de copier une règle :

```console
$ curl -s 'http://prometheus:9090/api/v1/series' \
    --data-urlencode 'match[]=up{strimzi_io_component_type="kafka"}' \
  | jq '.data[0]'
```

Une série vide veut dire que toutes les règles qui filtrent sur `strimzi_io_component_type` sont mortes. Il vaut mieux réécrire le PodMonitor pour qu'il pose les labels attendus que patcher chaque règle.

### Le nom de release de l'opérateur

Le chart Helm de l'opérateur pose `release: {{ .Release.Name }}` sur le `Deployment`, mais pas sur les pods : leurs labels sont `name: strimzi-cluster-operator` et `strimzi.io/kind: cluster-operator`. Un sélecteur sur `release=<nom>` pour retrouver l'opérateur ne peut donc matcher que le `Deployment` (par exemple via `kube_deployment_labels`, si kube-state-metrics expose ce label), jamais les séries `container_*` ou `up` d'un pod.

Pour les règles sur l'opérateur, on sélectionne sur `container="strimzi-cluster-operator"` (comme upstream) et pas sur un label de release. De même, le `Prometheus` d'une stack comme kube-prometheus-stack ne charge que les `PrometheusRule` dont les labels matchent son `ruleSelector` : renommer la release de cette stack, sans toucher aux `PrometheusRule`, les fait disparaître en silence.

## Prédire le remplissage du disque

Un seuil fixe sur l'espace libre prévient trop tard sur un gros volume et trop tôt sur un petit. `predict_linear` ajuste une droite sur une fenêtre et donne la valeur attendue dans N secondes. On alerte donc quand le volume sera plein dans les prochaines heures, quelle que soit sa taille.

La règle suivante lit `kubelet_volume_stats_available_bytes`, filtre sur les PVC de données du cluster `<cluster>` (le regex upstream `data(-[0-9]+)?-(.*)` couvre le préfixe `data-` et le préfixe indexé `data-<n>-` des volumes JBOD) et prédit 24h d'avance sur une fenêtre de 6h :

```yaml
groups:
  - name: kafka-disk
    rules:
      - alert: KafkaDiskFullPredicted
        expr: |
          (
            kubelet_volume_stats_available_bytes{persistentvolumeclaim=~"data(-[0-9]+)?-<cluster>-.+"}
              / kubelet_volume_stats_capacity_bytes{persistentvolumeclaim=~"data(-[0-9]+)?-<cluster>-.+"} < 0.30
          )
          and
          (
            predict_linear(kubelet_volume_stats_available_bytes{persistentvolumeclaim=~"data(-[0-9]+)?-<cluster>-.+"}[6h], 24 * 3600) < 0
          )
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "PVC {{ $labels.persistentvolumeclaim }} will be full within 24h"
```

La condition `< 0.30` limite l'alerte aux volumes déjà bien remplis. Sans elle, un volume à 90 % libre qui perd 5 % par heure pendant un test de charge (soit plus de 100 % en 24h, donc une prédiction négative) déclenche une page qui ne sert à personne. Le `for: 1h` évite de sonner sur un pic de rétention (un `log.segment.bytes` qui roule, un reassign de partitions).

Le nom du cluster se règle dans la barre de variables au-dessus de l'article. On regarde les noms réels avec `kubectl get pvc -n my-namespace` avant de le figer.

### Les pièges de predict_linear

- La fenêtre décide de tout. Sur 1h, un reassign de partitions qui copie 200 Go fait croire à un remplissage imminent. Sur 6h à 24h, la pente lisse ce genre d'événement mais réagit lentement à un vrai changement de régime.
- La rétention coupe la droite : un broker qui supprime des segments par paliers donne une courbe en dents de scie. La régression linéaire sur une fenêtre plus courte qu'un cycle de rétention surestime la pente.
- Un volume qui ne reçoit plus rien (pente nulle ou positive) ne sonne jamais, c'est voulu. L'alerte d'espace libre fixe de 15 % d'upstream reste utile en filet de sécurité.
- Les séries `kubelet_volume_stats_*` viennent du kubelet et leur présence dépend du driver de stockage. Une règle sans série ne se déclenche pas, donc on vérifie qu'elles existent pour chaque cluster.

## Repérer quel broker a redémarré

L'alerte `KafkaContainerRestartedInTheLast5Minutes` compte, avec `container_last_seen` sur une sous-requête de 5 minutes, si le nombre de séries a plus que doublé. C'est une heuristique qui dépend de la résolution de scrape et qui ne sait pas dire quel broker a redémarré.

Une règle plus lisible s'appuie sur les restarts de conteneur de kube-state-metrics :

```yaml
- alert: KafkaBrokerRestarted
  expr: |
    increase(kube_pod_container_status_restarts_total{container="kafka"}[30m]) > 0
  labels:
    severity: warning
  annotations:
    summary: "Broker {{ $labels.pod }} restarted in the last 30m"
```

Cette règle ne voit que les restarts de conteneur dans le même pod : OOMKill, liveness qui échoue. Lors d'un rolling update déclenché par l'opérateur (changement de config, renouvellement de certificat), le roller supprime le pod et attend un nouvel UID : la série du pod recréé repart de 0 et `increase(...[30m]) > 0` ne se déclenche pas. Un pod évincé puis recréé n'est pas vu non plus.

## Partitions under-replicated et offline

Les 4 règles upstream sur la santé de la réplication et du controller sont correctes sur le fond, mais leur `for: 10s` pose problème.

- `UnderReplicatedPartitions` (`kafka_server_replicamanager_underreplicatedpartitions > 0`) devient > 0 pendant tout rolling restart, le temps que le broker revenu rattrape les autres.
- `UnderMinIsrPartitionCount` (`kafka_server_replicamanager_underminisrpartitioncount > 0`) est un compte de partitions. Le roller refuse de redémarrer un broker si l'ISR tomberait sous `min.insync.replicas`, tant que le RF est supérieur à `min.insync.replicas`. Un rollout normal ne le déclenche donc pas : s'il sonne, c'est un vrai signal. Avec un RF égal à `min.insync.replicas`, le roller ne protège rien et il sonne à chaque rollout.
- `OfflinePartitions` (`kafka_controller_kafkacontroller_offlinepartitionscount > 0`) et `AbnormalControllerState` (`activecontrollercount != 1`) signalent une perte de disponibilité réelle. Une élection de controller pendant un rolling restart peut toutefois faire passer `AbnormalControllerState` un court instant.

Pendant un rolling update légitime, `UnderReplicatedPartitions` sonne forcément. Avec `for: 10s`, chaque rollout produit une page. On monte le `for` au-dessus de la durée normale de rattrapage d'un broker (plus les partitions sont grosses, plus c'est long) et on garde un `for` court sur `OfflinePartitions`, `AbnormalControllerState` et `UnderMinIsrPartitionCount`.

On ajoute aussi des alertes sur l'état des CRDs avec les règles kube-state-metrics upstream (`KafkaNotReady` après 15 minutes) : un cluster dont la condition `Ready` passe à `False` est souvent un problème que les métriques JMX ne montrent pas.

## Alerter sur les échecs de reconciliation

Les alertes upstream sur l'opérateur ne regardent que son conteneur. Un opérateur vivant mais incapable de réconcilier (certificat, quota, ressource verrouillée, version de Kafka non supportée) n'est signalé nulle part.

L'opérateur expose ses propres compteurs, définis dans `MetricsHolder` : `strimzi_reconciliations_total`, `strimzi_reconciliations_successful_total`, `strimzi_reconciliations_failed_total`, `strimzi_reconciliations_locked_total`, `strimzi_reconciliations_periodical_total`, ainsi que `strimzi_reconciliations_duration_seconds_max` et la jauge `strimzi_resources`. Ils portent les labels `kind` et `namespace` (`MetricsUtils`), plus `selector` quand l'opérateur est configuré avec des labels de sélection. Le PodMonitor d'exemple n'a pas `honorLabels` : on vérifie sur son scrape si le label est `namespace` ou `exported_namespace` avant de copier les règles ci-dessous.

```yaml
- alert: StrimziReconciliationFailing
  expr: |
    sum by (kind, namespace) (increase(strimzi_reconciliations_failed_total[30m])) > 0
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Strimzi {{ $labels.kind }} reconciliation failing in {{ $labels.namespace }}"
```

Le compteur d'échecs n'est créé qu'à la première erreur : la première erreur après un redémarrage de l'opérateur naît à 1 et `increase()` ne la voit pas. Un échec isolé est normal (un conflit de ressource, une API qui répond mal) : la reconciliation suivante réussit. Le `for: 15m` sur un `increase` de 30 minutes ne garde que les échecs qui se répètent. Pour un opérateur avec peu de ressources, on compare plutôt aux succès :

```yaml
- alert: StrimziNoSuccessfulReconciliation
  expr: |
    sum by (kind, namespace) (increase(strimzi_reconciliations_successful_total[1h])) == 0
    and
    sum by (kind, namespace) (strimzi_resources) > 0
  for: 30m
  labels:
    severity: warning
```

Une reconciliation qui n'obtient pas son verrou incrémente `strimzi_reconciliations_locked_total` et pas `..._failed_total`. Un `locked_total` qui monte en continu indique donc une reconciliation bloquée par une précédente qui n'a pas fini, typiquement un rolling update coincé, que l'alerte sur l'état `Ready` du CRD voit en parallèle.

## Alerter sur le lag de MirrorMaker 2

Upstream ne livre que `MirrorMaker2ContainerDown`. Un MirrorMaker 2 qui tourne mais qui prend du retard ne sonne pas, alors que c'est la panne qui compte : la région cible sert des données périmées.

L'exemple de config `kafka-mirror-maker-2-metrics.yaml` exporte via le JMX exporter les métriques du `MirrorSourceConnector` (labels `source`, `target`, `topic`, `partition`) et du `MirrorCheckpointConnector`. Les dashboards upstream utilisent `kafka_connect_mirror_mirrorsourceconnector_record_age_ms_max`, `..._replication_latency_ms_max`, `..._record_rate` et `kafka_connect_mirror_mirrorcheckpointconnector_checkpoint_latency_ms`.

```yaml
- alert: MirrorMaker2ReplicationLagHigh
  expr: |
    max by (source, target) (kafka_connect_mirror_mirrorsourceconnector_replication_latency_ms_max) > 60000
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "MirrorMaker 2 {{ $labels.source }} to {{ $labels.target }} lags by more than 60s"
```

Le seuil de 60 secondes est un exemple à caler sur l'usage réel de la réplication (reprise après sinistre, agrégation analytique). Le `max by (source, target)` écrase les labels `topic` et `partition`, qui multiplient les séries et font vite exploser la cardinalité sur un cluster à milliers de partitions. Si on garde `topic`, on le fait sur une allowlist de topics.

2 pièges à connaître :

- Ces métriques n'apparaissent que si le `KafkaMirrorMaker2` a une `metricsConfig`. Avec `type: jmxPrometheusExporter`, elle pointe sur cette ConfigMap. Avec `type: strimziMetricsReporter`, aucune ConfigMap n'est nécessaire et les noms `kafka_connect_mirror_*` sont les mêmes. Sans `metricsConfig`, la règle ne renvoie rien et ne sonne pas.
- Une latence ne dit rien d'un connecteur qui ne réplique plus rien. On alerte aussi sur `sum by (source, target) (kafka_connect_mirror_mirrorsourceconnector_record_rate) == 0` pendant une durée où les topics source reçoivent du trafic (sans le `sum by`, chaque partition au repos déclenche une alerte) ou sur le `KafkaMirrorMaker2NotReady` de kube-state-metrics.

## Les valeurs upstream à changer

Les règles d'exemple de Strimzi sont des illustrations, pas des valeurs de production. Celles qu'on revoit en premier :

| Alerte | Valeur upstream | Pourquoi la changer |
|---|---|---|
| `for` sur les alertes de réplication | `10s` | un rolling update légitime passe par un état under-replicated |
| `KafkaRunningOutOfSpace` | `< 15` % libre | prévient trop tard sur un gros volume, remplacé par `predict_linear` plus un filet fixe |
| `TooLargeConsumerGroupLag` | `> 1000` messages | 1000 messages n'ont aucun sens sans le débit du topic |
| `ScrapeProblem` | `up == 0` pendant 3m | filtre `namespace!~"openshift-.+"`, à retirer ou adapter hors OpenShift |
| `*NotReady` des CRDs | `for: 15m` | raisonnable, on le garde |

## Vérifier avant de déployer

Un `promtool` en local attrape la syntaxe mais pas les labels manquants :

```console
$ promtool check rules kafka-disk.yaml
Checking kafka-disk.yaml
  SUCCESS: 1 rules found
```

On teste ensuite les règles sur des séries réelles dans l'UI Prometheus (onglet Graph) : on lance chaque `expr` sans la comparaison finale et on vérifie qu'elle renvoie des séries pour chaque cluster. Une règle qui renvoie un vecteur vide ne sonnera jamais, comme une jointure sur `kubernetes_pod_name` absent.
