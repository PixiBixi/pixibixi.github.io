---
article: docs/monitoring/lgtm/cloudprober.md
checked: '2026-11-11'
commit: 812aa67198d525712c7e46b5a1ba63bf1e77b03c
sources:
- repo: cloudprober
  path: probes/http/request.go
  lines: 179-184
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: probes/http/request.go
  lines: 303-306
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: probes/proto/config.proto
  lines: 125-128
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: probes/proto/config.proto
  lines: 30-45
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: config/config.go
  lines: 230-258
  ref: v0.14.6
  commit: 1d52d994df08725de18451d8cb456413a4676a74
- repo: cloudprober
  path: config/config.go
  lines: '232'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: probes/options/options.go
  lines: '86'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: probes/http/proto/config.proto
  lines: 33-38
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: internal/surfacers/prometheus/proto/config.proto
  lines: '38'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: internal/surfacers/prometheus/prometheus.go
  lines: '86'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: internal/surfacers/proto/config.proto
  lines: 64-68
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: probes/http/http.go
  lines: '533'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: internal/tracing/tracing.go
  lines: '126'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: internal/tracing/otelsdk/otelsdk.go
  lines: 26-37
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: logger/logger.go
  lines: 66-70
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: logger/logger.go
  lines: '331'
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: cloudprober
  path: internal/alerting/proto/config.proto
  lines: 119-127
  ref: v0.14.7
  commit: 2538e694312bb67b824fd3ff7b836babe4fbcc85
- repo: blackbox_exporter
  path: prober/utils.go
  lines: 53-58
  ref: v0.29.1
  commit: ad91668339ca265f460c23fc422a27ba6d788db9
- repo: blackbox_exporter
  path: config/config.go
  lines: 55-81
  ref: v0.29.1
  commit: ad91668339ca265f460c23fc422a27ba6d788db9
- repo: blackbox_exporter
  path: prober/handler.go
  lines: 37-45
  ref: v0.29.1
  commit: ad91668339ca265f460c23fc422a27ba6d788db9
- repo: blackbox_exporter
  path: prober/http.go
  lines: 725-734
  ref: v0.29.1
  commit: ad91668339ca265f460c23fc422a27ba6d788db9
- repo: prometheus
  path: tsdb/agent/db.go
  lines: 57-59
  ref: main
  commit: 0b1983060510028164ab063444a0b64c0ca4b69d
- repo: prometheus
  path: tsdb/agent/db.go
  lines: 418-420
  ref: main
  commit: 0b1983060510028164ab063444a0b64c0ca4b69d
- repo: synthetic-monitoring-app
  path: src/types.ts
  lines: 549-559
  ref: main
  commit: 2739165b7c64eff030bb2733714bf7d1da86df5f
- repo: synthetic-monitoring-app
  path: src/components/Checkster/constants.ts
  lines: '221'
  ref: main
  commit: 2739165b7c64eff030bb2733714bf7d1da86df5f
unpinned: 4
---

# docs/monitoring/lgtm/cloudprober.md

2e passe complète (la 1re date de la nuit du 25 au 26 octobre, rapport perdu), sur Cloudprober v0.14.6 puis le diff jusqu'à v0.14.7, qui est sortie le 21 octobre. Environ 62 affirmations vérifiées, 3 ERROR, 3 OUTDATED, 10 IMPRECISE, toutes corrigées dans le commit de publication. Les ajouts de la même session (tableau comparatif, setup multi-replica, agent Prometheus) ont été vérifiés dans le source au moment de l'écriture.

## Findings

