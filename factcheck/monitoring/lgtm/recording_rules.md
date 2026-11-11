---
article: docs/monitoring/lgtm/recording_rules.md
checked: '2026-11-11'
commit: 12bf10735afa444fe76e6704c0ece82887d15330
sources:
- repo: prometheus
  path: docs/configuration/recording_rules.md
  lines: 16-17
  ref: origin/main
  commit: 997549d4479dbc52382c83679dd998cd1c8eff27
- repo: prometheus
  path: docs/configuration/recording_rules.md
  lines: 39-46
  ref: origin/main
  commit: 997549d4479dbc52382c83679dd998cd1c8eff27
- repo: prometheus
  path: docs/configuration/recording_rules.md
  lines: 88-91
  ref: origin/main
  commit: 997549d4479dbc52382c83679dd998cd1c8eff27
- repo: prometheus
  path: docs/configuration/unit_testing_rules.md
  lines: 100-105
  ref: origin/main
  commit: 997549d4479dbc52382c83679dd998cd1c8eff27
- repo: prometheus
  path: docs/querying/operators.md
  lines: 272-281
  ref: origin/main
  commit: 997549d4479dbc52382c83679dd998cd1c8eff27
- repo: thanos
  path: docs/components/rule.md
  lines: 7-11
  ref: origin/main
  commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
- repo: thanos
  path: docs/components/rule.md
  lines: 99
  ref: origin/main
  commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
- repo: thanos
  path: docs/components/rule.md
  lines: 139-155
  ref: origin/main
  commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
- repo: thanos
  path: docs/components/rule.md
  lines: 167
  ref: origin/main
  commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
- repo: thanos
  path: docs/components/rule.md
  lines: 187-196
  ref: origin/main
  commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
- repo: thanos
  path: docs/components/rule.md
  lines: 262
  ref: origin/main
  commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
unpinned: 8
---

# docs/monitoring/lgtm/recording_rules.md

## Findings

Aucune erreur trouvée. Les snippets ont été exécutés avec promtool 3.15.0 (la version annoncée dans `tested_with`) : `group_right (... == 1)` donne bien `parse error: unexpected <op:==> in grouping opts, expected "," or ")"`, la forme `group_right ()` passe `check rules`, le test à 2 namespaces passe avec `namespace` dans le `on(...)` et échoue sans, avec `found duplicate series for the match group ... many-to-many matching not allowed`, et le bloc `remote_write` avec `write_relabel_configs` passe `promtool check config`. Preuve : docs/querying/operators.md:272-281 @ origin/main

Vérifié sans écart : les labels de groupe écrasés par ceux de la règle (docs/configuration/recording_rules.md:88-91), `SIGHUP` appliqué seulement si tous les fichiers sont bien formés (docs/configuration/recording_rules.md:16-17), la phrase sur les dashboards (docs/configuration/recording_rules.md:39-46), la notation `2x5` et `_x3` (docs/configuration/unit_testing_rules.md:100-105), `--query` en round robin, mode stateless sans StoreAPI, `--endpoint` côté Querier, `abort` par défaut, external labels qui remplacent les labels source, `prometheus_rule_evaluation_failures_total` (docs/components/rule.md @ origin/main). Pas de changement du parser ou de la doc entre v3.15.0 et v3.16.0 qui touche ces points.

## Unpinned

- Les règles de nommage `level:metric:operations`, `_per_`, `ratio`, `without` plutôt que `by` viennent de la page prometheus.io/docs/practices/rules (dépôt prometheus/docs, non cloné), lue sur la branche main et cohérente avec l'article
- Le contenu de `haproxy.records.yml` (agrégation vers `(namespace, proxy, instance, job)`, `code` sur une règle, plancher `clamp_min` à 0,01, divisions sans `group_left`)
- Le contenu de `k8s.records.yml` (commentaires de tête de groupe, `interval: 1m`, 2 métriques cAdvisor) et de `basis.records.yml` (`instance:node_memory_available:ratio`)
- Le contenu de `k8s-records.test.yml` (cas du container en restart)
- `kube_pod_container_status_running` vaut 0 et non absent sur un container en restart (kube-state-metrics, non cloné)
- Le résultat `+Inf` d'un usage divisé par 0 sur tout un namespace (incident décrit, non rejouable)
- Le décompte « 4 records du join et 6 dérivés » qui échouaient
- Un chart Helm qui déduit `federate` du nom du groupe (choix de design, pas une propriété de Prometheus)
