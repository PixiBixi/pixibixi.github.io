---
description: "Trafic inter-zone GKE inexpliqué : retrouver le SKU Network Inter Zone Data Transfer dans l'export billing BigQuery, l'attribuer avec les VPC flow logs puis corriger avec externalTrafficPolicy Local, trafficDistribution PreferSameZone, topology aware routing et rack awareness Kafka."
tags:
  - GKE
  - GCP
  - FinOps
  - Networking
  - BigQuery
---

# Trafic inter-zone GKE : billing, attribution et réduction

Une ligne « Network Inter Zone Data Transfer Out » apparaît sur la facture de plusieurs clusters et personne ne sait quel workload la produit. La GKE cost allocation, activée justement pour ça, n'attribue rien. La cause n'est d'ailleurs pas toujours un défaut de topologie. En suivant le SKU dans l'export billing, en vérifiant si des nœuds se parlent vraiment entre zones puis en attribuant les octets avec les VPC flow logs, on sait si le trafic se corrige côté Kubernetes (routage par zone, rack awareness Kafka) ou s'il est hors de portée.

Le cas Thanos, où tout le trafic entre composants est facturé, a [sa propre section](../../monitoring/lgtm/thanos.md#eviter-le-trafic-inter-zone) et n'est pas repris ici.

## Ce qui est facturé

Sur GCP, un octet qui passe d'une zone à une autre d'une même région est facturé, alors que le même octet échangé dans une zone entre IP internes est gratuit. Le cas des IP externes est traité plus bas. Le SKU se reconnaît à son nom dans l'export billing, `Network Inter Zone Data Transfer Out`. Il est porté par le projet de la VM qui envoie. Sur nos exports, le tarif effectif tournait autour de 0,009 $/GiB, soit un ordre de grandeur de 10 $ le TiB.

Un SKU `Network Intra Zone Data Transfer` existe aussi. Son volume doit coller à celui des flow logs de l'intra-zone, ce qui valide qu'on peut leur faire confiance pour le reste.

!!! warning "Un crédit peut masquer le coût"
    Le net peut valoir 0 parce qu'un crédit de migration ou une promotion compense la ligne. Le coût devient réel à l'expiration du crédit, donc on lit le brut et on additionne `credits` à part.

## Retrouver le SKU dans l'export billing

L'export standard (`gcp_billing_export_v1_*`) suffit pour ventiler par projet, région et jour. Cette requête sort le brut, les crédits et le volume des 30 derniers jours.

```sql
SELECT
  project.id AS project,
  location.region AS region,
  ROUND(SUM(cost), 0) AS gross_cost,
  ROUND(SUM((SELECT IFNULL(SUM(c.amount), 0) FROM UNNEST(credits) c)), 0) AS credits,
  ROUND(SUM(usage.amount_in_pricing_units) / 1024, 1) AS tib
FROM `my-billing-project.billing_dataset.gcp_billing_export_v1_XXXXXX`
WHERE sku.description LIKE '%Inter Zone Data Transfer%'
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY project, region
ORDER BY gross_cost DESC
```

Chez nous, un seul projet de clusters concentrait environ 85 % du SKU, réparti sur 3 régions. Ce déséquilibre désigne 1 flotte, pas un défaut commun à tous les clusters.

Pour descendre à la ressource, il faut l'export détaillé `gcp_billing_export_resource_v1_*`, à activer séparément. La colonne `resource.name` donne alors la VM, puis un `GROUP BY` sur le node pool (via les labels de la VM) désigne les pools qui émettent. Ces tables pèsent vite : on filtre sur `usage_start_time` et sur le SKU avant tout.

!!! tip "Quota BigQuery"
    Les requêtes facturées à un projet déjà proche de son quota `QueryUsagePerUserPerDay` échouent. Les lancer avec `--project_id` d'un projet dédié à la facturation contourne le problème.

## Cost allocation : la limite sur le SKU réseau

Activée sur un cluster, la [cost allocation](https://cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations) ajoute des labels Kubernetes (namespace, workload) aux lignes de l'export détaillé. Pour le SKU réseau, le label `k8s-namespace` valait `goog-k8s-unsupported-sku` : le coût est attribué à la VM nœud et pas au namespace. L'attribution par workload se reconstruit donc ailleurs, avec des flow logs.

La [doc de cost allocation](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations) ne liste que le compute et le stockage, le label `goog-k8s-unsupported-sku` marque le reste. À re-tester sur la version de GKE qu'on tourne.

## Avant les flow logs : où sont les nœuds

Un cluster zonal ou dont tous les nœuds vivent dans 1 zone ne peut pas produire d'inter-zone entre ses propres nœuds. Cette vérification prend 10 secondes et élimine toute une famille d'hypothèses.

```console
$ kubectl get nodes -L topology.kubernetes.io/zone --no-headers | awk '{print $NF}' | sort | uniq -c
    387 europe-west4-a
```

Un cluster mono-zone qui paie quand même de l'inter-zone a 2 explications possibles : un trafic vers une autre zone (service managé, autre cluster régional) ou un trafic que Google compte comme tel sans qu'on le voie. Chez nous, c'était la seconde.

## Attribuer avec les VPC flow logs

Les [VPC flow logs](https://cloud.google.com/vpc/docs/about-flow-logs-records) exportés vers BigQuery donnent source, destination et octets par connexion. Un sink de log vers un dataset BigQuery crée une table par jour, `compute_googleapis_com_vpc_flows_YYYYMMDD`. Deux pièges avant de lire les chiffres :

- le taux d'échantillonnage du sous-réseau (de l'ordre de 0,001 sur les subnets de nœuds chez nous) : `bytes_sent` est déjà extrapolé, ce qu'on a validé en comparant l'intra-zone des flow logs au SKU Intra Zone de la facture
- l'IP source est celle du nœud et pas celle du pod dès qu'un SNAT pod vers nœud intervient, donc le workload ne se lit pas dans le log

Cette requête somme l'egress des clusters vers une destination donnée par jour. Les noms de champs sont ceux du schéma des tables de flow logs.

```sql
SELECT
  jsonPayload.src_instance.region AS src_region,
  jsonPayload.dest_location.region AS dest_region,
  jsonPayload.connection.dest_ip AS dest_ip,
  SUM(SAFE_CAST(jsonPayload.bytes_sent AS INT64)) / POW(1024, 4) AS tib
FROM `my-network-project.vpc_flow_logs_dataset.compute_googleapis_com_vpc_flows_20261008`
WHERE jsonPayload.reporter = 'SRC'
  AND STARTS_WITH(jsonPayload.src_gke_details.cluster.cluster_name, 'prod-')
GROUP BY src_region, dest_region, dest_ip
ORDER BY tib DESC
LIMIT 50
```

Pour le trafic entre pods d'un cluster régional, on ajoute `AND jsonPayload.src_instance.zone != jsonPayload.dest_instance.zone` et on groupe par `jsonPayload.src_gke_details.pod.pod_namespace`. Les champs `zone` de `src_instance` et `dest_instance` font partie du format documenté, mais cette variante n'a pas tourné chez nous.

Pour retrouver le workload quand le log ne donne que le nœud, on regarde ce qui tourne sur les nœuds les plus émetteurs.

```bash
# Expected: the pods scheduled on the node that sends the most bytes
NODE="gke-my-cluster-pool-a-1234"
kubectl get pods -A --field-selector spec.nodeName="$NODE" -o wide
```

Un seul nœud échantillonné par cluster nous a pointé un mauvais workload. Il vaut mieux regarder les 10 à 15 premiers nœuds émetteurs et chercher le déploiement qui les couvre uniformément, par exemple 2 groupes de nœuds portant 670 pods du même service.

## Un cas où ce n'était pas la topologie

Les clusters concernés étaient mono-zone et tous leurs services managés vivaient dans cette zone. Les flow logs montraient pourtant des dizaines de TiB par jour vers des IP externes en `*.bc.googleusercontent.com`, dans la même région. Ces IP sont absentes de `goog.json` (API Google) et présentes dans `cloud.json` (plages louées aux clients GCP) : des VM ou des LB d'autres clients, ici des endpoints partenaires hébergés sur GCE.

Le volume vers ces IP suivait celui du SKU inter-zone, dans les 3 régions, avec le même ordre de grandeur de part et d'autre. La corrélation est forte, mais la [page de pricing](https://cloud.google.com/vpc/network-pricing) ne décrit pas ce cas. Elle précise que tout trafic vers une IPv4 externe « quitte la zone », donc au tarif inter-zone, mais seulement dans un même VPC : entre 2 VPC différents, comme ici, elle annonce le tarif Internet. Le SKU observé reste donc une déduction, à faire confirmer par le support avant de la citer comme acquise.

Aucun réglage Kubernetes n'y change quoi que ce soit, la destination étant chez un tiers. Les leviers sont de regrouper les appels, de compresser ou de demander aux partenaires un accès par IP interne (Private Service Connect, peering) quand ils en proposent un.

## Les coupables dans un cluster multi-zone

Quand les nœuds couvrent 3 zones, un trafic réparti uniformément sans préférence de zone traverse une frontière 2 fois sur 3. Les sources habituelles sont les suivantes :

- Un LoadBalancer en `externalTrafficPolicy: Cluster` : le LB envoie sur n'importe quel nœud puis kube-proxy renvoie ensuite vers un pod qui peut être dans une autre zone. La [doc Kubernetes](https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#preserving-the-client-source-ip) parle d'un second hop vers un autre nœud, qui est ici un hop facturé.
- Un ClusterIP sans préférence de zone : par défaut, le trafic est réparti uniformément sur tous les endpoints du cluster, zones comprises.
- La réplication d'un système stateful réparti sur 3 zones (Kafka, Aerospike, bases) : chaque écriture est dupliquée vers les replicas des autres zones. C'est le prix de la tenue à la panne d'une zone, pas un défaut.
- Les scrapes de monitoring : un Prometheus dans 1 zone qui scrape des pods des 2 autres. Le volume est faible par cible mais constant.
- Les consumers Kafka sans rack awareness, qui lisent par défaut le leader de chaque partition.

Sur la même flotte, le pod à pod entre clusters multi-zones (remote write vers un stack central, pod à pod dans les clusters régionaux) pesait de l'ordre de 15 % du SKU à côté des appels externes.

## Garder le trafic dans la zone

Chaque correctif échange du coût réseau contre un risque de déséquilibre de charge entre zones. On choisit donc par Service.

### externalTrafficPolicy Local

Avec `externalTrafficPolicy: Local`, kube-proxy ne transmet qu'aux endpoints du nœud qui a reçu le paquet. Plus de second hop, l'IP source client est préservée. La [doc](https://kubernetes.io/docs/reference/networking/virtual-ips/#external-traffic-policy) précise le coût : sans endpoint local, le nœud ne forwarde rien pour ce Service. La répartition peut aussi devenir inégale. Sur un Service où `Local` est posé, la policy l'emporte sur `trafficDistribution` pour le trafic externe.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-public
  namespace: my-namespace
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: ingress-public
  ports:
    - name: https
      port: 443
      targetPort: 8443
```

Le LB sonde le `healthCheckNodePort` et n'envoie du trafic qu'aux nœuds qui hébergent un pod prêt. Il faut donc des pods répartis sur les nœuds (DaemonSet ou `topologySpreadConstraints`), sinon on concentre la charge sur quelques nœuds.

### trafficDistribution

`spec.trafficDistribution` exprime une préférence de routage pour le trafic interne. `PreferSameZone` privilégie les endpoints de la zone du client, avec repli sur les autres zones si la zone n'en a aucun. `PreferClose` est l'ancien nom, déprécié dans la doc actuelle. `PreferSameNode` vise le nœud avant la zone, puis la zone, puis tout le cluster. `PreferSameZone` et `PreferSameNode` sont apparus en 1.33 derrière le feature gate `PreferSameTrafficDistribution`, activé par défaut en 1.34 puis stable (verrouillé à `true`) en 1.35 : sur un cluster plus ancien que la 1.34, seul `PreferClose` est garanti. Le dataplane doit aussi les implémenter, on lit donc la doc de la version qu'on tourne.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-backend
  namespace: my-namespace
spec:
  trafficDistribution: PreferSameZone
  selector:
    app: my-backend
  ports:
    - port: 80
      targetPort: 8080
```

La préférence est absolue dès qu'il existe un endpoint dans la zone, donc un backend avec peu de pods dans une zone sature. Les pods doivent être répartis par zone avec `topologySpreadConstraints` puis on surveille la charge par pod après activation.

### Topology aware routing

L'annotation `service.kubernetes.io/topology-mode: Auto` est l'ancienne voie : elle répartit les endpoints entre zones proportionnellement au CPU allouable de chaque zone. La doc demande au moins 3 endpoints par zone : en dessous, la probabilité (de l'ordre de 50 %) que le contrôleur ne sache pas répartir équitablement est élevée. Le routage retombe alors sur le comportement par défaut du cluster. Si l'annotation et `trafficDistribution` sont posés ensemble, l'annotation l'emporte. On préfère `trafficDistribution`, plus prévisible, quand la version le permet.

### Rack awareness Kafka

Un consumer Kafka lit par défaut le leader de chaque partition, quelle que soit sa zone. [Strimzi](https://strimzi.io/docs/operators/latest/configuring.html) documente la voie : `rack` sur le cluster pour que les replicas se répartissent par zone, `replica.selector.class: org.apache.kafka.common.replica.RackAwareReplicaSelector` côté brokers puis `client.rack` côté consumers pour lire le replica le plus proche. Strimzi pose `client.rack` automatiquement sur Kafka Connect, MirrorMaker 2 et le Bridge via leur section `rack`. Le YAML ci-dessous utilise l'API `v1`, la seule servie depuis Strimzi 1.0.0 (la `v1beta2` a été retirée des CRDs). `type: topology-label` est la valeur par défaut, on l'écrit pour la lisibilité. Sans replica dans la rack du consumer, Kafka retombe sur le leader.

```yaml
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: my-cluster
  namespace: my-namespace
spec:
  kafka:
    rack:
      type: topology-label
      topologyKey: topology.kubernetes.io/zone
    config:
      replica.selector.class: org.apache.kafka.common.replica.RackAwareReplicaSelector
```

Les producers écrivent toujours au leader, donc seule la lecture se rapproche. La réplication entre brokers de zones différentes reste facturée : c'est elle qui donne la tolérance à la panne d'une zone. Le suivi des brokers est dans [l'alerting Strimzi](../../kubernetes/operator/strimzi/alerting.md).

## Mesurer le gain

Les tables de billing ont un décalage de quelques heures à 1 jour, donc on compare des jours entiers avant et après le changement, sur la même requête que plus haut, en ramenant le SKU au volume de trafic applicatif. Si le SKU ne baisse pas, on vérifie aussi le CPU par zone, pour s'assurer que le changement n'a pas concentré la charge sur 1 zone.

Pour une facture d'egress Internet, c'est un autre sujet, traité dans [les network tiers GCP](network_tiers.md).
