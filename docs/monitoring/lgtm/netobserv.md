---
description: "NetObserv sans Loki sur Kubernetes : FlowCollector et agent eBPF, FlowMetric d'egress internet par namespace, subnet labels, sampling et son coût, comparaison avec cAdvisor, warnings du webhook, alerting Manual de la console et dashboard."
tags:
  - NetObserv
  - eBPF
  - Kubernetes
  - FinOps
  - Prometheus
  - Networking
tested_with:
  - "NetObserv operator 2.0.1"
  - "GKE Dataplane V2"
---

# NetObserv sans Loki : egress internet par namespace, FlowMetric, sampling et coût

Une facture d'egress se paye à la destination, internet, autre région ou services Google, alors que les métriques Kubernetes sortent par pod ou par namespace sans dire où vont les octets. cAdvisor donne le volume émis mais pas la classe de destination et le compteur du CNI qu'on avait sous la main (`pod_flow_egress_flows_count` sur GKE Dataplane V2) compte des flows et pas des octets, avec une destination `world` qui inclut aussi les IP privées du VPC. NetObserv comble ce trou avec un agent eBPF qui observe chaque interface et un processor qui enrichit les flows (namespace, workload, classe de subnet) avant de les exposer en métriques Prometheus.

Le déploiement décrit ici est metrics-only (sans Loki ni console OpenShift) et tourne sur un cluster de dev d'une vingtaine de nodes. On y trouve le FlowCollector, la FlowMetric d'egress internet par namespace, le coût du sampling, la vérification contre cAdvisor et les pièges rencontrés (admission policy, warnings, alerting Manual, dashboard). Le côté facture est dans [Network tiers GCP](../../cloud/gcloud/network_tiers.md).

## Les 3 composants

L'operator installe 3 CRD : `FlowCollector` (une seule instance, qui doit s'appeler `cluster`), `FlowMetric` et `FlowCollectorSlice`, qui délègue une partie de la config par namespace et ne sert pas ici. Il déploie ensuite 2 workloads :

- l'agent eBPF, un DaemonSet dans le namespace `<namespace>-privileged`, avec `hostNetwork: true` en dur dans le code de l'operator (« HostNetwork needed for TC programs »)
- flowlogs-pipeline (FLP), le processor, qui enrichit les flows et génère les métriques. En mode `Service` c'est un Deployment derrière un Service et l'operator crée un `ServiceMonitor` quand la CRD prometheus-operator existe

Sans Loki, il n'y a ni flows bruts ni vue par pod dans la console et les vues par IP disparaissent. Les métriques Prometheus restent entières, ce qui suffit pour du showback.

## Installer le chart en metrics-only

Le chart `netobserv-operator` embarque en option un Prometheus et un Loki (`install.prom-stack`, `install.loki`), tous les deux à `false` par défaut. Les values qui comptent pour un déploiement sans Loki :

```yaml title="values.yaml"
# Chart netobserv-operator 2.0.1
certManager:
  # false uniquement sans trust-manager : les certificats de l'operator sont alors à fournir
  enable: false
install:
  prom-stack: false
  loki: false
```

Sous Argo CD, 2 options de sync sont nécessaires. La CRD `flowcollectors` pèse environ 490 Ko, au-delà de la limite de 256 Ko de l'annotation `last-applied` du client-side apply, d'où `ServerSideApply=true`. Les `FlowCollector` et `FlowMetric` arrivent dans la même Application que leurs CRD, d'où `SkipDryRunOnMissingResource=true` en annotation de chaque CR et un sync-wave plus tardif que celui du chart.

## Le FlowCollector

Le FlowCollector ci-dessous est celui du cluster de dev, sans les listes de CIDR. Le `sampling: 1` y est volontaire (voir plus bas) et la section `loki` désactive le stockage des flows.

```yaml title="flowcollector.yml"
apiVersion: flows.netobserv.io/v1beta2
kind: FlowCollector
metadata:
  name: cluster
  annotations:
    argocd.argoproj.io/sync-wave: "10"
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
spec:
  namespace: netobserv
  deploymentModel: Service
  agent:
    type: eBPF
    ebpf:
      sampling: 1
      cacheActiveTimeout: 15s
      cacheMaxFlows: 120000
      excludeInterfaces:
        - lo
      privileged: false
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          memory: 800Mi
      advanced:
        env:
          TC_ATTACH_MODE: tcx
          TCX_ATTACH_ANCHOR_INGRESS: head
          TCX_ATTACH_ANCHOR_EGRESS: head
  processor:
    clusterName: my-cluster
    consumerReplicas: 2
    service:
      tlsType: Disabled
    metrics:
      includeList:
        - node_egress_bytes_total
    subnetLabels:
      autoDetect: false
      customLabels: []  # voir la section suivante
  loki:
    enable: false
  consolePlugin:
    enable: false
  prometheus:
    querier:
      enable: false
```

