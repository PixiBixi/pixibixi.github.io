---
article: docs/kubernetes/deployment/node_local_dns.md
checked: '2026-11-11'
commit: 73d4e651e9ea1807d738dba9f675f101469d6a0d
sources:
- repo: kubernetes-sigs-node-local-dns
  path: cmd/node-cache/main.go
  lines: 86-87
  ref: 1.27.2
  commit: 489f16d74f49aca92600b4d5ab6a7c4c2a95990c
- repo: kubernetes-sigs-node-local-dns
  path: cmd/node-cache/app/metrics.go
  lines: 50-55,294-298
  ref: 1.27.2
  commit: 489f16d74f49aca92600b4d5ab6a7c4c2a95990c
- repo: kubernetes-sigs-node-local-dns
  path: cmd/node-cache/app/cache_app.go
  lines: 120-133,169-171,235-241
  ref: 1.27.2
  commit: 489f16d74f49aca92600b4d5ab6a7c4c2a95990c
- repo: kubernetes-sigs-node-local-dns
  path: cmd/node-cache/app/configmap.go
  lines: 98-111
  ref: 1.27.2
  commit: 489f16d74f49aca92600b4d5ab6a7c4c2a95990c
- repo: kubernetes
  path: cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
  lines: 57-101
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/kubelet/network/dns/dns.go
  lines: 328-343
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes-website
  path: content/en/docs/tasks/administer-cluster/nodelocaldns.md
  lines: 28-52,100-128,155-180
  ref: origin/HEAD
  commit: 046490c1d62376745f23c37eeed62e9065a9f107
- repo: kubernetes-website
  path: content/en/docs/concepts/services-networking/dns-pod-service.md
  lines: 312-341
  ref: origin/HEAD
  commit: 046490c1d62376745f23c37eeed62e9065a9f107
- repo: coredns
  path: plugin/plugin.go
  lines: 157
  ref: v1.14.7
  commit: 427fc80ed9ca47f354585eb30a3f1332950856c4
- repo: coredns
  path: plugin/forward/README.md
  lines: 159-175
  ref: v1.14.7
  commit: 427fc80ed9ca47f354585eb30a3f1332950856c4
- repo: coredns
  path: plugin/forward/metrics.go
  lines: 11-17
  ref: v1.14.7
  commit: 427fc80ed9ca47f354585eb30a3f1332950856c4
- repo: coredns
  path: plugin/cache/README.md
  lines: 130-137
  ref: v1.15.0
  commit: a6fde3fe339c6ec848447e11cc9796be8c97b4e0
unpinned: 8
---

# docs/kubernetes/deployment/node_local_dns.md

## Findings

- L22 IMPRECISE corrigé : "Le cache interroge `kube-dns` en TCP pour ses misses" n'est vrai que pour les noms du cluster (`cluster.local`, `in-addr.arpa`, `ip6.arpa`). Le bloc `.:53`, qui sert les noms externes, forwarde vers `/etc/resolv.conf` du pod node-cache (UDP, ou les `upstreamNameservers` du ConfigMap kube-dns), pas vers `kube-dns`. Reformuler en "les misses des noms du cluster partent en TCP vers `kube-dns`, les noms externes vont vers le resolver amont du node". Preuve : cluster/addons/dns/nodelocaldns/nodelocaldns.yaml:66-67,78-79,89-90 (`force_tcp` vers `__PILLAR__CLUSTER__DNS__`) et :99-100 (`forward . __PILLAR__UPSTREAM__SERVERS__`, sans `force_tcp`) @ origin/master ; cmd/node-cache/app/configmap.go:102-107 @ 1.27.2 ; doc Kubernetes nodelocaldns.md:30-31 "will query the CoreDNS service for cache misses of cluster hostnames".
- L120 IMPRECISE corrigé : "La doc Kubernetes montre un `ndots:2` qui remplace le `ndots:5` par défaut" est inexact : l'exemple de la doc (`dnsPolicy: "None"`) produit `options ndots:2 edns0`, il n'y a pas de `ndots:5` à remplacer. Le remplacement d'un `ndots:5` généré par `ClusterFirst` est bien réel, mais il vient du kubelet (l'option du `dnsConfig` écrase celle de même nom). Citer plutôt le comportement du kubelet. Preuve : pkg/kubelet/network/dns/dns.go:328-343 (`optionsMap[op.Name] = *op.Value`) @ origin/master ; dns-pod-service.md:339-340 @ origin/HEAD.

Vérifié sans écart : défaut `nf_conntrack_udp_timeout` 30 s et 3 retries + 10 s (nodelocaldns.md:44-51), règles NOTRACK du trafic pod vers cache (cache_app.go:120-133), IPVS vs iptables et `--cluster-dns` (nodelocaldns.md:110-126), flags `--prometheus-listen-address :9253` et `--metrics-listen-address 0.0.0.0:9353` (main.go:86-87), métrique `coredns_nodecache_setup_errors_total` et ses 5 valeurs d'`errortype` (metrics.go:50-55, cache_app.go:169-171,235,241, configmap.go), buckets `ExponentialBuckets(0.00025, 2, 16)` donc `le="0.128"` valide (plugin.go:157), `coredns_cache_misses_total` déprécié et séries hits/requests/entries/evictions avec `type` (cache README:130-137), `coredns_proxy_request_duration_seconds` remplaçant `coredns_forward_request_duration_seconds` dès CoreDNS 1.11.0 (forward README:159-175, `plugin/pkg/proxy/metrics.go` absent en v1.10.1, présent en v1.11.0), `coredns_forward_healthcheck_broken_total` conservé sous son nom (forward/metrics.go:11-17 @ v1.14.7), OOMKilled sans nettoyage iptables et 10 000 entrées pour environ 30 Mo (nodelocaldns.md:160-175), noms `kube_daemonset_status_number_ready` et `kube_daemonset_status_desired_number_scheduled` (kube-state-metrics internal/store/daemonset.go:85,139 @ origin/HEAD). Fraîcheur : aucune release node-local-dns après la 1.27.2 (2026-09-30) ni changement de métrique CoreDNS depuis la date de l'article (2026-10-26). Snippets non exécutés (aucun ne se teste hors cluster).

## Unpinned

- L50 GKE : NodeLocal DNSCache activé par défaut en Standard 1.34.1-gke.3720000 et plus, non désactivable sur Autopilot. Lu sur la doc GKE en ligne, sans dépôt ni commit.
- L58 GKE : l'activation recrée tous les nodes en 1.15 et plus, label `addon.gke.io/node-local-dns-ds-ready=true`. Même source.
- L66 GKE : ports 53, 9253, 9353 et 8080 réservés sur le node. Même source.
- L67 GKE : Dataplane V2 sans Cloud DNS, pods `node-local-dns` hors `hostNetwork`, contournement `dnsPolicy: None`. Même source.
- L68 GKE : règle d'egress TCP et UDP 53 vers l'IP du Service `kube-dns` avec une network policy. Même source.
- L69-70 GKE : `stubDomains` et `upstreamServers` en TCP et UDP depuis la 1.18, TTL plafonné à 30 s et 5 s pour NXDOMAIN. Même source (le plafond 30 s / 5 s recoupe `nodelocaldns.yaml:59-61` côté manifest générique).
- L25 : `node-local-dns` tournait déjà pendant l'incident de l'article Cilium conntrack. Affirmation sur un autre article du wiki, non vérifiable depuis une source amont.
