---
description: "Diagnostiquer une table conntrack eBPF de Cilium pleine sur des nodes à fort taux de connexions : drop CT Map insertion failed, cilium_bpf_map_pressure, intervalle du GC, bpf-ct-global-tcp-max, limites de GKE Dataplane V2 et règles d'alerting Prometheus."
tags:
  - Cilium
  - Conntrack
  - eBPF
  - Prometheus
tested_with:
  - "Cilium 1.18"
---

# Cilium conntrack plein : diagnostic, dimensionnement et alerting

Une table conntrack pleine ne laisse presque aucune trace : les nouvelles connexions échouent par moments, les connexions déjà établies continuent de passer, tandis que les dashboards habituels des nodes restent verts. Avec Cilium, la table qui sature n'est pas celle du kernel que `node-exporter` lit, mais une map eBPF que seul l'agent Cilium expose. On voit ici comment mesurer son remplissage, pourquoi le nettoyage ne suit pas toujours, ce qu'on peut dimensionner quand on gère Cilium soi-même et ce qui reste possible sur un Cilium managé comme GKE Dataplane V2.

## Deux tables conntrack sur le même node

Avec le datapath eBPF, le kernel garde sa table `nf_conntrack` pour le trafic qui passe par netfilter (le trafic des processus du node, par exemple) pendant que Cilium tient en parallèle ses propres tables dans des maps eBPF. Les deux ont leur propre plafond, leur propre nettoyage et leurs propres métriques.

Les maps de Cilium qui nous intéressent sont, d'après `pkg/maps/ctmap/ctmap.go` :

- `cilium_ct4_global` et `cilium_ct6_global` pour le TCP, exposées avec le label `map_name="ct4_global"` ou `ct6_global`
- `cilium_ct_any4_global` et `cilium_ct_any6_global` pour le reste (UDP, ICMP), avec `map_name="ct_any4_global"` ou `ct_any6_global`

Le ratio `node_nf_conntrack_entries` sur `node_nf_conntrack_entries_limit` n'a donc rien à dire sur ces maps. Lors des incidents décrits plus bas, la table du kernel plafonnait entre 40 et 60 % pendant que la map `ct4_global` restait à 99,8 % pendant plusieurs minutes.

## Reconnaître une table pleine

Les symptômes sont ceux d'un réseau flaky, sans erreur applicative claire : des timeouts à l'établissement de connexion, des `connect` qui échouent pendant quelques dizaines de secondes à quelques minutes, puis un retour à la normale spontané, sans redémarrage. Les connexions déjà dans la table ne sont pas touchées : le phénomène est donc difficile à reproduire.