Les points à connaître :

- `deploymentModel: Service` est le défaut. `Direct` fait écouter FLP en `hostNetwork` sur chaque node et le webhook de l'operator avertit dès 15 nodes (`The number of nodes is bigger than the recommendation for deployment model "Direct"`). `Kafka` est le modèle des gros clusters
- `cacheActiveTimeout: 15s` et `cacheMaxFlows: 120000` sont les valeurs par défaut du CRD. Les augmenter réduit le CPU et le trafic de l'agent au prix de plus de mémoire et de latence
- `TC_ATTACH_MODE: tcx` est le défaut de l'agent, avec une ancre `none` qui insère en général le programme à la fin de la chaîne. Sous Cilium (Dataplane V2) on l'a passé en `head` pour s'exécuter avant les programmes de Cilium sur les interfaces des pods, en partant du principe que ces programmes terminent la chaîne et qu'un programme en queue ne verrait pas le trafic des pods
- `tlsType: Disabled` entre agent et processor est un choix de PoC, le trafic reste dans le cluster. Le défaut est `Auto`
- `includeList` remplace la liste des métriques générées par défaut. `additionalIncludeList` ajoute à cette liste, les 2 sont exclusifs et `includeList` gagne

## Classer les destinations avec les subnet labels

NetObserv ne sait pas ce qu'est « internet ». Il pose un label sur chaque IP source et destination selon `subnetLabels` et une destination sans label est externe au cluster. Le CRD demande que les subnets externes portent le préfixe `EXT:` ou aucun label, pour que les quick filters et les exemples de métriques fonctionnent. `autoDetect` (qui remplace `openShiftAutoDetect`, déprécié) dépend du vendor. Sur GKE on le coupe et on déclare à la main les plages du cluster.

L'ordre de la liste compte, FLP parcourt les labels dans l'ordre et s'arrête au premier CIDR qui contient l'IP. La plage de services par défaut de GKE (`34.118.224.0/20`) ressemble à une plage publique, il faut donc la déclarer dans `cluster` avant toute classe externe.

```yaml title="flowcollector.yml (extrait)"
spec:
  processor:
    subnetLabels:
      autoDetect: false
      customLabels:
        - name: cluster
          cidrs:
            - "10.20.0.0/22"      # nodes
            - "10.24.0.0/14"      # pods
            - "34.118.224.0/20"   # services (plage par défaut de GKE)
        - name: private
          cidrs:
            - "10.0.0.0/8"
            - "172.16.0.0/12"
            - "192.168.0.0/16"
            - "100.64.0.0/10"
            - "169.254.0.0/16"    # metadata server
        - name: "EXT:google-api-vip"
          cidrs:
            - "199.36.153.4/30"   # restricted.googleapis.com
            - "199.36.153.8/30"   # private.googleapis.com
        - name: "EXT:gcp"
          cidrs:
            - "34.35.0.0/16"      # extrait de cloud.json
        - name: "EXT:google"
          cidrs:
            - "142.250.0.0/15"    # extrait de goog.json
```

Les plages `EXT:gcp` (IP des clients de GCP, `cloud.json`) et `EXT:google` (toutes les plages Google, `goog.json`) sont publiées par Google. Le second fichier contient en principe le premier, d'où `EXT:gcp` avant `EXT:google`. Elles pèsent ensemble plus d'un millier de lignes de CIDR, un script les régénère plutôt que de les maintenir à la main.

Les classes obtenues sont `cluster`, `private`, `EXT:google-api-vip`, `EXT:gcp`, `EXT:google`, auxquelles s'ajoute le trafic sans label, qui est l'internet.

## Une FlowMetric d'egress internet par namespace

Une `FlowMetric` génère une métrique FLP à partir des flows, avec ses labels et ses filtres. Celle-ci compte les octets envoyés par les pods d'un namespace vers internet, sans label de destination.

