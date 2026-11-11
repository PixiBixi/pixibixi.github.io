---
article: docs/monitoring/lgtm/grafana_datasource_perf.md
checked: '2026-11-11'
commit: 91019bcf57a4f88f9c3faf1f5ca799b46157d2df
sources:
  - repo: grafana-prometheus-datasource
    path: packages/grafana-prometheus/src/querycache/QueryCache.ts
    lines: 32-155
    ref: origin/HEAD
    commit: 35dd011544698afc067266cda3c0163a1aae9bf8
  - repo: grafana-prometheus-datasource
    path: packages/grafana-prometheus/src/datasource.ts
    lines: 110-124,214-219,477-490
    ref: origin/HEAD
    commit: 35dd011544698afc067266cda3c0163a1aae9bf8
  - repo: grafana-prometheus-datasource
    path: packages/grafana-prometheus/src/caching.ts
    lines: 13-64
    ref: origin/HEAD
    commit: 35dd011544698afc067266cda3c0163a1aae9bf8
  - repo: grafana-prometheus-datasource
    path: packages/grafana-prometheus/src/language_utils.ts
    lines: 350-380
    ref: origin/HEAD
    commit: 35dd011544698afc067266cda3c0163a1aae9bf8
  - repo: grafana-prometheus-datasource
    path: packages/grafana-prometheus/src/configuration/PromSettings.tsx
    lines: 285-480
    ref: origin/HEAD
    commit: 35dd011544698afc067266cda3c0163a1aae9bf8
  - repo: grafana
    path: pkg/services/caching/service.go
    lines: 25-60
    ref: origin/main
    commit: 89806dfbbf73eb2fb62f277648e912647d2186c5
  - repo: grafana
    path: pkg/services/caching/metrics.go
    lines: 15-40
    ref: origin/main
    commit: 89806dfbbf73eb2fb62f277648e912647d2186c5
  - repo: grafana
    path: pkg/middleware/middleware.go
    lines: 28-29
    ref: origin/main
    commit: 89806dfbbf73eb2fb62f277648e912647d2186c5
  - repo: grafana
    path: docs/sources/administration/data-source-management/_index.md
    lines: 116-190
    ref: origin/main
    commit: 89806dfbbf73eb2fb62f277648e912647d2186c5
  - repo: terraform-provider-grafana
    path: internal/resources/grafana/resource_data_source_cache_config.go
    lines: 33-175
    ref: v4.28.1
    commit: 777c1dd118d4d0fb02cbaf1d54c9e31a3c736c3a
  - repo: terraform-provider-grafana
    path: internal/resources/grafana/resource_data_source.go
    lines: 170-195,385-400
    ref: v4.28.1
    commit: 777c1dd118d4d0fb02cbaf1d54c9e31a3c736c3a
  - repo: thanos
    path: pkg/queryfrontend/roundtrip.go
    lines: 27-31,105-160
    ref: origin/main
    commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
  - repo: thanos
    path: pkg/queryfrontend/queryrange_codec.go
    lines: 55-135
    ref: origin/main
    commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
  - repo: thanos
    path: pkg/queryfrontend/split_by_interval.go
    lines: 25-35
    ref: origin/main
    commit: df1f3f3d5e72769dc639cb6006a7972b168672ce
unpinned: 5
---

# docs/monitoring/lgtm/grafana_datasource_perf.md

## Findings

- L36 IMPRECISE corrigé : la requête partielle part de `max(prevTo - overlap, from)` mais ce début est ensuite arrondi vers le bas à l'`interval` de la requête (`incrRoundDn`), donc la fenêtre demandée est un peu plus large que les 15 minutes annoncées en L38. Ajouter "arrondi à l'interval" ou dire "un peu plus de 15 minutes". Preuve : packages/grafana-prometheus/src/querycache/QueryCache.ts:128-134 @ 35dd011544698afc067266cda3c0163a1aae9bf8
- L48 IMPRECISE corrigé : la signature du target contient aussi le flag `exemplar`, et l'interval comparé est `query.interval ?? request.interval`. Un changement d'exemplar force donc aussi une requête complète. Preuve : packages/grafana-prometheus/src/datasource.ts:214-219 @ 35dd011544698afc067266cda3c0163a1aae9bf8
- L49 IMPRECISE corrigé : la condition pour une requête partielle est `newTo > prevTo && newFrom <= prevTo`, donc un `newTo` égal à `prevTo` (rafraîchissement sans avancée) retombe aussi sur une requête complète, pas seulement `newTo` avant. Écrire "ne prolonge pas strictement". Preuve : packages/grafana-prometheus/src/querycache/QueryCache.ts:120 @ 35dd011544698afc067266cda3c0163a1aae9bf8

Tout le reste est confirmé : défaut `10m` de l'overlap, option beta, désactivation sur instant, `$__range`, public dashboard, `rangeRaw.to` sans `now`, clé par dashboard+panel+refId, condition sur `request.targets`, `Map` en mémoire, valeurs du tableau `cacheLevel` (arrondi 1/10/60 min, métadonnées 1/7/30 jours, debounce 350/600/1200 ms, `Low` par défaut), `queryLabelValues` utilisé par les variables, `timeInterval` à `15s`, section Performance de l'onglet Settings, header `X-Cache` (HIT, MISS, BYPASS), `X-Cache-Skip: true`, noms des 2 histogrammes `grafana_caching_*`, `OSSCachingService` vide, doc Grafana sur Prometheus et Loki, TTL par panel dans Query options, disponibilité Enterprise et Cloud, clé de cache et arrondi à l'interval, schéma de `grafana_data_source_cache_config` en 4.28.1 (défauts, suppression qui désactive), réinjection de `enableSecureSocksProxy` et `secureSocksProxyUsername`, labels `op` du query frontend (`query_range`, `label_values`), métriques `thanos_query_frontend_queries_total` et `thanos_frontend_split_queries_total`, `FormValue` dans `DecodeRequest`. Le provider est à la 4.51.1 au moment du check, le schéma du cache config n'a pas bougé depuis 4.28.1.

## Unpinned

- L70 : les variables sont renvoyées à chaque stack interrogée à chaque chargement (comportement observé, pas de code).
- L90 : pas d'accès à `/metrics` sur Grafana Cloud et recherche `.*cach.*` vide dans la datasource d'usage (constat d'environnement).
- L176 : apply à `0 changed` à cause d'une boucle locale du module (retour d'expérience).
- L178 : l'API de cache renvoie `enabled: false` tant que le cache n'a pas été activé dans l'UI (comportement serveur Enterprise, code fermé).
- L94 : le `POST` en `application/x-www-form-urlencoded` lu par `FormValue` est confirmé côté codec, mais la clé de cache finale du query frontend n'a pas été tracée de bout en bout.
