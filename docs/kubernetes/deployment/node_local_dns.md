---
description: "NodeLocal DNSCache sur Kubernetes et GKE : conntrack UDP, charge sur kube-dns, amplification ndots:5, activation avec gcloud, métriques CoreDNS (cache hit ratio, latence), tuning de ndots via dnsConfig et règles d'alerting SLI DNS."
tags:
  - DNS
  - CoreDNS
  - GKE
  - Prometheus
---

# NodeLocal DNSCache : conntrack, ndots, mesure et alerting SLI

Sur un cluster dont les workloads résolvent beaucoup de noms externes, le DNS finit par s'afficher partout : des timeouts de 5 secondes qui n'ont l'air de rien, des pods `kube-dns` saturés alors que les applications ne font que des appels HTTP, une table conntrack qui se remplit d'entrées UDP vers le port 53. Un cache DNS par node règle la plupart de ces symptômes, à condition de savoir ce qu'il ne règle pas et de le mesurer. Sur GKE, NodeLocal DNSCache est un add-on qui se mesure avec quelques métriques CoreDNS, se complète d'un tuning de `ndots` et s'accompagne de règles d'alerting qui servent de SLI DNS.

## Les 3 coûts d'un DNS sans cache local

Avec un `dnsPolicy: ClusterFirst`, un pod envoie ses requêtes à l'IP du Service `kube-dns`, que kube-proxy (ou le dataplane eBPF) traduit en l'IP d'un pod CoreDNS. D'après la [doc Kubernetes sur NodeLocal DNSCache](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/), ce chemin pose 3 problèmes :

