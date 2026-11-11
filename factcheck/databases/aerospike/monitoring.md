---
article: docs/databases/aerospike/monitoring.md
checked: '2026-11-11'
commit: 1cdb2bb1a4764ecfd7d67a85d7b42be1de5f9f97
sources:
- repo: aerospike-server
  path: as/src/base/nsup.c
  lines: 943-1020,1022-1034
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/src/base/namespace.c
  lines: 124-125,150-151
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/src/base/cfg.c
  lines: 156-161,2327-2329,2428-2431,3277-3279
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/src/base/cfg_info.c
  lines: 505-510,850-910,1155-1168,2163-2172,2684-2717
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/src/base/service.c
  lines: 286-323,554-557
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/include/base/service.h
  lines: 61-62
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/src/transaction/write.c
  lines: 979-992
  ref: v8.1.2.5
  commit: 71e89082e42462ef1668701d36545cac24b64e87
- repo: aerospike-server
  path: as/src/base/cfg.c
  lines: 161,855,2327-2329
  ref: v8.1.2.2
  commit: c1802b6c01d4933f61174433e09e07cc590eec9e
- repo: aerospike-prometheus-exporter
  path: internal/pkg/executors/tests/tests_data/default_prom_mock_results.txt
  lines: 536-537,1257-1258,2517-2518,2606-2607,2710-2711,2717-2718,3201,3438,3534
  ref: v1.36.0
  commit: 4c918e5aaec5df7572a6a8d4877ba2acef28b7b7
- repo: aerospike-prometheus-exporter
  path: configs/ape.toml
  lines: 57
  ref: v1.36.0
  commit: 4c918e5aaec5df7572a6a8d4877ba2acef28b7b7
- repo: aerospike-backup-service
  path: pkg/service/prometheus.go
  lines: 38-50,80-110,219-245
  ref: v3.4.0
  commit: a54915ad4750585da26fe876ccb6efb58c924816
- repo: aerospike-kubernetes-operator
  path: api/v1/aerospikecluster_types.go
  lines: 516,1118-1123
  ref: v4.7.0
  commit: 9534249672d7ec595655a735061c3c455b68f554
unpinned: 10
---

# docs/databases/aerospike/monitoring.md

## Findings

- L31 ERROR corrigé : l'option de service `cgroup-mem-tracking` est annoncée comme rétroportée en 8.0.0.17 et 7.2.0.19, mais aucun de ces tags ne la contient (ni 8.0.0.18, 8.0.0.20, 7.2.0.20, 7.2.0.22). Dans le clone public, elle apparaît d'abord en 8.1.2.2 (les tags 8.1.2.0 et 8.1.2.1 n'y existent pas, donc le "depuis la 8.1.2" n'est pas vérifiable). Le défaut `false` est correct. Retirer la mention du rétroport ou la resourcer depuis les release notes. Preuve : as/src/base/cfg.c:161,855,2327-2329 @ v8.1.2.2 (absent de as/src/base/cfg.c @ v8.0.0.17 et v7.2.0.19)
- L283-286 IMPRECISE corrigé : dans la sortie de `get-config:context=namespace`, `stop-writes-sys-memory-pct` est émis avant les clés `storage-engine.stop-writes-*`, donc le bloc console les montre dans le mauvais ordre. Mettre `stop-writes-sys-memory-pct=90` en premier. Preuve : as/src/base/cfg_info.c:505-510 @ v8.1.2.5

Défauts, noms de métriques et labels, forme nue de `set-config` (`ERROR:4`), `proto-fd-max` (15000, minimum 1024, dynamique, borné par `nofile`), déclencheurs du stop-writes, métriques dépréciées d'ABS 3.4 et arithmétique des règles (1584 points, 1h45) vérifiés conformes. Preuve : as/src/base/namespace.c:124-151 @ v8.1.2.5, internal/pkg/executors/tests/tests_data/default_prom_mock_results.txt @ v1.36.0, pkg/service/prometheus.go:38-110 @ v3.4.0

## Unpinned

- L24 le paramètre s'appelait `max-used-pct` avant la 7.0 : pas de tag 6.x ni 7.0 dans le clone (seul le statut obsolète en 8.1 est confirmé)
- L22, L25, L26 exemptions du stop-writes (deletes, réplication, migration), conseil de ne pas descendre sous 5 et marquage Enterprise de `stop-writes-sys-memory-pct` : propos de la documentation, pas de code
- L33 `evict-used-pct` strictement sous `stop-writes-used-pct` : conseil de doc, aucune validation dans le code
- L35, L95, L179, L181, L184, L188, L207, L263 : chiffres d'incidents et d'historique d'alertes propres à l'auteur (90 minutes, 2,25 points par heure, 3 déclenchements en 30 jours, 6 jours de suite, 33 heures de rétention, 8 déclenchements, un millier de pods, routine de plus de 3 heures)
- L235 sélecteur du ServiceMonitor ABS et labels du Service créé par AKO : dépend du déploiement
- L263 routines ABS quotidiennes et `data-full` lancées à la main : configuration locale
- L203 le chart de règles ne supportait pas `keep_firing_for` : propos sur un chart tiers non pinné
- L149 coupure de 9 jours après un changement de taille : choix de l'auteur
- L48 image `aerospike/aerospike-prometheus-exporter:1.36.0` : tag Docker Hub, non vérifiable dans le clone (le tag git `v1.36.0` existe)
- L9 "Aerospike Server 8.1" et "Backup Service 3.4" dans `tested_with` : pas de pin possible, le serveur 8.2.0.0 garde les mêmes défauts vérifiés
