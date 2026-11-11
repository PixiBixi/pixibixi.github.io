---
article: docs/kubernetes/troubleshooting/cilium_conntrack.md
checked: '2026-11-11'
commit: 8e930165d9c53ba673fc8a906a2596305d96c232
sources:
  - repo: cilium
    path: pkg/maps/ctmap/ctmap.go
    lines: 58-70,301-312,760-836,837-890
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: pkg/option/config.go
    lines: 520-579,3106-3134,3236-3262,3290-3370
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: pkg/defaults/defaults.go
    lines: 312-320
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: Documentation/cmdref/cilium-agent.md
    lines: 30-38,59-60,82-83
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: Documentation/network/ebpf/maps.rst
    lines: 65-98
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: Documentation/operations/troubleshooting.rst
    lines: 392-402
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: pkg/monitor/api/drop.go
    lines: 55-57
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: pkg/maps/ctmap/types.go
    lines: 496-513
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: pkg/bpf/map_linux.go
    lines: 312-314,560-568
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: pkg/metrics/metrics.go
    lines: 876-935
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: bpf/lib/conntrack.h
    lines: 1031-1036,1092-1097
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
  - repo: cilium
    path: install/kubernetes/cilium/values.yaml
    lines: 549-642,807-815
    ref: origin/v1.18
    commit: b7714975103b35b93ff734f89f734a905e5a26a5
unpinned: 9
---

# docs/kubernetes/troubleshooting/cilium_conntrack.md

## Findings

- L94 IMPRECISE corrigé : "Quand une insertion échoue, le datapath envoie un signal `ct_fill_up`" : le signal n'est envoyé que si l'erreur de `map_update_elem` est `-ENOMEM`, pas pour toute insertion échouée. Ajouter la condition. Preuve : bpf/lib/conntrack.h:1031-1036 et 1092-1097 @ origin/v1.18
- L127 IMPRECISE corrigé : "une soixantaine d'octets par entrée" : le commentaire de `LimitTableMax` donne bien environ 1 GiB pour 16Mi entrées, mais un élément CT IPv4 est une clé plus un `CtEntry` de 56 octets (4 champs de 8 octets, puis 44 octets de champs plus 12 de padding et de compteurs), donc plus de 70 octets avant le surcoût du hash LRU du kernel. "de l'ordre de 64 Mo" reste un ordre de grandeur correct, à écrire "autour de 70 à 80 Mo" si on veut le chiffre. Calcul fait sur la structure, pas mesuré. Preuve : pkg/option/config.go:578-579 et pkg/maps/ctmap/types.go:496-513 @ origin/v1.18
- L144 IMPRECISE corrigé : "est ramenée à `(tcp + any) * 2 / 3`, avec un warning" : le warning n'existe que sur le chemin du calcul dynamique. Une valeur laissée au défaut est ramenée sans log dans la validation. Preuve : pkg/option/config.go:3122-3134 et 3362-3370 @ origin/v1.18

Le reste est confirmé sur la branche `v1.18` (v1.18.16), et identique sur `v1.19` et `main` pour les défauts, planchers, intervalles de GC, code de drop 155 et flags : noms de maps et label `map_name` (préfixe `cilium_` retiré), `LRUHash`, recalcul de la pression toutes les 30 s, 3 paliers du GC (25 %, 5 %, 10x à 90 %, plancher 10 s, plafond 12 h, départ 5 min), timeouts TCP/non-TCP, défauts des 6 flags, planchers 131072 et 65536, désactivation du calcul dynamique par map, table de `maps.rst`, labels `family`/`protocol`/`status` de `conntrack_gc_entries`, nom des 3 métriques de GC, label `reason` de `drop_count_total` valant exactement `CT: Map insertion failed` en amont, erreur NAT, recréation de la map par `OpenOrCreate`, clés Helm, `conntrackGCMaxInterval` sans effet si `conntrackGCInterval` est posé, `cilium-dbg bpf ct list global`, `bpf ct flush global`, `metrics list -p`. Côté GKE, la page Dataplane V2 dit bien que GKE ne supporte pas l'installation de programmes eBPF personnalisés, ne parle ni de conntrack ni de configuration Cilium, et cite `anetd` sans citer `netd`.

## Unpinned

- Mesures d'incidents (L25 table du kernel à 40-60 % contre 99,8 %, L92 intervalle de 8 492 s contre médiane 450 s, L194-200 les trois saturations, le kube-dns écarté) : observations sur un cluster, aucune source publique.
- L38 : `cilium` et non `cilium-dbg` dans le container `cilium-agent` des pods `anetd`, et `netd` n'est pas Cilium : observation de cluster.
- L40 : le libellé exact du label `reason` sur GKE (confirmé seulement en amont).
- L76 : port `flowmetrics` (9965), `prometheus-serve-addr` à `:9990` et absence d'écoute si l'observabilité n'est pas activée : observation de cluster, page GKE non relue.
- L97 : le mécanisme qui fait échouer l'insertion dans une map LRU est annoncé non vérifié par l'article lui-même.
- L146 : effet exact d'une map recréée sur les connexions établies, non mesuré.
- L150 : `anetd` est un fork maintenu par Google qui n'implémente pas tout Cilium, et un patch sur `cilium-config` ou le DaemonSet serait écrasé par le gestionnaire d'addons.
- L52 : la commande demande les droits root (non trouvé dans le code, plausible).
- L125 : "au mieux 1 entrée par connexion" et le calcul de 15 secondes : arithmétique correcte (131072 / 10000), hypothèse non sourcée.