- chaque requête UDP traverse un DNAT et crée une entrée conntrack, qui ne disparaît qu'au timeout (`nf_conntrack_udp_timeout` vaut 30 secondes par défaut). Les pods qui font le plus de DNS remplissent la table du node avec des entrées d'une seule requête. Les [races conntrack](https://github.com/kubernetes/kubernetes/issues/56903) sur les paquets UDP font en plus perdre des réponses
- le pod CoreDNS visé peut être sur un autre node, donc chaque résolution paie un aller-retour réseau
- un paquet UDP perdu se paie en timeout côté client, avec des retries qui peuvent monter jusqu'à 30 secondes dans le pire cas décrit par la doc (3 retries et 10 secondes de timeout)

NodeLocal DNSCache fait tourner un CoreDNS en mode cache sur chaque node, en DaemonSet. Les pods parlent à ce cache local, sans DNAT ni conntrack sur ce segment. Le cache interroge `kube-dns` en TCP pour ses misses. Une connexion TCP libère son entrée conntrack à la fermeture au lieu d'attendre un timeout.

!!! warning "Un cache DNS ne corrige pas un conntrack saturé"
    Seul le trafic DNS des pods vers leur cache local échappe au conntrack. Le reste du trafic du node continue de le remplir : `node-local-dns` tournait déjà sur chaque node pendant un incident de table conntrack pleine sous Cilium.

## L'amplification ndots:5

Un multiplicateur important de requêtes DNS se trouve dans le `/etc/resolv.conf` du pod. Pour un pod du namespace `my-namespace`, la doc Kubernetes ([DNS pour Services et Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)) donne ce contenu :

```text
search my-namespace.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

Le resolver traite un nom comme relatif tant qu'il contient moins de `ndots` points : il essaie alors chaque suffixe de la liste `search` avant de tenter le nom tel quel. Un `api.example.com` n'a que 2 points, donc il passe d'abord par les 3 suffixes du cluster, qui répondent NXDOMAIN, puis par le nom absolu. Comme les libc envoient en général un A et un AAAA, une résolution externe devient 8 requêtes au lieu de 2 (davantage si les `search` du node s'ajoutent à la liste).

Le symptôme se lit dans le taux de NXDOMAIN de CoreDNS, qui monte quand les applications appellent surtout des noms externes. Cette requête donne la part de NXDOMAIN sur les 5 dernières minutes (le `job` dépend de la scrape config).

```promql
sum(rate(coredns_dns_responses_total{job="node-local-dns", rcode="NXDOMAIN"}[5m]))
/
sum(rate(coredns_dns_responses_total{job="node-local-dns"}[5m]))
```

Le cache local absorbe ces requêtes inutiles sans les faire disparaître, alors que le tuning de `ndots` (section dédiée plus bas) les supprime à la source.

## Activer NodeLocal DNSCache sur GKE

Sur GKE, c'est un add-on géré. D'après la [doc GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/nodelocal-dns-cache), il est activé par défaut sur les clusters Standard en 1.34.1-gke.3720000 et plus récent (désactivable) ainsi que sur Autopilot, où on ne peut pas le désactiver. Sur un cluster Standard plus ancien, on l'active avec :

```bash
gcloud container clusters update prod-europe-west4 \
  --location=europe-west4 \
  --update-addons=NodeLocalDNS=ENABLED
```

Sur un cluster existant, l'activation recrée tous les nodes (en 1.15 et plus récent), ce qui peut perturber les workloads en cours et prendre du temps sur un gros cluster. GKE pose lui-même le label `addon.gke.io/node-local-dns-ds-ready=true` sur les nodes. On vérifie ensuite que le DaemonSet a un pod par node :

```bash
kubectl -n kube-system get pods -o wide | grep node-local-dns
```

Quelques points de la doc GKE à garder en tête :

- les pods écoutent sur les ports 53, 9253, 9353 et 8080 du node : un pod en `hostNetwork` ou un `hostPort` qui prend l'un d'eux provoque des erreurs DNS
- avec GKE Dataplane V2 (sans Cloud DNS), les pods `node-local-dns` ne sont pas en `hostNetwork`. Un pod en `hostNetwork` avec `ClusterFirstWithHostNet` peut alors timeout vers le DNS du cluster, le contournement documenté étant `dnsPolicy: None` avec un `dnsConfig` explicite
- avec une network policy (hors Cloud DNS et Dataplane V2), il faut autoriser en egress le TCP et l'UDP 53 vers l'IP du Service `kube-dns`
- les `stubDomains` et `upstreamServers` du ConfigMap `kube-dns` sont repris par le cache, en TCP et en UDP depuis GKE 1.18 : le serveur DNS visé doit répondre sur les 2 protocoles
- la page indique un TTL de cache plafonné à 30 secondes, avec 5 secondes pour les NXDOMAIN

Hors GKE, l'installation passe par le manifest `nodelocaldns.yaml` de la doc Kubernetes. En kube-proxy IPVS, le cache n'écoute que sur son adresse locale et il faut changer `--cluster-dns` du kubelet, alors qu'en iptables il écoute aussi sur l'IP du Service `kube-dns` et rien ne change côté pods.

## Mesurer ce que ça change

Le cache est un CoreDNS, donc toutes ses métriques existent par node. Dans le code de node-local-dns, le flag `--prometheus-listen-address` vaut `:9253` par défaut : c'est l'endpoint des métriques CoreDNS, à scraper comme n'importe quel DaemonSet (un `PodMonitor` ou une annotation selon la stack). Les séries qui comptent viennent de la [doc du plugin cache](https://coredns.io/plugins/cache/) et du plugin metrics de CoreDNS.

### Cache hit ratio

`coredns_cache_requests_total` compte toutes les requêtes qui passent par le cache et `coredns_cache_hits_total` celles servies sans interroger l'amont, avec un label `type` valant `success` ou `denial`. Le ratio global sur 5 minutes se calcule ainsi.

```promql
sum(rate(coredns_cache_hits_total{job="node-local-dns"}[5m]))
/
sum(rate(coredns_cache_requests_total{job="node-local-dns"}[5m]))
```

`coredns_cache_misses_total` est déprécié dans le README du plugin, qui conseille de dériver les misses des 2 compteurs précédents. Un ratio bas n'est pas un incident, il indique que les noms résolus changent trop pour que le cache serve ou que les TTL sont courts. On regarde aussi `coredns_cache_entries` et `coredns_cache_evictions_total` pour voir si la capacité est le facteur limitant.

### Latence vue par les pods

`coredns_dns_request_duration_seconds` est un histogramme dont les buckets vont de 0,25 ms à 8 secondes en doublant (`ExponentialBuckets(0.00025, 2, 16)` dans le code de CoreDNS). Le p99 sur 5 minutes, tous nodes confondus, donne la latence réellement subie par les pods.

```promql
histogram_quantile(0.99,
  sum by (le) (rate(coredns_dns_request_duration_seconds_bucket{job="node-local-dns"}[5m]))
)
```

La latence côté cache se compare à celle des pods `kube-dns` en amont, dont la métrique est la même. Si le p99 du cache suit celui de `kube-dns`, les misses dominent et c'est l'amont qu'il faut regarder. Les durées de forward se lisent dans `coredns_proxy_request_duration_seconds{to}`, qui remplace `coredns_forward_request_duration_seconds` à partir de CoreDNS 1.11.0 : une flotte mixte doit matcher les 2 noms.

### Conntrack côté node

L'effet attendu est la disparition des entrées UDP 53 vers `kube-dns`. On les compte sur un node, avant et après l'activation (avec Cilium, les entrées vivent dans une map eBPF).

```bash
conntrack -L -p udp --dport 53 2>/dev/null | wc -l
```

### Mesure applicative

Pour confirmer le gain de bout en bout, on lance 2 fois la même résolution depuis un pod de debug. La première remplit le cache, la seconde doit répondre depuis le cache local avec un `Query time` plus court.

```bash
kubectl -n my-namespace exec debug -- dig +noall +stats example.com
```

## Tuner ndots avec dnsConfig

Réduire `ndots` supprime les requêtes de search qui répondent NXDOMAIN. Le champ `dnsConfig.options` d'un pod est fusionné avec les options générées par la `dnsPolicy`. La doc Kubernetes montre un `ndots:2` qui remplace le `ndots:5` par défaut. Cet exemple fixe `ndots` à 2 sur un Deployment qui appelle surtout des noms externes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      dnsConfig:
        options:
          - name: ndots
            value: "2"
      containers:
        - name: app
          image: registry.example.com/my-app:1.0.0
```

Un nom de moins de `ndots` points passe toujours par la liste `search`. Avec `ndots:2`, `api.example.com` est tenté en absolu d'abord, mais `my-svc.other-ns` (1 point) suit encore la liste de search et reste résolu. Un nom comme `my-svc.other-ns.svc` (2 points) est lui tenté en absolu avant la search list : il finit par marcher, au prix d'une requête NXDOMAIN de plus.

2 alternatives évitent de toucher aux pods :

- écrire les noms externes avec un point final (`api.example.com.`), qui les rend absolus quel que soit `ndots`
- appeler les services du cluster par leur nom complet (`my-svc.my-namespace.svc.cluster.local.`)

On tune par workload, pas globalement : un `ndots` bas casse les noms courts de services qu'une application utilise peut-être sans qu'on le sache. Après le changement, la part de NXDOMAIN de la requête vue plus haut doit baisser, ce qui valide la modification.

## Alerting : SLI DNS

Les règles ci-dessous sont des valeurs de départ à recalibrer sur la distribution réelle du cluster, pas des seuils mesurés. Elles couvrent la disponibilité du DaemonSet, les erreurs de setup du node-cache, la latence, le taux de SERVFAIL et la santé de l'amont. Les métriques `kube_daemonset_*` viennent de kube-state-metrics, `coredns_nodecache_setup_errors_total` du code de [node-local-dns](https://github.com/kubernetes-sigs/node-local-dns) (label `errortype`, valeurs `iptables`, `iptables_lock`, `interface_add`, `interface_check` et `configmap`). Cette dernière série vient du serveur de métriques de node-cache, dont le flag `--metrics-listen-address` vaut `0.0.0.0:9353` par défaut : il faut scraper les ports 9253 et 9353.

```yaml
groups:
  - name: node-local-dns
    rules:
      - record: dns:nodelocal_cache_hit_ratio:rate5m
        expr: |
          sum(rate(coredns_cache_hits_total{job="node-local-dns"}[5m]))
          /
          sum(rate(coredns_cache_requests_total{job="node-local-dns"}[5m]))

      - alert: NodeLocalDNSPodsNotReady
        expr: |
          kube_daemonset_status_number_ready{namespace="kube-system", daemonset="node-local-dns"}
          /
          kube_daemonset_status_desired_number_scheduled{namespace="kube-system", daemonset="node-local-dns"}
          < 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Less than 95% of node-local-dns pods are ready"
          description: "Pods without a ready node-local-dns cannot resolve names, or fall back to kube-dns."

      - alert: NodeLocalDNSSetupErrors
        expr: |
          sum by (pod, errortype) (increase(coredns_nodecache_setup_errors_total{job="node-local-dns"}[15m])) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "node-local-dns {{ $labels.pod }} fails its network setup ({{ $labels.errortype }})"
          description: "The node-cache could not maintain its iptables rules, interface or ConfigMap sync."

      - alert: NodeLocalDNSLatencySLOBurn
        expr: |
          sum(rate(coredns_dns_request_duration_seconds_bucket{job="node-local-dns", le="0.128"}[5m]))
          /
          sum(rate(coredns_dns_request_duration_seconds_count{job="node-local-dns"}[5m]))
          < 0.99
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Less than 99% of DNS requests answered within 128ms"
          description: "{{ $value | humanizePercentage }} of requests served by node-local-dns finish under 128ms."

      - alert: NodeLocalDNSServfailRatioHigh
        expr: |
          sum(rate(coredns_dns_responses_total{job="node-local-dns", rcode="SERVFAIL"}[5m]))
          /
          sum(rate(coredns_dns_responses_total{job="node-local-dns"}[5m]))
          > 0.01
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "node-local-dns SERVFAIL ratio at {{ $value | humanizePercentage }}"
          description: "The upstream (kube-dns or the node resolver) fails to answer cache misses."

      - alert: NodeLocalDNSUpstreamHealthcheckBroken
        expr: |
          sum by (pod) (rate(coredns_forward_healthcheck_broken_total{job="node-local-dns"}[5m])) > 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "node-local-dns {{ $labels.pod }} sees every upstream as unhealthy"
          description: "All forward targets failed their healthcheck, cache misses cannot be resolved."
```

Quelques remarques sur ces règles :

- les 2 ports de scrape doivent porter le même label `job`, sinon les filtres `job="node-local-dns"` ne voient qu'une partie des séries
- le seuil `le="0.128"` correspond à une borne réelle de l'histogramme (0,00025 fois 2 puissance 9) : un `le` qui n'est pas une borne ne renvoie aucune série
- `NodeLocalDNSPodsNotReady` est la plus importante. D'après la doc Kubernetes, un `node-local-dns` OOMKilled ne nettoie pas ses règles iptables : les requêtes du node sont dirigées vers un pod local en panne tant qu'il n'a pas redémarré
- `coredns_forward_healthcheck_broken_total` est le nom de la doc du plugin forward, qui garde ce compteur sous cet ancien nom même après la bascule vers `coredns_proxy_*` pour les durées
- un SLI de bout en bout, mesuré depuis un pod avec une sonde `dig` régulière, complète ces règles : elles regardent le cache, pas ce que voit l'application quand le cache est cassé

## Voir aussi

- [Mémoire du cache local](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/#setting-memory-limits) : la doc recommande de mesurer le pic avant de poser une limite, le cache par défaut de 10 000 entrées pouvant occuper environ 30 Mo par server block
