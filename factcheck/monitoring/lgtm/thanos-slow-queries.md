---
article: docs/monitoring/lgtm/thanos-slow-queries.md
checked: '2026-11-11'
commit: 76278f711736980433068a679c1f3c3816eceebe
sources:
- repo: thanos
  path: internal/cortex/frontend/transport/handler.go
  lines: 156-225
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: internal/cortex/frontend/transport/handler.go
  lines: 268-305
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: cmd/thanos/query_frontend.go
  lines: 154-155
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: pkg/tracing/http.go
  lines: 24-64
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: pkg/tracing/otlp/otlp.go
  lines: 62-134
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: pkg/tracing/migration/sampler.go
  lines: 14-40
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: pkg/store/bucket.go
  lines: 1555-1555
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: pkg/store/bucket.go
  lines: 1670-1670
  ref: v0.42.5
  commit: 4f05efeeadbacdc6552d68ef0850b40317109b4f
- repo: thanos
  path: cmd/thanos/query.go
  lines: 84-85
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: thanos
  path: docs/tracing.md
  lines: 67-67
  ref: v0.42.4
  commit: 45c4f39487e1653e606307d3952a6259fb96acae
- repo: opentelemetry-collector-contrib
  path: processor/tailsamplingprocessor/README.md
  lines: 34-34
  ref: v0.165.1
  commit: 6083b2c53d78b21d0925b703194aaed920c01af5
- repo: opentelemetry-collector-contrib
  path: processor/tailsamplingprocessor/README.md
  lines: 56-59
  ref: v0.165.1
  commit: 6083b2c53d78b21d0925b703194aaed920c01af5
- repo: opentelemetry-collector-contrib
  path: processor/tailsamplingprocessor/README.md
  lines: 580-580
  ref: v0.165.1
  commit: 6083b2c53d78b21d0925b703194aaed920c01af5
- repo: opentelemetry-collector-contrib
  path: processor/tailsamplingprocessor/internal/sampling/rate_limiting.go
  lines: 28-37
  ref: v0.165.1
  commit: 6083b2c53d78b21d0925b703194aaed920c01af5
- repo: opentelemetry-collector-contrib
  path: processor/tailsamplingprocessor/internal/sampling/latency.go
  lines: 56-59
  ref: v0.165.1
  commit: 6083b2c53d78b21d0925b703194aaed920c01af5
- repo: opentelemetry-collector-contrib
  path: processor/tailsamplingprocessor/metadata.yaml
  lines: 52-63
  ref: v0.165.1
  commit: 6083b2c53d78b21d0925b703194aaed920c01af5
- repo: opentelemetry-collector
  path: service/telemetry/otelconftelemetry/factory.go
  lines: 54-58
  ref: v0.165.0
  commit: e883d737e49935984df6b064e512eed6cdc0d289
- repo: grafana
  path: pkg/services/query/query.go
  lines: 38-39
  ref: v13.3.1
  commit: 5db6ba887630c7fa12e5bfd063f2fa854025468c
- repo: grafana
  path: conf/defaults.ini
  lines: 375-375
  ref: v13.3.1
  commit: 5db6ba887630c7fa12e5bfd063f2fa854025468c
- repo: grafana
  path: public/app/plugins/datasource/tempo/plugin.json
  lines: 10-10
  ref: v13.1.0
  commit: b309c9bb3b81a748c3a75289236a27309ed2566a
- repo: grafana-tempo-datasource
  path: src/plugin.json
  lines: 9-9
  ref: origin/main
  commit: 3a5b3fa9b222f1020ece600d7ab453f51697bc0a
- repo: tempo
  path: modules/overrides/config.go
  lines: 242-242
  ref: origin/main
  commit: 150dae97feb94135145d187a2e9fe62d1265a209
unpinned: 3
---

# docs/monitoring/lgtm/thanos-slow-queries.md

## Findings

- L210 IMPRECISE corrigé : "span retiré de la branche principale de Thanos après la v0.42.4, donc absent des versions suivantes" est faux pour la v0.42.5, sortie le 2026-10-27 et qui émet encore `bucket_store_block_series`. Le retrait (commit df17ac2f, 2026-07-30) n'est que sur main, pas encore dans une release. Reformuler en "retiré de main, pas encore dans une release (v0.42.5 l'émet encore)". Preuve : pkg/store/bucket.go:1670 @ v0.42.5
- L32-L41 IMPRECISE corrigé : la liste des champs de `slow query detected` est complète pour la config par défaut, mais avec `--query-frontend.query-stats-enabled` le log porte aussi `peak_samples` et `total_samples_loaded`. Ajouter une phrase ou préciser "par défaut". Preuve : internal/cortex/frontend/transport/handler.go:268-305 @ v0.42.4

Verifie sans ecart : flags et defaut `0` (L23), champs et headers du slow log (L32-41), filtre `/api/v1` (L32), log émis par `defer` y compris sur erreur (L32), pas de `user_agent` (L46), `X-Thanos-Force-Tracing` et `SamplerWithOverride` (L63), 6 valeurs de `sampler_type` insensibles à la casse et repli `ParentBased(TraceIDRatioBased(1.0))` sur valeur inconnue (L99-102), `sampler_param` non numérique loggué (L102), samplers `parentbased*` depuis v0.35.0 via PR 7231 (L116), `--query.timeout` (L168), `num_traces` 50000 par défaut (L168), latence calculée du plus ancien début à la fin la plus tardive (L166), burst à 2x `spans_per_second` et citation `rate_limiting.go` (L181), métrique `count_traces_sampled` avec labels `policy` et `decision="sampled"` et nom sans `_total` par défaut côté Collector (L193), noms de spans (L206-211), `X-Dashboard-Uid`, `X-Panel-Id` et `send_user_header = false` dans `[dataproxy]` (L43), `annotations: false` du plugin Tempo dans le core jusqu'à la 13.1 et dans le plugin externe (L224), `max_bytes_per_trace` (L186).

Fraicheur : le Collector contrib a ajouté `sampling_strategy` (`span-ingest`) et `decision_wait_after_root_received`, et le défaut de `decision_wait` est 30s. Le raisonnement L166 vaut pour `trace-complete`, qui reste le défaut. La v0.42.5 de Thanos existe, `tested_with: Thanos 0.42` reste juste.

## Unpinned

- L133 la phrase "retient une trace si au moins une policy la juge à garder" n'est pas dans le README cité, seule la description de la métrique globale `global_count_traces_sampled` la suggère
- L187 la file d'export du SDK OpenTelemetry est de taille fixe et jette des spans quand elle est pleine (comportement du SDK, module non cloné)
- L186 la troncature d'une trace qui dépasse `max_bytes_per_trace` côté Tempo (seul le nom du paramètre est épinglé)
