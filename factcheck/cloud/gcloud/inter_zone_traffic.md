---
article: docs/cloud/gcloud/inter_zone_traffic.md
checked: '2026-11-11'
commit: 00aa53e92af2f0d6ad95ffd25875e93c567a8fd0
sources:
  - repo: kubernetes
    path: pkg/features/kube_features.go
    lines: 1832-1836
    ref: v1.36.6
    commit: 1b2171b110bb2a2542e1322035c6583ec86eb976
  - repo: kubernetes-website
    path: content/en/docs/reference/networking/virtual-ips.md
    lines: 599-780
    ref: origin/main
    commit: 4c77b36edb121506e7eb2983777e7c4b49f98ab1
  - repo: kubernetes-website
    path: content/en/docs/concepts/services-networking/topology-aware-routing.md
    lines: 40-52
    ref: origin/main
    commit: 4c77b36edb121506e7eb2983777e7c4b49f98ab1
  - repo: kubernetes-website
    path: content/en/docs/concepts/services-networking/service.md
    lines: 1015-1040
    ref: origin/main
    commit: 4c77b36edb121506e7eb2983777e7c4b49f98ab1
  - repo: kubernetes-website
    path: content/en/docs/tasks/access-application-cluster/create-external-load-balancer.md
    lines: 118-130
    ref: origin/main
    commit: 4c77b36edb121506e7eb2983777e7c4b49f98ab1
  - repo: strimzi-kafka-operator
    path: CHANGELOG.md
    lines: 3-9
    ref: 1.0.0
    commit: 4836c7dd74ce973f06d97936916ed7f20c1a2ff0
  - repo: strimzi-kafka-operator
    path: api/src/main/java/io/strimzi/api/kafka/model/common/Rack.java
    lines: 29-58
    ref: 1.0.0
    commit: 4836c7dd74ce973f06d97936916ed7f20c1a2ff0
  - repo: strimzi-kafka-operator
    path: cluster-operator/src/main/java/io/strimzi/operator/cluster/model/KafkaBridgeConfigurationBuilder.java
    lines: 289-292
    ref: 1.0.0
    commit: 4836c7dd74ce973f06d97936916ed7f20c1a2ff0
  - repo: strimzi-kafka-operator
    path: cluster-operator/src/main/java/io/strimzi/operator/cluster/model/KafkaMirrorMaker2Connectors.java
    lines: 172-174
    ref: 1.0.0
    commit: 4836c7dd74ce973f06d97936916ed7f20c1a2ff0
  - repo: strimzi-kafka-operator
    path: documentation/api/io.strimzi.api.kafka.model.kafka.KafkaClusterSpec.adoc
    lines: 240-260
    ref: 1.0.0
    commit: 4836c7dd74ce973f06d97936916ed7f20c1a2ff0
unpinned: 9
---

# docs/cloud/gcloud/inter_zone_traffic.md

## Findings

- L55 IMPRECISE corrigé : "Cette limite est un constat sur nos clusters et pas une phrase de la doc". La doc de cost allocation liste les SKUs supportés (vCPU, RAM, GPU, disque persistant, Cloud TPU) et définit `goog-k8s-unsupported-sku` pour les SKUs non supportés, donc le réseau en est absent de façon documentée. Reformuler en "la doc ne liste que le compute et le stockage, et le label `goog-k8s-unsupported-sku` marque le reste", en gardant le conseil de re-tester. Preuve : <https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations> (page lue le 2026-11-11, pas de commit)

Les autres affirmations vérifiées sont exactes. Kubernetes : `PreferSameTrafficDistribution` alpha en 1.33, beta par défaut en 1.34, GA verrouillé en 1.35, `PreferClose` déprécié, repli cluster-wide sans endpoint dans la zone, `PreferSameNode` puis zone puis cluster, `Local` prioritaire sur `trafficDistribution`, annotation `topology-mode: Auto` prioritaire sur `trafficDistribution`, 3 endpoints par zone avec une probabilité de l'ordre de 50 % de repli, répartition au CPU allouable, second hop de `Cluster`, IP source préservée avec `Local`. Preuve : pkg/features/kube_features.go:1832-1836 @ v1.36.6, content/en/docs/reference/networking/virtual-ips.md:711-780 @ origin/main, content/en/docs/concepts/services-networking/topology-aware-routing.md:40-52 @ origin/main, content/en/docs/tasks/access-application-cluster/create-external-load-balancer.md:118-130 @ origin/main. Strimzi : `v1beta2` retirée des CRDs en 1.0.0, `topology-label` valeur par défaut, `client.rack` posé via `rack` sur Connect, MirrorMaker 2 et Bridge, `RackAwareReplicaSelector` côté brokers. Preuve : CHANGELOG.md:3-9 @ 1.0.0, api/src/main/java/io/strimzi/api/kafka/model/common/Rack.java:29-58 @ 1.0.0, cluster-operator/src/main/java/io/strimzi/operator/cluster/model/KafkaBridgeConfigurationBuilder.java:289-292 @ 1.0.0. Tarification GCP : 0,01 $/GiB en liste (donc 0,009 $ effectif plausible), gratuit en intra-zone entre IP internes, tout trafic vers une IPv4 externe "quitte la zone", tarif inter-zone dans un même VPC et tarif Internet entre 2 VPC. Preuve : <https://docs.cloud.google.com/vpc/network-pricing> (page lue le 2026-11-11, pas de commit). Champs des flow logs (`src_instance.region/zone`, `dest_instance.zone`, `dest_location.region`, `src_gke_details.cluster.cluster_name` et `pod.pod_namespace`, `connection.dest_ip`, `reporter`, `bytes_sent` extrapolé) : <https://docs.cloud.google.com/vpc/docs/about-flow-logs-records> (page lue le 2026-11-11, pas de commit).

## Unpinned

- Les noms de SKU `Network Inter Zone Data Transfer Out` et `Network Intra Zone Data Transfer`, non vérifiés dans le catalogue billing.
- Le SKU porté par le projet de la VM qui envoie, et le nom des tables d'export `gcp_billing_export_resource_v1_*`, non relus dans la doc billing.
- Le quota `QueryUsagePerUserPerDay` de BigQuery et le contournement par `--project_id`, non vérifiés.
- L'appartenance des IP à `cloud.json` et non à `goog.json`, et le reverse DNS `*.bc.googleusercontent.com`, non revérifiés (les plages publiées changent).
- Le nom de table `compute_googleapis_com_vpc_flows_YYYYMMDD` créée par le sink, non relu dans la doc Logging.
- Les chiffres de terrain (85 % du SKU, 3 régions, 15 % du pod à pod, 670 pods, taux d'échantillonnage 0,001, dizaines de TiB par jour) : observations propres à une flotte, invérifiables.
- La corrélation entre le volume vers les IP externes et le SKU inter-zone, déjà présentée comme une déduction dans l'article.
- Les services Private Service Connect et peering comme leviers pour un accès par IP interne, non vérifiés dans la doc.
- Le comportement de la requête flow logs de la variante pod à pod, que l'article dit lui-même ne pas avoir exécutée.