La confirmation passe par le monitor de l'agent. D'après la [page de troubleshooting de Cilium](https://docs.cilium.io/en/stable/operations/troubleshooting/), une table qui se remplit produit des drops `CT: Map insertion failed` (code 155 dans `pkg/monitor/api/drop.go`).

```console
$ kubectl -n kube-system exec <pod> -c cilium-agent -- cilium-dbg monitor --type drop
xx drop (CT: Map insertion failed) ...
```

Le binaire s'appelle `cilium-dbg` dans les images upstream récentes. Sur GKE Dataplane V2, c'est `cilium` dans le container `cilium-agent` des pods `anetd` qui répond (`netd` n'est pas Cilium).

Les mêmes drops sont comptés par `cilium_drop_count_total{reason="CT: Map insertion failed"}`. Pendant nos incidents, cette série n'a rien renvoyé alors que la map était pleine : on n'a pas pu confirmer que le label porte exactement ce libellé sur GKE, donc la vérification passe par la pression de la map plutôt que par les drops.

## Mesurer le remplissage

### Depuis le node

On compte les entrées de la map globale directement dans l'agent (une entrée par ligne), à comparer au plafond de la section suivante.

```bash
kubectl -n kube-system exec <pod> -c cilium-agent -- cilium-dbg bpf ct list global | wc -l
```

La commande demande les droits root, que le container de l'agent a. Le même sous-arbre propose `cilium-dbg bpf ct flush global`, qui vide la table : on ne s'en sert pas comme remède, puisque les connexions établies doivent alors repasser par la création d'une entrée.

Les métriques de l'agent se lisent sans scraper quoi que ce soit avec `cilium-dbg metrics list`, qui accepte un filtre par nom.

```bash
kubectl -n kube-system exec <pod> -c cilium-agent -- cilium-dbg metrics list -p bpf_map_pressure
```

### Dans Prometheus

La métrique de référence est `cilium_bpf_map_pressure`, label `map_name`. Selon la doc des métriques de Cilium, c'est le ratio entre la taille requise et la taille configurée de la map : sous 1.0 c'est le taux de remplissage, à 1.0 ou plus la map est pleine. Le ratio des maps CT est recalculé toutes les 30 secondes (`ctmapPressureInterval` dans `pkg/maps/ctmap/ctmap.go`), donc un pic plus court que ça peut passer entre 2 points.

Cette requête donne le node le plus chargé par map CT, à lire sur une fenêtre de plusieurs heures plutôt qu'en valeur instantanée.

```promql
topk(10, max by (instance, map_name) (max_over_time(cilium_bpf_map_pressure{map_name=~"ct.*"}[6h])))
```

Les autres métriques utiles décrivent le nettoyage (GC) des entrées expirées :

- `cilium_datapath_conntrack_gc_entries` donne les entrées vivantes et supprimées à la fin d'un passage, labels `family`, `protocol` et `status`
- `cilium_datapath_conntrack_gc_duration_seconds` est un histogramme, à lire en heatmap plutôt qu'avec `histogram_quantile` quand il n'y a que quelques passages
- `cilium_datapath_conntrack_gc_interval_seconds` donne l'intervalle courant entre 2 passages

Sur GKE, l'adresse d'écoute de l'agent se lit dans la ConfigMap `cilium-config` (`prometheus-serve-addr`, `:9990` chez nous). Le seul port déclaré sur les pods `anetd` que l'on a vu s'appelle `flowmetrics` (9965) et ressemble à celui des métriques de flows : un PodMonitor pointé dessus ne remonte pas `cilium_bpf_map_pressure`. Si rien n'écoute sur le port de la ConfigMap, l'observabilité Dataplane V2 n'est probablement pas activée sur le cluster. La page de doc GKE correspondante n'a pas pu être relue, ces points viennent de l'observation d'un cluster.

## Pourquoi le nettoyage ne suit pas toujours

Une entrée expire selon son timeout mais seul le GC la supprime effectivement. Les valeurs par défaut de `cilium-agent` (`Documentation/cmdref/cilium-agent.md`) donnent le rythme :

- une connexion TCP établie reste 2h13m20s dans la table après son dernier paquet (`bpf-ct-timeout-regular-tcp`)
- une connexion en `SYN` sans réponse reste 1 minute, en fermeture 10 secondes
- une entrée non-TCP reste 1 minute

Le GC ne tourne pas à intervalle fixe. Avec `conntrack-gc-interval` à 0 (la valeur par défaut), l'intervalle est recalculé après chaque passage selon la part d'entrées supprimées, d'après `calculateIntervalWithConfig` dans `ctmap.go` :

- au-dessus de 25 % d'entrées supprimées, l'intervalle est divisé (jusqu'à 10x à 90 %), avec un plancher de 10 secondes
- sous 5 %, l'intervalle est multiplié par 1,5, avec un plafond de 12 heures pour les maps LRU
- entre les 2, il ne bouge pas

Le premier intervalle vaut 5 minutes. Un node calme voit donc son intervalle grimper passage après passage, puis se retrouve avec une table qu'une rafale de connexions remplit en quelques secondes ou minutes avant le passage suivant. Sur un des nodes observés, l'intervalle relevé était de 8 492 s contre une médiane de 450 s sur le cluster.

Quand une insertion échoue, le datapath envoie un signal `ct_fill_up` à l'agent, qui déclenche un passage de GC anticipé (`pkg/maps/ctmap/gc/signals.go`, `bpf/lib/conntrack.h`). Un passage anticipé ne libère que des entrées expirées : si toute la table est faite de connexions vivantes, il ne change rien. Cela correspond aux saturations mesurées plus bas : une table à 99,8 % pendant 3 minutes, puis vidée d'un coup au passage régulier suivant.

!!! warning "La table est une LRU, mais l'insertion peut quand même échouer"
    Les maps CT sont créées en `LRUHash` (`newMap` dans `ctmap.go`), on pourrait donc penser que le kernel évince l'entrée la plus ancienne quand c'est plein. Le drop `CT: Map insertion failed` et la page de troubleshooting amont montrent que l'insertion échoue pourtant en pratique. Le mécanisme exact d'éviction n'a pas été vérifié ici.

## Dimensionner la table

### Les flags

D'après `Documentation/cmdref/cilium-agent.md` et `pkg/option/config.go` (branche `v1.18`), les valeurs par défaut sont les suivantes :

| Flag | Valeur par défaut | Rôle |
|---|---|---|
| `bpf-ct-global-tcp-max` | 524288 | plafond de la table TCP |
| `bpf-ct-global-any-max` | 262144 | plafond de la table non-TCP |
| `bpf-nat-global-max` | 524288 | plafond de la table NAT |
| `bpf-map-dynamic-size-ratio` | 0.0025 | part de la RAM du node réservée aux maps |
| `conntrack-gc-interval` | 0 (dynamique) | intervalle fixe du GC |
| `conntrack-gc-max-interval` | 0 | plafond de l'intervalle dynamique |

Le ratio dynamique prime sur les 2 plafonds par défaut : au démarrage, l'agent calcule la taille de chaque map à partir de la RAM du node, avec un plancher de 131072 entrées pour la table TCP et 65536 pour la table non-TCP (`LimitTableAutoGlobalTCPMin` et `LimitTableAutoGlobalAnyMin`). Un plafond passé explicitement par flag désactive le calcul dynamique pour cette map seulement.

La doc de Cilium (`Documentation/network/ebpf/maps.rst`) donne la table obtenue avec le ratio par défaut :

| vCPU | RAM (GiB) | Entrées CT de Cilium |
|---|---|---|
| 4 | 15 | 131072 |
| 8 | 30 | 284560 |
| 16 | 60 | 569120 |
| 32 | 120 | 1138240 |

Un node de 15 GiB ou moins retombe donc sur le plancher, alors qu'il peut encaisser des milliers de nouvelles connexions par seconde s'il porte un reverse proxy. À 10 000 nouvelles connexions par seconde, 131072 entrées se remplissent en une quinzaine de secondes si rien n'expire (au mieux 1 entrée par connexion, ordre de grandeur).

Le coût mémoire se lit dans le commentaire de `LimitTableMax` : 16Mi entrées pour environ 1 GiB par map, soit une soixantaine d'octets par entrée. Doubler une table de 1Mi entrées coûte donc de l'ordre de 64 Mo de RAM par node.

### Les valeurs Helm et leurs pièges

Quand on gère Cilium soi-même, les flags passent par le chart (`install/kubernetes/cilium/values.yaml`).

```yaml
bpf:
  ctTcpMax: 1048576
  ctAnyMax: 262144
  natMax: 786432
  mapDynamicSizeRatio: 0.0025
conntrackGCMaxInterval: "5m"
```

3 points à savoir avant de les poser :

- la table NAT ne doit pas dépasser la somme des tables CT TCP et non-TCP : une valeur `natMax` posée explicitement au-dessus fait échouer le démarrage de l'agent (`specified NAT tables size ... must not exceed maximum CT table size`). Seule une valeur laissée au défaut ou calculée dynamiquement est ramenée à `(tcp + any) * 2 / 3`, avec un warning. Ici, la somme vaut 1310720 donc `natMax: 786432` passe
- `conntrackGCMaxInterval` est un plafond sur l'intervalle dynamique : il garde le GC réactif sans le figer, mais il n'a plus d'effet si `conntrackGCInterval` est posé
- changer la taille d'une map ne la redimensionne pas en place : `OpenOrCreate` dans `pkg/bpf/map_linux.go` la supprime et la recrée sans conserver son contenu. Le redémarrage de l'agent avec une nouvelle taille vide donc la table. Les connexions établies perdent leur entrée, avec un effet exact qui n'a pas été mesuré. Le rollout se fait node par node, hors pic

## Ce qu'on peut tuner sur un Cilium managé

Sur GKE Dataplane V2, `anetd` est un fork de Cilium maintenu par Google, qui n'en implémente pas toutes les fonctionnalités. Aucun de ses flags n'est documenté comme réglable. La page de doc [GKE Dataplane V2](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2) ne décrit aucun réglage de la table conntrack ni de la configuration Cilium. Elle indique que GKE ne supporte pas l'installation de programmes eBPF personnalisés sur ces nodes. Un patch sur `cilium-config` ou sur le DaemonSet `anetd` serait très probablement écrasé par le gestionnaire d'addons, mais ce point n'a pas été vérifié sur `anetd`.

Les leviers qui restent :

- la RAM du node, puisque le plafond suit `bpf-map-dynamic-size-ratio` et donc la taille de l'instance : un pool qui porte des reverse proxies prend des machines plus grosses ou une compute class dédiée, avec à la clé une table plus grande
- le profil de trafic : moins de connexions courtes (keep-alive entre le client et le proxy, pas de reload qui coupe tous les keep-alive d'un coup) ainsi qu'un pool dédié pour que les pods bruyants ne remplissent pas la table de leurs voisins
- le node pool lui-même : les sysctls kernel posés via la config système du pool (par exemple `net.netfilter.nf_conntrack_max`, voir [HAProxy performance tuning](../../web/haproxy/performance_tuning.md)) agissent sur la table du kernel, pas sur celle de Cilium
- la visibilité : sans réglage possible, l'alerte de la section suivante est la seule protection, avec un ticket au support si un pool sature de manière récurrente

## Alerter sur la pression de map

Une saturation dure de 30 secondes à quelques minutes, parfois moins que le `for` habituel d'une alerte. Une règle sur `max_over_time` capture le pic même si la métrique est redescendue au moment où l'alerte s'évalue. Une seconde règle prévient d'une montée lente.

```yaml
groups:
  - name: cilium-conntrack
    rules:
      - alert: CiliumConntrackMapSaturated
        expr: 'max by (instance, map_name) (max_over_time(cilium_bpf_map_pressure{map_name=~"ct.*"}[5m])) > 0.95'
        labels:
          severity: warning
        annotations:
          summary: "Cilium conntrack map {{ $labels.map_name }} reached 95% on {{ $labels.instance }}"
      - alert: CiliumConntrackMapFillingUp
        expr: 'max by (instance, map_name) (cilium_bpf_map_pressure{map_name=~"ct.*"}) > 0.8'
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cilium conntrack map {{ $labels.map_name }} above 80% for 10m on {{ $labels.instance }}"
      - alert: CiliumConntrackInsertionDrops
        expr: 'sum by (instance) (rate(cilium_drop_count_total{reason="CT: Map insertion failed"}[5m])) > 0'
        labels:
          severity: warning
        annotations:
          summary: "Cilium dropping packets on conntrack insertion failure on {{ $labels.instance }}"
```

La première règle se déclenche aussi sur un pic isolé, volontairement : un node qui touche 95 % une fois par jour doit remonter dans un dashboard, pas réveiller quelqu'un. La troisième n'a jamais produit de série dans nos mesures (voir plus haut) : on la garde comme filet, après avoir vérifié le libellé du label sur son propre cluster.

Les métriques `cilium_*` d'un cluster ne remontent pas forcément dans un Thanos global, selon la fédération en place. Ces règles s'évaluent là où vit le Prometheus qui scrape `anetd`.

## Trois saturations, trois causes

Sur un cluster GKE Dataplane V2 de plus d'un millier de nodes, 6 nodes ont vu leur map `ct4_global` pleine en 3 jours, sur 2 pools différents. Aucune de ces saturations n'était visible dans la table du kernel.

- **Démarrage d'un node** : un node neuf a rempli sa table en 2 minutes, est resté à 99,8 % pendant environ 3 minutes jusqu'au premier passage régulier du GC, qui a supprimé jusqu'à 270 000 entrées d'un coup. Le node avait moins de 100 sockets TCP ouverts : les entrées venaient du trafic des pods qui traversait le node, invisible dans les métriques du node.
- **Pic de connexions entrantes sur un pool de reverse proxies** : le nombre de nouvelles connexions TCP par seconde a été multiplié par 6 à 8 pendant 1 à 2 minutes, alors que le volume de paquets n'a augmenté que de 15 %. Ce sont des connexions très courtes, sans SYN cookie ni débordement de file d'écoute, donc une vague de reconnexions plutôt qu'un SYN flood. L'hypothèse d'un reload du proxy ou de retries côté clients n'a pas été confirmée dans les logs. La map est montée à 98 % puis 99,8 % en 30 secondes avant de retomber.
- **Accumulation lente** : la table gagnait environ 1 % par minute pendant 4 heures sur un node dont l'intervalle de GC valait 2h20, jusqu'à 100 % pendant 5 minutes, puis retombait à 1 % d'un coup au passage suivant.

Une première hypothèse, des pods `kube-dns` concentrés sur le node, a été écartée : sur un node saturé, les 8 pods `kube-dns` recevaient 297 paquets/s au total contre plus de 10 000 pour le pod applicatif qui remplissait la table. Les nodes qui empilaient 5 à 8 pods `kube-dns` plafonnaient entre 45 et 77 % sur 24 heures. `node-local-dns` tournait déjà sur chaque node.

## Voir aussi

- [HAProxy performance tuning](../../web/haproxy/performance_tuning.md) pour les sysctls kernel d'un node de reverse proxy