```yaml title="flowmetrics.yml"
apiVersion: flows.netobserv.io/v1alpha1
kind: FlowMetric
metadata:
  name: namespace-internet-egress-bytes
  namespace: netobserv
spec:
  metricName: namespace_internet_egress_bytes_total
  help: Bytes sent by pods to destinations billed as internet egress, per source namespace
  type: Counter
  valueField: Bytes
  direction: Egress
  labels:
    - SrcK8S_Namespace
  remap:
    SrcK8S_Namespace: src_namespace
  filters:
    - field: SrcK8S_Namespace
      matchType: Presence
    - field: DstSubnetLabel
      matchType: Absence
    - field: DstSubnetLabel
      matchType: Equal
      value: "EXT:gcp"
---
# Contrôle de biais : tout ce qui sort du cluster, par classe de destination
apiVersion: flows.netobserv.io/v1alpha1
kind: FlowMetric
metadata:
  name: namespace-external-egress-bytes
  namespace: netobserv
spec:
  metricName: namespace_external_egress_bytes_total
  type: Counter
  valueField: Bytes
  direction: Egress
  labels:
    - SrcK8S_Namespace
    - DstSubnetLabel
  remap:
    SrcK8S_Namespace: src_namespace
    DstSubnetLabel: dst_class
  filters:
    - field: SrcK8S_Namespace
      matchType: Presence
    - field: DstSubnetLabel
      matchType: NotEqual
      value: cluster
---
# Contrôle de justesse : tout ce que les pods envoient, quelle que soit la destination
apiVersion: flows.netobserv.io/v1alpha1
kind: FlowMetric
metadata:
  name: namespace-total-egress-bytes
  namespace: netobserv
spec:
  metricName: namespace_total_egress_bytes_total
  type: Counter
  valueField: Bytes
  direction: Egress
  labels:
    - SrcK8S_Namespace
  remap:
    SrcK8S_Namespace: src_namespace
  filters:
    - field: SrcK8S_Namespace
      matchType: Presence
```

Ce que disent le CRD et le code de FLP :

- Prometheus préfixe le nom par `netobserv_` : la série est `netobserv_namespace_internet_egress_bytes_total`. Une `FlowMetric` doit être créée dans le namespace de `spec.namespace` du FlowCollector
- `remap` renomme `SrcK8S_Namespace` en `src_namespace`, pour ne pas entrer en collision avec le label `namespace` que Prometheus pose sur la cible scrapée
- `direction: Egress` équivaut à un filtre `FlowDirection` sur `1|2`, donc il inclut les flows « inner » entre pods d'un même node
- les filtres sur des champs différents se cumulent en ET, ceux qui portent sur le même champ se combinent en OU (`For a given key, all related filters are OR'ed`). La première métrique compte donc `DstSubnetLabel` absent OU égal à `EXT:gcp`
- `NotEqual` est la négation de `Equal` et `Equal` renvoie `false` quand le champ manque. Les flows sans label sont donc gardés par `NotEqual cluster` et internet apparaît dans la 2e métrique avec `dst_class=""`

Chaque label multiplie la cardinalité. La colonne `Cardinality` de `kubectl get flowmetric` et la condition `CardinalityWarning` donnent un premier retour et la requête suivante, tirée de la doc amont, liste le nombre de séries par métrique NetObserv.

```promql
count({__name__=~"netobserv.*"}) by (__name__)
```

### EXT:gcp est facturé comme internet

La première version de la métrique ne comptait que les flows sans label. En recoupant avec le billing export sur une fenêtre de plusieurs heures, le node qui héberge un subnet router VPN concentrait presque tout l'egress internet facturé du projet de dev : 6,68 GiB facturés en « Internet Data Transfer Out » contre 1,62 GiB vus vers internet et 2,45 GiB vers `EXT:gcp`. Le trafic vers une IP externe de GCP est donc très probablement facturé comme de l'egress internet et `EXT:gcp` entre dans la métrique. Un écart d'environ 2,6 GiB reste inexpliqué.

L'export de facturation arrive par paquets, ce qui interdit une comparaison heure par heure. Il faut comparer sur plusieurs heures, avec une fenêtre où NetObserv tournait déjà.

### Une série qui disparaît après un changement de filtres

Après le merge de ce changement de filtres, la série internet a disparu : 0 série, pas une valeur à 0. La config reçue par FLP était correcte (`absence` OU `equal EXT:gcp`) et la FlowMetric `Ready`, alors que la métrique externe continuait de remonter. FLP rechargeait aussi sa config une cinquantaine de fois par heure.

