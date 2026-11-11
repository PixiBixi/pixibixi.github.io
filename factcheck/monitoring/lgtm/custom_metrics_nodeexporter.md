---
article: docs/monitoring/lgtm/custom_metrics_nodeexporter.md
checked: '2026-11-11'
commit: b1a2a79e41f85e8ec2efe80f5889726144b37faf
sources: []
unpinned: 1
---

# docs/monitoring/lgtm/custom_metrics_nodeexporter.md

## Findings

- L18 IMPRECISE corrigé : ajouté après le paragraphe sur le `.prom` une phrase et un bloc `node_exporter --collector.textfile.directory=/var/lib/node_exporter/textfile_collector/` : le collector est activé par défaut mais le flag est vide par défaut. Preuve : node_exporter `collector/textfile.go:36` (`.Default("")`) et `:53` (`registerCollector("textfile", defaultEnabled, ...)`) @ origin/master ; README:173 "The `--collector.textfile.directory` flag must be set".

## En plus

- Aucune.

## Modernisation

- Aucune suggestion.

## Tests

- Docker `prom/node-exporter:v1.12.1 --collector.textfile.directory=/tf` : `myscript.prom` exposé, `myscript.prom.123` ignoré, `node_textfile_mtime_seconds{file=...}` et `node_textfile_scrape_error 0` présents (confirme les règles d'alerte de l'article). `tested_with: node_exporter 1.12` reste exact.

## À signaler

- Rien.