- L106-146 ERROR corrigé : une probe HTTP sur `host_names` ne résout pas le nom elle-même sans `resolve_first: true`, donc `ip_version` n'a aucun effet et `@target.ip@` reste vide. `resolve_first: true` ajouté aux 3 exemples. Preuve : probes/http/request.go:179-184 @ v0.14.7, probes/http/request.go:303-306 @ v0.14.7.
- L40 ERROR corrigé : jusqu'à v0.14.6, `--configtest` ne fait que parser le fichier et valider les options de chaque probe. Preuve : config/config.go:230-258 @ v0.14.6.
- L40 OUTDATED corrigé : v0.14.7 valide aussi les targets, les regex, les surfacers et les noms de probes en double (commit 7fcb3c86, "Catch more init errors in configtest"). Preuve : config/config.go:232 @ v0.14.7.
- L10 OUTDATED corrigé : `tested_with` et les images passés de 0.14.6 à 0.14.7. Le diff ne touche ni probes/http, ni le tracing, ni l'alerting.
- L104 IMPRECISE corrigé : la préférence IPv4 ne vaut que quand Cloudprober résout lui-même. Preuve : probes/proto/config.proto:125-128 @ v0.14.7.
- L181 IMPRECISE corrigé : 4h ne vaut que pour les compteurs, les gauges horodatées expirent au bout de 10 minutes. Preuve : internal/surfacers/prometheus/proto/config.proto:38 @ v0.14.7, internal/surfacers/prometheus/prometheus.go:86 @ v0.14.7.
- L335 IMPRECISE corrigé : `absent_over_time` ne voit pas un process vivant dont les probes sont bloquées, d'où l'ajout de la branche `sum(rate(...)) == 0`.
- L343 IMPRECISE corrigé : `rate(latency)/rate(success)` donne NaN, pas un vecteur vide, et l'alerte se comporte pareil.
- L164 IMPRECISE corrigé : la somme cumulée ne vaut que sans `latency_distribution`.
- L62 IMPRECISE corrigé : `protocol` est déprécié, remplacé par `scheme`. Preuve : probes/http/proto/config.proto:33-38 @ v0.14.7.
- L285 IMPRECISE corrigé : `host.name` est déjà attaché aux traces. Preuve : internal/tracing/tracing.go:126 @ v0.14.7.
- L260 IMPRECISE corrigé : le message `permission denied` n'a pas pu être sourcé et a été retiré. La variable d'environnement est ajoutée. Preuve : logger/logger.go:331 @ v0.14.7, logger/logger.go:66-70 @ v0.14.7.
- L345 IMPRECISE corrigé : notifiers complétés (Teams, email, HTTP). Preuve : internal/alerting/proto/config.proto:119-127 @ v0.14.7.
- Deployment IMPRECISE corrigé : `checksum/config` avec `${CONFIG_CHECKSUM}` n'était jamais substitué. L'annotation est retirée et le déploiement passe en GitOps avec `configMapGenerator`.

## Ajouts vérifiés

- L29 : Cloudprober n'a pas de notifier Grafana IRM natif, IRM passe par le webhook `http_notify`. Preuve : internal/alerting/proto/config.proto:119-127 @ v0.14.7. L'envoi vers une intégration IRM n'a pas été testé.
- L28 : Blackbox exporter préfère IPv6 et retombe sur IPv4 par défaut. Preuve : prober/utils.go:53-58 @ v0.29.1, config/config.go:55-81 @ v0.29.1.
- Tableau, protocoles : prober/handler.go:37-45 @ v0.29.1, probes/proto/config.proto:30-45 @ v0.14.7, src/types.ts:549-559 @ main.
- Tableau, Grafana SM en IPv4 par défaut. Preuve : src/components/Checkster/constants.ts:221 @ main.
- Latence par étage Blackbox : prober/http.go:725-734 @ v0.29.1.
- L243 : l'agent Prometheus relève `MaxWALTime` à `TruncateFrequency` (2h par défaut). Preuve : tsdb/agent/db.go:418-420 @ main, tsdb/agent/db.go:57-59 @ main.
- L258 : `OTEL_SDK_DISABLED=true` coupe le SDK OTel de Cloudprober. Preuve : internal/tracing/otelsdk/otelsdk.go:26-37 @ v0.14.7.
- Section Prometheus, 2e surfacer filtré : internal/surfacers/proto/config.proto:64-68 @ v0.14.7.

## Unpinned

- Tableau, Grafana Synthetic Monitoring : hébergement SaaS avec probes privées et facturation à l'usage, aucune source pinnée.
- Traces OTel côté Grafana SM : non vérifié, la ligne a été retirée du tableau.
- Leçons du setup multi-replica (3 replicas, fail closed, restart à la promotion) : tirées d'un setup interne lu dans le code, jamais rejoué.
- Image `cloudprober/cloudprober:v0.14.7` sur Docker Hub : le nommage du tag n'a pas été vérifié depuis le clone.
