---
article: docs/monitoring/lgtm/alloy.md
checked: '2026-11-10'
commit: fb9f0946e71833e792f95adadcfe54cbb6ded6e5
sources:
- repo: grafana-alloy
  path: internal/alloycli/cmd_run.go
  lines: 62-63
  ref: v1.21.3
  commit: f2108cd783accbd491b24843484c33abba6da52a
- repo: grafana-alloy
  path: Dockerfile
  lines: '84'
  ref: v1.21.3
  commit: f2108cd783accbd491b24843484c33abba6da52a
- repo: grafana-alloy
  path: internal/component/loki/process/stages/multiline.go
  lines: 37-38
  ref: v1.21.3
  commit: f2108cd783accbd491b24843484c33abba6da52a
- repo: null
  path: types.go
  lines: '30'
  ref: v1.21.3
  commit: null
- repo: grafana-alloy
  path: packaging/deb/control/postinst
  lines: 25-26
  ref: v1.21.3
  commit: f2108cd783accbd491b24843484c33abba6da52a
unpinned: 2
---

# docs/monitoring/lgtm/alloy.md

## Findings

- L44 ERROR corrigé : la commande Docker ajoute `--server.http.listen-addr=0.0.0.0:12345` et `--storage.path=/var/lib/alloy/data` après `run`, image pinnée `grafana/alloy:v1.21.3`, et une phrase sous les onglets explique pourquoi. Preuve : internal/alloycli/cmd_run.go:62-63 @v1.21.3 (`127.0.0.1:12345`, `data-alloy/`), Dockerfile:84 @v1.21.3 ; test : commande d'origine, `curl /-/ready` via le port publié = 000, et `data-alloy` créé dans `/` ; commande corrigée = 200 et `/api/v0/web/components` répond.
- L371 ERROR corrigé : défaut de `max_wait_time` passé à `3s`, défaut `128` ajouté pour `max_lines`. Preuve : internal/component/loki/process/stages/multiline.go:37-38 @v1.21.3.
- L159 IMPRECISE rejeté : "27+" tient. Preuve : `git ls-tree internal/component/prometheus/exporter/` @v1.21.3 donne 31 entrées, moins exporter.go, common, tests, static = 27 composants exporter (self compris).
- L537 IMPRECISE corrigé : réécrit, le composant reprend au curseur sauvegardé, sinon remonte `max_age` (défaut 7h), un curseur plus vieux que `max_age` est ignoré ; le commentaire `max_age = "24h"` dit maintenant qu'on élargit la fenêtre. Preuve : types.go:30 @v1.21.3 (`7 * time.Hour`), internal/sdjournal/sdjournal.go:462-502 (`seekToStart` : now-maxAge sans curseur ou curseur trop vieux).
- L547 IMPRECISE corrigé : l'admonition précise que le paquet deb/rpm ajoute déjà alloy à `systemd-journal`. Preuve : packaging/deb/control/postinst:25-26 @v1.21.3 (rpm non relu).
- L570 IMPRECISE corrigé : "Sans --network host, journald n'est pas accessible" retiré ; le texte dit que le composant lit les fichiers montés et que host network sert à joindre Loki et l'UI. Preuve : sdjournal.go ouvre le journal par chemin via libsystemd en dlopen, rien côté réseau (lecture du code, pas de test journal en conteneur).

## En plus

- L556-567 : la commande Docker journal remplaçait elle aussi le `CMD`, donc pas de `--storage.path` : les positions du journal partaient dans `/data-alloy` du conteneur et étaient perdues à chaque recréation (nouvelle relecture de 7h). Ajout de `--storage.path=/var/lib/alloy/data` et d'un volume `alloy-data`. Preuve : même test que L44 (`data-alloy` dans `/`), journal.go:56 (positions.yml dans DataPath).
- Ajout `tested_with: Alloy v1.21.3`.

## Modernisation

- Image distroless depuis v1.19.0 : rejeté, le Dockerfile @v1.21.3 part de `ubuntu:noble` et `docker exec ... sh` marche dans grafana/alloy:v1.21.3 (Ubuntu 24.04.5).
- postinst systemd-journal : appliqué (voir L547).
- `stage.split_json` : non appliqué, pas utile à l'exemple JSON de l'article, non vérifié.

## Tests

- OrbStack, grafana/alloy:v1.21.3 (deux conteneurs, config `prometheus.exporter.unix`), curl sur `/-/ready` et `/api/v0/web/components`. Sources grafana-alloy @v1.21.3 (dernier tag stable).

## À signaler

- Le pin `v1.21.3` remplace `latest` dans les deux commandes Docker : à bumper avec l'article.