La cause n'est pas confirmée à l'écriture. Quand seuls les filtres d'une métrique changent, `checkMetricUpdate` (`pkg/pipeline/encode/encode_prom.go`) la désenregistre puis la réenregistre, et un échec du `Register` n'y est que loggé : la métrique reste alors désenregistrée. On cherche `error in prometheus.Register` dans les logs de FLP, et un `kubectl rollout restart deploy/flowlogs-pipeline` reconstruit tout à partir de la config actuelle. Après toute modification de filtres, on vérifie que la série existe encore.

## Sampling et coût

Le `sampling` du CRD vaut 50 par défaut, un paquet sur 50 est envoyé et 0 ou 1 échantillonne tous les paquets. Sur le cluster de dev on tourne à 1 : les octets sont alors exacts pour la comparaison avec cAdvisor et la correction du trafic compté 2 fois (voir plus bas) est une soustraction exacte et pas statistique.

Les débits mesurés dépendent du sampling. La doc amont le dit pour les health rules : avec un ratio de 1:100 le trafic réel est environ 100 fois supérieur à ce que rapportent les métriques et la métrique `netobserv_agent_sampling_rate` sert à normaliser. Une recording rule de showback à `sampling: 50` ressemble donc à ceci (on vérifie d'abord que cette série est bien scrapée par ce Prometheus).

```promql
sum by (src_namespace) (rate(netobserv_namespace_internet_egress_bytes_total[5m]))
* scalar(avg(netobserv_agent_sampling_rate > 0))
```

### Le coût noyau ne se voit pas sur le pod

Sur le dev, l'agent reste plat autour de 1m de CPU en médiane et 28 à 60 Mi de mémoire sur une vingtaine de nodes, jusqu'à 2,5k paquets par seconde par node, mais ces chiffres ne s'extrapolent pas. Le programme eBPF tourne dans le chemin du paquet, en principe dans le softirq du noyau, donc son CPU est compté sur le node et pas sur le container de l'agent, qui ne mesure que l'agrégation et l'export en userspace. Sur un cluster où un node dépasse le million de paquets par seconde, c'est ce coût noyau qui décide et un cluster de dev ne le mesure pas.

L'amont donne un ordre de grandeur de dimensionnement, testé avec Loki. Pour 250 nodes, le tableau de la doc de l'operator recommande le sampling par défaut de 50, une limite mémoire de 1600Mi sur l'agent (800Mi par défaut), `Kafka` comme deployment model et 18 replicas de processor. Sur un cluster de cette taille, le mode `Service` à 2 replicas est donc très en dessous de la recommandation. La mémoire de l'agent suit surtout le nombre de flows en cache : des nodes à plus de 200k connexions suivies dépassent `cacheMaxFlows: 120000`, ce qui force des flush anticipés.

Un canary donne de vrais chiffres. On cible quelques nodes avec un `nodeSelector` (autour du p95 de trafic, plus un node très chargé), on garde le sampling à 50 et on compare le softirq des nodes avec et sans agent sur 24 à 48h, avec la latence des applications.

```yaml title="flowcollector.yml (extrait)"
spec:
  agent:
    ebpf:
      sampling: 50
      resources:
        limits:
          memory: 1600Mi
      advanced:
        scheduling:
          nodeSelector:
            example.com/netobserv: canary
```

La comparaison se fait sur le CPU softirq de chaque node.

```promql
rate(node_cpu_seconds_total{mode="softirq"}[5m])
```

## Comparer avec cAdvisor

La mesure se valide avec la 3e FlowMetric, celle qui compte tout l'egress des pods, contre `container_network_transmit_bytes_total`. Le `label_replace` aligne le nom du label de namespace des 2 côtés.

```promql
sum by (src_namespace) (rate(netobserv_namespace_total_egress_bytes_total[5m]))
/ on (src_namespace)
label_replace(
  sum by (namespace) (rate(container_network_transmit_bytes_total[5m])),
  "src_namespace", "$1", "namespace", "(.*)"
)
```

Sur 30 minutes, une fois les pods en `hostNetwork` exclus, les namespaces applicatifs tombent entre 0,99 et 1,03. Quelques autres restent plus bas (0,6 à 0,9 pour certains, 0,43 pour `kube-system`), sans qu'on ait cherché la cause. Deux sources d'écart sont identifiées :

- **Les pods en `hostNetwork`** : cAdvisor voit l'interface du node pour ces pods, on les retire avec le label `host_network` de kube-state-metrics
- **Les nodes sans agent** : leur trafic n'est pas compté et tous les ratios sont sous-estimés

Côté cAdvisor, la requête qui retire ces pods s'écrit ainsi.

```promql
sum by (namespace) (
  rate(container_network_transmit_bytes_total[5m])
  unless on (namespace, pod) kube_pod_info{host_network="true"}
)
```

Le ratio global sur 6h restait bas, autour de 0,3, sans qu'on ait cherché pourquoi. On ne se fie pas au total d'un cluster avant d'avoir tous les agents en place.

### Un agent sur chaque node

Sur le cluster de dev, 2 des 24 pods de l'agent sont restés en `Pending` avec `Insufficient cpu`. Sans `priorityClassName` l'agent passe après les autres pods. Le champ existe côté agent, sous `spec.agent.ebpf.advanced.scheduling.priorityClassName`. GKE refuse `system-node-critical` hors de `kube-system` tant que le namespace n'a pas de ResourceQuota dédiée à cette classe, il en faut donc une dans `<namespace>-privileged`. Une alerte sur `kube_daemonset_status_number_unavailable{daemonset="netobserv-ebpf-agent"} > 0` évite de mesurer sur une flotte incomplète.

### Le trafic masqueradé compte 2 fois

Le trafic qui sort par la NIC du node avec un SNAT apparaît 2 fois : une copie avec l'IP du pod (donc un namespace) et une copie avec l'IP du node (sans namespace). Les métriques par namespace filtrent sur `SrcK8S_Namespace` et ne voient que la 1re. Les métriques `node_*` et `workload_*` doublent en revanche la rafale. Pour corriger les totaux par node, une FlowMetric dédiée compte par node les octets de pods qui sortent du réseau privé et la requête soustrait cette série de celle du node. Cette approche a été relue mais pas encore validée sur le cluster : le test d'acceptation est que, sur le node qui porte le subnet router, node moins pod tombe à 0 sans jamais passer sous 0.

## Comprendre les warnings du FlowCollector

Le `STATUS` du FlowCollector reste `Pending` tant que l'agent ne tourne pas et la colonne `WARNINGS` de `kubectl get flowcollectors` liste ceux du webhook de l'operator. Les 2 qu'on a rencontrés ne bloquent rien.

| Warning | Cause | Correction |
|---|---|---|
| `spec.networkPolicy.enable is ignored because the operator and the operands are running in the same namespace` | le webhook se déclenche dès que le knob est renseigné, même à `false`, quand le FlowCollector est dans le namespace de l'operator | retirer le bloc `networkPolicy`, le seul interrupteur effectif est la value Helm `operator.installNetworkPolicy` |
| `HealthRule ExternalEgressHighTrend/Namespace requires enabling at least one metric from this list` | les health rules par défaut réclament des métriques que `includeList` a exclues | désactiver les règles dans `spec.processor.metrics.disableAlerts` ou réactiver les métriques demandées |

Les health rules par défaut (12 templates, de `PacketDropsByDevice` à `TLSInsecureVersion`) sont converties en `PrometheusRule`, en alertes ou en recording rules selon le `mode`. Avec une `includeList` réduite aux métriques de showback, la plupart n'ont rien à lire : on les désactive plutôt que de réactiver des métriques à cardinalité élevée.

```yaml title="flowcollector.yml (extrait)"
spec:
  processor:
    metrics:
      disableAlerts:
        - ExternalEgressHighTrend
        - ExternalIngressHighTrend
        # puis les autres templates de la liste par défaut
```

Les alertes NetObserv elles-mêmes (`NetObservNoFlows` en tête) se désactivent par le même champ. Pour la partie routage, voir [Alertmanager](alertmanager.md).

### L'admission policy refuse l'agent

Le warning n'était pas le vrai blocage : le DaemonSet de l'agent affichait 0 pod sur 24 et les events `FailedCreate` donnaient `ValidatingAdmissionPolicy '<policy>' ... denied request: hostNetwork is not allowed`. La policy du cluster n'acceptait `hostNetwork` que pour une liste d'images par préfixe et son binding, nommé `audit-...`, était bien en `Deny` sur tous les namespaces sauf `kube-system`. Le label Pod Security `privileged` du namespace de l'agent n'y change rien.

Le sync Argo CD reste vert, puisque l'operator crée le DaemonSet et `helm template` ou la validation des CRD ne passent pas par l'admission. Seul l'event le montre, avec un FlowCollector qui reste dégradé et aucune métrique. La correction est d'ajouter le préfixe `quay.io/netobserv/netobserv-ebpf-agent` à l'allowlist de la policy. FLP en mode `Service` n'utilise pas `hostNetwork` (le helper `UseHostNetwork()` ne renvoie `true` qu'en mode `Direct`), seul l'agent est concerné.

## Visualiser avec la console et Grafana

Pour la console NetObserv, on désactive Loki et on garde Prometheus comme source. En dehors d'OpenShift il n'y a pas de plugin, donc `consolePlugin.standalone: true` et `querier.mode: Auto` ne sait configurer que les vendors connus : sur GKE c'est `Manual`.

```yaml title="flowcollector.yml (extrait)"
spec:
  loki:
    enable: false
  consolePlugin:
    enable: true
    standalone: true
  prometheus:
    querier:
      enable: true
      mode: Manual
      manual:
        url: http://prometheus-operated.monitoring.svc:9090
        alertManager:
          url: http://alertmanager-operated.monitoring.svc:9093
```

Le bloc `alertManager` n'est pas facultatif. En mode `Manual`, l'operator lit `Prometheus.Querier.Manual.AlertManager.URL` sans vérifier que le pointeur est renseigné (`internal/controller/consoleplugin/consoleplugin_objects.go`, toujours présent sur la branche `main` à la rédaction). Sans lui il panique à chaque reconcile et ne déploie jamais la console, alors que l'Application Argo CD est `Synced` et `Healthy`. Le symptôme est une ligne `Observed a panic` dans les logs du controller manager, que `kubectl logs deploy/netobserv-controller-manager | rg -i panic` retrouve.

Une fois déployée, la console s'ouvre par port-forward et on ne l'expose pas : aucune authentification n'est configurée de notre côté.

```bash
# attendu : le pod netobserv-plugin est Running
kubectl -n netobserv get pods -l app=netobserv-plugin
# puis ouvrir http://localhost:9001
kubectl -n netobserv port-forward svc/netobserv-plugin 9001:9001
```

La console construit ses vues à partir des métriques par défaut (node, namespace, workload). Retirer l'`includeList` pour la brancher a ajouté environ 10 000 séries sur un cluster de 24 nodes, surtout des `workload_*`. Les réduire aux seules métriques en octets que la console affiche a fait retomber d'environ 7 000 séries. Sans Loki, plusieurs métriques par défaut passent aussi de `namespace_*` à `workload_*` (les entrées marquées `**` de `Metrics.md`).

### Un dashboard Grafana pour le showback

Aucun dashboard Grafana public n'est utilisable. Le seul JSON de l'amont (`config/samples/dashboards/Network Observability.json`) ne contient aucune métrique `netobserv_*` et les dashboards actuels sont générés par l'operator pour la console, à partir de la section `charts` des FlowMetric. On a donc construit le nôtre, sur le Prometheus du cluster puisque ces séries ne remontaient pas dans Thanos. Il tient en 5 sections :

- **Overview** : débit internet, volume sur la période, part d'internet dans l'egress externe, nodes sans agent
- **Showback** : egress internet par namespace, en top N et en tableau avec la part de chacun
- **Classes de destination** : egress par `dst_class` et un tableau namespace par classe
- **Accuracy** : le ratio NetObserv sur cAdvisor de la section précédente
- **Overhead** : CPU et mémoire de l'agent et de flowlogs-pipeline, flows évincés

La part de chaque namespace se calcule ainsi.

```promql
sum by (src_namespace) (rate(netobserv_namespace_internet_egress_bytes_total[$__rate_interval]))
/ scalar(sum(rate(netobserv_namespace_internet_egress_bytes_total[$__rate_interval])))
```

Sur 6h de dev, internet ne pèse qu'environ 1,1 % de l'egress externe, le reste part vers `EXT:google` (les agents GKE de logging et les drivers CSI qui parlent aux API Google) et vers `private`, ce que le compteur du CNI rangeait en `world`.

## Voir aussi

- [Network tiers GCP](../../cloud/gcloud/network_tiers.md) pour la facture d'egress côté load balancer
- [Alertes de workload Kubernetes](workload_alerting.md) et [Alertmanager](alertmanager.md) pour le routage des health rules
- [Conntrack Cilium](../../kubernetes/troubleshooting/cilium_conntrack.md) quand les nodes dépassent les 100k connexions suivies
- [Metrics.md](https://github.com/netobserv/netobserv-operator/blob/main/docs/Metrics.md) et [HealthRules.md](https://github.com/netobserv/netobserv-operator/blob/main/docs/HealthRules.md) dans le repo de l'operator
