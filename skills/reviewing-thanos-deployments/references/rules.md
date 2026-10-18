# Thanos review rules

Articles:

- T = <https://wiki.jdelgado.fr/monitoring/lgtm/thanos/> (written for Thanos 0.42)
- C = <https://wiki.jdelgado.fr/monitoring/lgtm/thanos-cache/> (tested with Thanos 0.35+, Redis Sentinel 6.2+)
- Q = <https://wiki.jdelgado.fr/monitoring/lgtm/thanos-query-concurrency/>

Each rule cites its article (T, C, Q) and the section anchor to append to the article URL.

## 0. Public URLs and anchors

Base URLs:

- T: <https://wiki.jdelgado.fr/monitoring/lgtm/thanos/>
- C: <https://wiki.jdelgado.fr/monitoring/lgtm/thanos-cache/>
- Q: <https://wiki.jdelgado.fr/monitoring/lgtm/thanos-query-concurrency/>

Anchors for T (append to the T URL):

- #thanos-at-scale-archi-perf-et-finops (H1)
- #thanos-mimir-ou-victoriametrics
- #larchitecture-high-level
- #annoncer-le-label-sur-lequel-on-filtre
- #le-chemin-dune-metrique
- #eviter-le-trafic-inter-zone
- #spot-pour-tout-ce-qui-se-rejoue
- #receive-le-composant-le-plus-cher
- #retention-et-downsampling
- #compacter-sans-payer-le-disque-24h24
- #un-shard-par-timerange
- #payer-de-la-capacite-disque-pour-acheter-du-debit
- #mutualiser-les-caches
- #mettre-des-limites-en-lecture-et-en-ingestion
- #gomaxprocs-le-parallelisme-quon-na-pas-choisi
- #nos-tests-et-nos-echecs
- #lecture-paresseuse-le-prix-du-rechargement
- #les-metriques-que-personne-naffiche
- #replication-le-choix-assume
- #garder-une-vingtaine-de-stacks-maintenables

Anchors for C (append to the C URL):

- #les-caches-thanos-mutualisation-dimensionnement-et-facture (H1; the intro paragraph and the "3 caches" list live here)
- #un-block-neuf-est-froid-partout
- #le-caching-bucket-ne-se-partage-pas-entre-tenants
- #dimensionner-le-cache-partage
- #memcached-ou-redis
- #le-gain-cote-facture

Anchors for Q (append to the Q URL):

- #la-concurrence-de-lecture-thanos-amplification-gates-et-diagnostic (H1)
- #une-requete-utilisateur-nest-pas-une-requete
- #decomposer-une-saturation-en-debit-et-en-duree
- #ordonner-les-limites-de-concurrence
- #lire-au-bon-pas-dechantillonnage
- #la-gate-sature-elle-ne-bloque-pas

## 1. Rules (checkable, "do X not Y")

Format: ID. rule | flag/field/value | WHY | source

### 1.1 Receive

R1. Filter at the source with `write_relabel_configs` on `remote_write`, not `metric_relabel_configs` | `write_relabel_configs` (drop `go_.*|process_.*|promhttp_.*`, high-cardinality `http_request_duration_seconds_bucket;/api/v1/.*`) | acts before ingestion so no storage, compaction or cardinality cost; local Prometheus retention stays complete; `metric_relabel_configs` would drop locally too (sidecar mode has no source filter) | T #thanos-mimir-ou-victoriametrics
R2. Size Receive memory on peak active series; a per-tenant `head_series_limit` only pays off in a shared multi-tenant Receive or with replication | `head_series_limit` in `--receive.limits-config-file` | Receive RAM follows active series count, not ingest rate. With a single replica and no receive HA, a 429 blocks every write of the tenant while it stays above the limit, whereas an OOM costs a restart and a WAL replay. Measured over 14 days on ~20 stacks: no cardinality explosion (biggest stack 0.86M to 3.7M daily, peak 4.6M, biggest 1h jump ~+1M), a limit at peak x 1.5 would never have fired; the tight stacks were short of memory, not of series | T #mettre-des-limites-en-lecture-et-en-ingestion
R3. When using `head_series_limit`, `meta_monitoring_url` must be set and reachable | `write.global.meta_monitoring_url` | without it `head_series_limit` is inert; if the endpoint is unreachable Receive stops limiting and only logs; Receive polls it every 15 s; data lags so the limit is always slightly exceeded; feature is experimental | T #mettre-des-limites-en-lecture-et-en-ingestion
R4. Know which code each limit returns: request limits (`series_limit`, `samples_limit`, `size_bytes_limit`) give 413 (Prometheus does not retry, data lost); `head_series_limit` gives 429 (`tenant is above active series limit`, retried per `retry_on_http_429`) | `request.series_limit: 1000`, `request.samples_limit: 10000`, `request.size_bytes_limit: 0`, `retry_on_http_429` | a too-low request limit amputates tenant metrics, a series limit only slows the tenant | T #mettre-des-limites-en-lecture-et-en-ingestion
R5. Use Ketama (not `hashmod`) for the hashring when the pool size will change | hashring algorithm `ketama` | with `hashmod`, adding a pod redistributes a large share of series and spikes memory on every pod; pod count is what lowers RAM per pod, Ketama makes changing it painless | T #receive-le-composant-le-plus-cher
R6. Split routing from ingestion: leave `--receive.local-endpoint` unset on routers | `--receive.local-endpoint` | a Receive without it is a pure router that stores nothing; many light routers in front of few ingesters means RAM is paid only on ingesters | T
R7. Do not enable extended postings caches or exemplars without need | `--tsdb.head.expanded-postings-cache-size` (and block equivalent), `--tsdb.max-exemplars` (0 by default) | experimental and off by default, paid directly in memory; with `--tsdb.max-exemplars=0` exemplars sent by `remote_write` are silently dropped | T
R8. Watch WAL segment count, not `up`, for Receive restarts; a restart replays WAL in memory before serving | metric: WAL segment count (continuous growth = compaction not keeping up) | if the pod OOMs mid-replay the WAL grows and the next replay is heavier: a restart becomes a long outage | T
R9. Set a memory limit for the Go GC on Receive: `GOMEMLIMIT` by hand, or `--enable-auto-gomemlimit` (off by default, `--auto-gomemlimit.ratio` default 0.9 of the container limit; checked in v0.42.4 `cmd/thanos/config.go`) | `GOMEMLIMIT`, `--enable-auto-gomemlimit` | without it the GC lets the heap grow until OOM kill instead of racing to stay under the threshold; a Receive OOM triggers a WAL replay, see R8 | T #receive-le-composant-le-plus-cher
R10. Receive stays on-demand with a dedicated priority class, not on spot | `priorityClassName: thanos-receive-critical`, `nodeSelector cloud.google.com/compute-class: thanos` | only component holding not-yet-uploaded data | T #spot-pour-tout-ce-qui-se-rejoue
R11. Replication factor is deliberately 1 (hashring and receive-controller deployed but flag not enabled); do not "fix" it without a SLA reason | replication factor flag, `receive-controller`, hashring ConfigMap | RF>1 multiplies memory (each replica keeps its own series in RAM on the on-demand component); resilience relies on 12 h local head retention + continuous upload; loss = non-uploaded window of that tenant, not history. With RF=2 and 2+ replicas spot would become possible but needs hashring/controller complexity | T #replication-le-choix-assume
R12. Do not confuse `--deduplication.replica-label=prom_replica` (HA Prometheus pairs) with Receive replication | `--deduplication.replica-label` | different mechanisms | T
R13. Each tenant must have its own set of external labels | external labels | prerequisite of vertical compaction: two producers with the same external labels get series mixed and unusable | T #retention-et-downsampling

### 1.2 Query (querier)

R14. Partial response is on by default (`--query.partial-response` defaults to `true`, verified v0.42.4): an absent flag means enabled. On a querier that serves alert rules, pass `--no-query.partial-response`, and enable it per request (`partial_response` param) only on human Grafana datasources | `--query.partial-response` / `--no-query.partial-response`, `partial_response` request param | partial response can silently under-report and miss an alert; a partial response is never cached, so cache is lost exactly when most needed (amplifier) | T #larchitecture-high-level. Note T says partial-response is enabled by default in Thanos
R15. `--store.response-timeout` must be set explicitly if latency is to be bounded: default `0ms` disables the timeout | `--store.response-timeout` (default 0ms), `--query.timeout`, `--query.partial-response` | without it a slow but alive store gateway is waited on up to `--query.timeout`; partial response only saves a really unreachable store; it is the pair of flags that bounds latency | T #spot-pour-tout-ce-qui-se-rejoue
R16. Global querier fan-out: make the external labels advertised by each stack contain the label queries filter on, so the global querier can prune. The label is deployment-specific: find it in the config (`--selector-label`, external labels, the label dashboards filter on) or ask for the GitOps repo; never assume a name | `--selector-label=<label>="<value>"` on each tenant querier | without it no matcher can contradict advertised labels, every query hits all stacks; all stacks served the same Series call rate within 0.4 % | T #annoncer-le-label-sur-lequel-on-filtre
R17. The advertised label must be (a) the label queries actually carry and (b) single-valued per stack | `--selector-label` | otherwise nothing is pruned, or the stack is dropped from queries for its other values | T
R18. Never set `--selector-label` as a template default; opt-in per stack. A stack ingesting 2 clusters cannot be annotated | `--selector-label` | one value per key and `ProxyStore.Series()` self-filters on it: second cluster returns EMPTY (silent read data loss); check every stack that ingests more than one value of the label | T
R19. Verify the label in the info endpoint, not in config | metric `thanos_store_nodes_grpc_connections`, `external_labels` | the advertised label set is what counts | T
R20. Count connected stores per querier pod then take the worst, not `max()` | `min(count by (pod) (thanos_store_nodes_grpc_connections > 0))` | the metric has one series per endpoint so `max()` is 1 regardless of fleet size | T
R21. Expect modest pruning gains: 28 % fewer calls on annotated stacks, not the 96 % targeted | n/a | stacks not annotated stay hit by 100 % of queries; of 417 dashboards hitting the global store, 71 have a cluster variable and 346 none; "All" renders as match-all regex | T
R22. Static store lists drift: derive `--endpoint.sd-config` from the same label selector as the stack generator, and sort the rendered list | `--endpoint.sd-config`, `sortAlpha` | ArgoCD ApplicationSet `clusters` generator does not guarantee order; list reorders, pod template hash changes, Deployment rolls with no change (11 times in 3 days) | T
R23. Global querier latency = slowest branch: reduce fan-out (pruning) or bound the tail with `--store.response-timeout` + `--query.partial-response` | `--store.response-timeout`, `--query.partial-response` | 150 ms p99 / 4 s tail on one stack yields 25 s user queries at ~20-stack fan-out; a 9-series selector that takes 26 s is waiting, not computing | T
R24. `--query.auto-downsampling`: max source resolution = step / 5, so step >= 25 min to read 5m and >= 5 h to read 1h | `--query.auto-downsampling` | a 24 h dashboard at 240 s step reads raw; downsampling only helps long time ranges | T #retention-et-downsampling
R25. `--grpc-compression=snappy` is marked "Deprecated after v0.43.0" (still accepted in v0.42.4). Replacement: `client_config.compression: snappy` per endpoint in `--endpoint.sd-config`, but in v0.42.4 and main the per-endpoint value is only read when that endpoint sets its own `tls_config` (`UseGlobalTLSOpts()` false), otherwise the global flag still wins: add `tls_config: {enabled: false}` with it | `--grpc-compression`, `--endpoint.sd-config` `client_config` | reduces billed inter-zone bytes; a migration that only sets `compression` silently drops to no compression | T #eviter-le-trafic-inter-zone
R26. Sort out `--query.max-concurrent-select`: it is a cap (min(selectors, 4)), not a multiplier | `--query.max-concurrent-select` (default 4) | real multiplier is number of vector selectors in the query | Q #ordonner-les-limites-de-concurrence Measured: queries carry 1.5 vector selectors on average (max ~3 over 5 min), so the cap rarely binds and lowering it to 3 clips almost nothing. Reading trap: the select gate gauge sums every query while the cap is per query (a peak of 468 for a cap of 64 is not saturation).
R27. PromQL engine decoding goroutines come from GOMAXPROCS/2 (`max(runtime.GOMAXPROCS(0)/2, 1)`), no Thanos flag: set GOMAXPROCS explicitly if consistency matters | `GOMAXPROCS`, `opts.DecodingConcurrency` | since Go 1.25 runtime reads cgroup CPU limit: only the component with a CPU limit is capped (global querier decoded on 4 shards vs 8 on leaves); components without CPU limit take node core count so parallelism changes with the autoscaler's node choice. It is hygiene, not an optimisation, when queries wait on the network | T #gomaxprocs-le-parallelisme-quon-na-pas-choisi
R28. Diagnose with the Thanos UI `Analyze` box before changing shard counts or CPU | UI `Analyze` | in the case studied: 1.88 s total, 1.38 s in leaf selector, 4 shards identical to the ms, pod CPU 0.3 core on a limit of 8: waiting on stores, not decoding | T

### 1.3 Query frontend

R29. Enable slow query logging from day 1 | `--query-frontend.log-queries-longer-than=10s` | shows which dashboard hurts; the slow log is where to find the responsible client, query, dashboard and panel | T, Q
R30. Keep `--query-range.max-query-parallelism` x `min(selectors, --query.max-concurrent-select)` below the smallest of downstream caps: the gate (`--store.grpc.series-max-concurrency`) and `--query.max-concurrent` | `--query-range.max-query-parallelism` (default 14), `--query.max-concurrent-select` (default 4), `--query.max-concurrent` (default 20), `--store.grpc.series-max-concurrency` (default 20) | defaults violate it: 14 x 4 = 56 vs gate 20; one 4-selector query asks ~3x the capacity; margin exists only because nobody queries concurrently. At parallelism >= gate cap ONE query saturates the gate on all stacks | Q #ordonner-les-limites-de-concurrence The invariant binds on wide queries: with 1.5 selectors on average the real product is ~14 x 1.5 = 21. Measured saturation of a gate at 50: 0.44 % of minutes over 7 days, on the history shard of the biggest stacks, from several concurrent queries (gate wait p99 1.6 s, p999 26 s).
R31. Fix both multipliers together: lowering split parallelism alone is not enough | `--query-range.max-query-parallelism`, `--query.max-concurrent-select` | fleet going 256 -> 14 on split saw peak amplification fall 74 -> 21 yet gate stayed pinned because select cap was still 64; a fleet at parallelism 14 still saw 50 concurrent calls per pod with select cap 64 | Q
R32. Compute querier saturation on the pool, not one pod | `--query.max-concurrent` | 3 queriers at 64 = 192 slots, filled by parallelism 50 with 4 wide concurrent queries (isolation problem); observed all 3 pinned at 64 while inbound stayed 6-13 req/s and subqueries hit 171/s | Q Traffic from a global querier reaches the regional queriers through the StoreAPI, which bypasses their PromQL gates: their `--query.max-concurrent` bounds nothing for it (max 1 in flight measured with a cap of 128).
R33. Do not copy a fleet's parallelism values blindly: the global frontend first ran `--query-range.max-query-parallelism=256` with its own result cache, now runs 14 like the stack frontends, since one wide query at high parallelism saturates the store gates of every stack. Check them against the invariant R30 like any other frontend | `--labels.max-query-parallelism`, `--query-range.max-query-parallelism` | the global frontend multiplies across every stack | T #larchitecture-high-level
R34. `--labels.max-query-parallelism` high values amplify label endpoints (template variables, hit at every dashboard load), but bypass the series gate (`queryGate.Start()` only called by `Series()`, not `LabelNames()`/`LabelValues()`) | `--labels.max-query-parallelism` | consumes memory and CPU through another door | Q
R35. Query split | `--query-range.split-interval=12h`, `--query-range.align-range-with-step` | 12 h slices make each slice reusable in cache; aligning bounds on step makes queries hit the same keys | T, C
R36. Instant queries (`/api/v1/query`) are NOT cacheable or split: no cache flag exists; only `--query-range.response-cache-*` (query_range) and `--labels.response-cache-*` (labels) | `--query-range.response-cache-*`, `--labels.response-cache-*`, `--query-frontend.vertical-shards` | instant queries are >70 % of frontend traffic (mostly alert rule evaluations), so split-interval/cache TTL tuning only affects < 1/3 of requests. Instant path does go through `newInstantQueryTripperware` (vertical sharding + retry, since v0.35.0). Measure the cacheable share before tuning cache | C #le-gain-cote-facture
R37. Do not expect cache hits for: `dedup=false`, store matchers, partial responses, any response with a warning | request params | frontend refuses to cache them regardless of cache size | C
R38. Frontend Redis cache config is a separate file from the store gateway's: no `enabled_items`, no `ttl`; TTL is `expiration` inside `config:`; share the file between the 2 endpoints | `--query-range.response-cache-config-file`, `--labels.response-cache-config-file`, `expiration: 24h` | frontend parser uses `yaml.UnmarshalStrict` on `{type, config}`: the component refuses to start with unknown keys | C #memcached-ou-redis
R39. The 3 IN-MEMORY caches expire differently; `validity` exists only in the frontend result cache and is checked at read | `validity`, `max_size`, `max_size_items` | no eviction: cache grows since pod start to its ceiling holding stale entries (0 evictions while entry count triples). Frontend result cache is not created if neither `max_size` nor `max_size_items` is set | C

### 1.4 Store gateway

R40. Set read limits on the store gateway; they are 0 (no limit) by default except concurrency. Size each limit from the measured largest call (R42), never from a copied value | `--store.limits.request-series`, `--store.limits.request-samples`, `--store.grpc.downloaded-bytes-limit`, set a margin above the measured maximum; `--store.grpc.series-max-concurrency` defaults to 20 | with RF=1 and spot store gateways one dashboard sweeping months of raw can saturate a store that then takes ~30 min to return; the commonly copied `request-series=2000000` sits 10x above the largest measured call and never fires. Absent limits are a gap to report, not N/A | T #mettre-des-limites-en-lecture-et-en-ingestion
R41. Use the non-deprecated flags | replace `--store.grpc.touched-series-limit` and `--store.grpc.series-sample-limit` with `--store.limits.request-series` and `--store.limits.request-samples` | deprecated, silently replaced | T
R42. Measure the size of a call before setting a per-request limit | metric `thanos_bucket_store_series_data_touched_bucket{data_type="series"}` (the `data_type` filter is mandatory; `postings` and `chunks` are an order of magnitude higher) | measured fleet: 98 % of calls touch <= 200 series (first bucket edge 200), biggest touches 200000, i.e. 10x below the 2000000 value commonly copied: limit never fires; pressure came from concurrent call count, not call size | Q #decomposer-une-saturation-en-debit-et-en-duree
R43. Do not read `thanos_bucket_store_queries_dropped_total` as proof the gate refused nothing | `thanos_bucket_store_queries_dropped_total` (label `reason` = series, chunks, bytes) | only incremented by limiters wired to `--store.limits.request-series`, `--store.limits.request-samples`, `--store.grpc.downloaded-bytes-limit` (all 0 by default): structurally 0 until set; circular reasoning | Q #la-gate-sature-elle-ne-bloque-pas
R44. Do not raise the gate cap to cure a rare saturation | `--store.grpc.series-max-concurrency` | gate queues, does not refuse: saturation shows as timeouts (`promgate.Start(ctx)` returns `ctx.Err()`, so `--query.timeout` / `--store.response-timeout`), not drops; 98 % of minutes were under 14 concurrent Series calls (p99 pinned at cap, ~100 min/week): raising the cap does nothing 98 % of the time and removes the bound during the 2 % that hurt; memory, not gate, was the active constraint | Q. A gate deliberately lowered or raised to bound store gateway RSS (OOMKills) is a memory bound: keep it and fix the multipliers above it (R30)
R45. Shard the store gateway by time range: 3 shards x 2 replicas; most recent shard starts at 3 h | `--min-time=-26h --max-time=-3h` (shard 0), `--min-time=-8d --max-time=-23h` (shard 1), `--max-time=-6d` (shard 2) | below 3 h Receive serves data; sizing follows access profile (history shard several tens of GiB RAM, hot shard modest); a 6-month query only hits the history shard (blast radius) | T #un-shard-par-timerange A shard whose `--max-time` is positive (e.g. `3h`) has no upper bound: it serves up to now, on top of what Receive serves.
R46. Overlap shard ranges on purpose; never use butt-joined bounds | `--min-time`, `--max-time` | Thanos docs recommend overlap; joined bounds guarantee a blind window when a replica is missing. Cost: a block straddling a boundary is loaded by both shards (double RAM and reads) | T
R47. Remember `--min-time` is the oldest bound (largest absolute value), `--max-time` the most recent; filtering is chunk-level so out-of-range points can come back | `--min-time`, `--max-time` | easy to invert | T
R48. For a single oversized tenant bucket, shard by external labels, combinable with time sharding | `--selector.relabel-config` | better than time sharding for that case | T
R49. Do not run the store gateway on node boot disk `emptyDir` on IO-bound instances: use a dedicated PVC sized for throughput | PVC on Hyperdisk Balanced; StorageClass `provisioned-iops-on-create` | index-header download saturates the boot disk (source of the 30 min recovery) | T #payer-de-la-capacite-disque-pour-acheter-du-debit
R50. On Hyperdisk Balanced, provision IOPS/throughput explicitly: capacity does not buy performance | `provisioned-iops-on-create`; first 3000 IOPS and 140 MiB/s free, rest billed; max provisionable `MIN(500 x GiB, 160000)`, min 6 GiB for 3000 base IOPS | default follows `6x + 3000`: 6 to 20 GiB moves 3036 to 3120 IOPS (+3 %); volume at 20 GiB only unlocks the ceiling, provisioned IOPS in the StorageClass cost and do the work | T
R51. Do not enable lazy index-header download; keep only lazy reader in memory | `--store.enable-index-header-lazy-reader` (kept), lazy download strategy (removed) | lazy download pushed p99 to ~224 s on wide historical dashboards | T #nos-tests-et-nos-echecs
R52. Know the lazy reader's cost: unload after idle (hidden flag `--store.index-header-lazy-reader-idle-timeout`, default 5m), reload cost = index-header size (driven by tenant cardinality: 2.1 GB heaviest vs 0.12 GB lightest, 17x; 20 s mean and 114 s p99 vs < 0.5 s). Raising the idle timeout to cover the working day (10h) keeps headers open between dashboard loads: -84 % load time measured on one stack, paid in resident memory. Hidden flag, recheck on every upgrade | `--store.enable-index-header-lazy-reader`, `--store.index-header-lazy-reader-idle-timeout`, residency `(load - unload) / blocks_loaded` | at 5m the first user after each idle gap pays a full reload; residency 0 to 9 % on oldest shard, hot shard unloads 18 to 32 times/hour/pod; not CPU (0.04 core) nor disk (< half busy) | T #lecture-paresseuse-le-prix-du-rechargement
R53. Graph the lazy-load metrics; do not histogram_quantile `thanos_bucket_store_indexheader_lazy_load_duration_seconds` | `thanos_bucket_store_indexheader_lazy_load_total`, `..._lazy_unload_total`, `..._lazy_load_duration_seconds`, `..._lazy_load_failed_total` | buckets skip 5, 15, 30, 60, 90, 120 then 300 s so quantiles > 5 s are interpolation artefacts; use `sum / count` for mean and count bucket crossings for tail. `lazy_load_failed_total` = lost header = silently incomplete results | T #les-metriques-que-personne-naffiche
R54. Alert on store readiness with `for: 30m`, built on StatefulSet replica deltas, not `up == 0` | `kube_statefulset_replicas{statefulset=~".*thanos-store.*"} - kube_statefulset_status_replicas_ready{...} > 0`, `for: 30m` | an evicted pod stuck Pending leaves the targets so `up == 0` never fires; spot recovery up to 30 min | T #spot-pour-tout-ce-qui-se-rejoue
R55. `--sync-block-duration` (default 15m) mostly changes `iter` calls: with a caching bucket, exists/get of meta files follow the cache TTLs (iter 5m, exists 2h, missing files 15m by default) and the bucket absorbs most of them (measured hits: exists 97 %, meta get 88 %, iter 51 %). 5m to 15m divides iter calls by 1.5 to 1.9, about 1 USD/month fleet-wide: not worth a dedicated rollout of spot store gateways (cold caches, index-header reloads), do it with the next planned restart. No freshness loss at 15m while Receive keeps hours of local head | `--sync-block-duration`, `--block-discovery-strategy`, caching bucket `blocks_iter_ttl`, `metafile_*_ttl` | object storage is billed per request, but the cache already removes most sync calls | C #le-gain-cote-facture
R56. Compaction backlog proxy is read from store gateways, not compactor gauges | `thanos_blocks_meta_synced{state="loaded", job=~".*thanos-store.*"}` (min now minus min offset 24h > 0, `for: 24h`) | see compactor section | T

### 1.5 Compactor

R57. Run the compactor as a CronJob with ephemeral volume when it only works minutes every few hours | `schedule: "0 */6 * * *"`, `persistence.ephemeral: true`, `storageClass: hyperdisk-balanced`, chart `compactor.enabled: false`, `ttlSecondsAfterFinished: 600`, `successfulJobsHistoryLimit: 1`, `failedJobsHistoryLimit: 1` | Deployment keeps PVC billed 24/7 for ~20 stacks for marginal use | T #compacter-sans-payer-le-disque-24h24
R58. CronJob must set `concurrencyPolicy: Forbid` | `concurrencyPolicy: Forbid` | 2 simultaneous compactors on the same bucket corrupt blocks; the Deployment guaranteed this for free | T
R59. Neutralise the stock `ThanosCompactIsDown` and replace it with kube-state-metrics CronJob rules | `ThanosCompactIsDown` (`absent()`/`up == 0`), `kube_cronjob_status_last_successful_time{cronjob=~".*thanos-compact.*"}` (`time() - ... > 12 * 3600`, `for: 30m`), `kube_job_failed{job_name=~".*thanos-compact.*", condition="true"} > 0` (`for: 5m`) | between runs there is no Pod/Service/target so the stock rule fires 23 h/24; 12 h window tolerates one missed 6 h cycle; the failed rule is best-effort because the 600 s TTL removes the failed Job after 10 min | T
R60. Do not alert on compactor backlog gauges in CronJob mode | `thanos_compact_todo_compactions`, `thanos_compact_todo_compaction_blocks`, `thanos_compact_todo_downsample_blocks`, `thanos_compact_todo_deletion_blocks`, `--compact.progress-interval`, `--wait`, `--wait-interval` | the 3 progress calculators are inside `if conf.wait` in `cmd/thanos/compact.go`; a CronJob runs without `--wait` so gauges never register and an alert on them never fires (worse than no alert); `--wait-interval` is useless without `--wait` | T
R61. Backlog alert that works in CronJob mode: `ThanosCompactBacklog` on the store gateways' `thanos_blocks_meta_synced{state="loaded"}` not decreasing over 24 h (`for: 24h`). Never `ThanosCompactGroupFailures` on `thanos_compact_group_compactions_failures_total` in CronJob mode: that counter lives in the compactor, which has no Service or scrape target between runs, so the alert never fires; failures are caught by the kube-state-metrics Job/CronJob rules (R59) | `thanos_blocks_meta_synced`, `kube_job_status_failed` | proxy only | T #compacter-sans-payer-le-disque-24h24
R62. Watch compactor logs, not just exit codes | `--no-debug.halt-on-error`, log `empty chunks happened, skip series` | downsampling can end with that warning without error: no halt, then retention deletes raw blocks with no downsampled replacement produced | T
R63. Compactor flag set and concurrency | `--deduplication.func=penalty`, `--deduplication.replica-label=prom_replica`, `--compact.enable-vertical-compaction`, `--block-files-concurrency=2`, `--compact.blocks-fetch-concurrency=1`, `--downsample.concurrency=1`, `--no-debug.halt-on-error` | concurrency flags at 1-2 on purpose (default 1; docs: one CPU core per unit of `--compact.concurrency`); raising turns a short job into an expensive one; halt-on-error prefers a red job to a silently degrading bucket | T
R64. Do not blindly enable `--deduplication.func=penalty` and `--compact.enable-vertical-compaction` | those flags | penalty dedups non bit-identical Prometheus replicas but still occasionally breaks `rate`/`irate`; vertical compaction mixes series if 2 producers share external labels | T
R65. Retention tiers | `retentionResolutionRaw: 45d`, `retentionResolution5m: 90d`, `retentionResolution1h: 430d` | 430 d rather than 365 d for year-over-year seasonal margin, 2 extra months nearly free at that resolution; 15 s to 1 h = 240x fewer points but 5 aggregates (count, sum, min, max, counter) so ~48x real before compression | T #retention-et-downsampling
R66. Never manage Thanos blocks with a bucket lifecycle policy or archive storage class | bucket lifecycle / Glacier Deep Archive | only the compactor knows raw/downsampled block dependencies; cited case: 6 months moved to Deep Archive to save ~50 USD/month, compactor retried every 5 min, object requests 1.1M to 40M/day, 13 USD to 480 USD/day-line, saving paid 10x | T
R67. Keep compactor retention tiers aligned with what store gateways actually serve | `retentionResolution*`, store gateway ranges | else paying for blocks nobody queries or querying data retention already deleted | T

### 1.6 Caches

R68. Know the 3 caches and their default state | `--index-cache.config` (only one active by default, IN-MEMORY, `--index-cache-size` 250 MB), `--store.caching-bucket.config` (only if config given), `--query-range.response-cache-config` (not created without `max_size` or `max_size_items`) | IN-MEMORY per replica means ~100 cold caches over ~20 stacks (3 shards x 2 replicas), ~1 GiB index cache + 2 GiB caching bucket each, store gateway ~230 GiB RAM for < 1 CPU core: paying for cache, not compute; eviction on spot loses the cache | C
R69. Prefer a shared backend (Redis, Memcached or Dragonfly) over per-pod IN-MEMORY caches | `type: REDIS` | one warm cache surviving evictions, one memory envelope instead of 100; with 2 replicas of a shard declared as one `dns+` endpoint, each request warms only one replica (1 in 2 chance of cold hit) | C
R70. Do not size a shared cache from the observed IN-MEMORY size | size derivation | IN-MEMORY size measures pod uptime not working set; moving to Redis with real TTL cut entries to 1/10 and raised hit ratio from 76 % to 91 %; oversizes by an order of magnitude | C
R71. Size on working set over the TTL window, P95 of the rolling window over >= 24 h, via subquery with explicit step | `increase(thanos_redis_operation_duration_seconds_count{operation="set"}[TTL])` (Memcached: `thanos_memcached_operations_total{operation="set"}`) x average entry size | an instant `increase` underestimates sawtooth stacks: 0.24 GiB snapshot vs 9 GiB P95 of rolling 24 h (37x); a subquery with no step "is a reliable way to take down the querier" | C #dimensionner-le-cache-partage
R72. Dedup factor for shared cache sizing: replicas per shard is only the upper bound, never the pod count. Replicas of a shard load the same blocks but each caches the chunks its own queries touched: 2 replicas measured a factor of 1.4, not 2. Measure it (IN-MEMORY sum per shard vs union in the shared backend) or divide by 1.4 per 2 replicas as a starting point | divide by the measured overlap (3 shards x 2 replicas: 1.4, not 2, never 6) | dividing by 6 undersizes by 3x+, dividing by 2 still undersizes | C #dimensionner-le-cache-partage
R73. Index cache bounds from remaining IN-MEMORY pods | `thanos_store_index_cache_items_size_bytes`, `thanos_store_index_cache_items_evicted_total` | low bound = sum per shard of the peak of the most loaded replica; high bound = sum over all pods; an evicting pod is at its `max_size` so its value is a floor; result still an upper bound (evicting caches readmit keys); real working set found by raising the ceiling in steps until eviction rate collapses | C
R74. Caching bucket subranges live 24 h by default; the Redis `expiration` field does NOT govern them | `chunk_subrange_ttl` (24h default), `expiration` | with `expiration: 2h` sampled keys still carried TTL 24h; target the 24 h working set. If cache caps earlier, memory bounds retention: compare `evicted_keys` vs `expired_keys`; evictions dominating means raise `maxmemory` | C
R75. Size container `limits.memory` on RSS with an absolute margin, not a ratio | `maxmemory` + fixed ~2 GiB margin | allocator retention not tied to cache size: 1.4 GiB retention on a keyspace plateauing at 236 MiB, versus 50 MiB overhead on 3.2 GiB at full fill; backend does not pre-allocate (an instance with 8x `maxmemory` can have smaller RSS) | C
R76. `max_size` is binary: `2GB` parses as 2 GiB | `max_size` | 100 pods x `1GB` = 100 GiB not 100 GB; 7 % gap shows on the bill | C
R77. Do not share a caching bucket between tenants on Thanos < v0.35.0 (fixed in v0.35.0: `BucketCacheKey.String()` adds `ObjectStorageConfigHash`); check key naming in `CachingBucket` code of your version before pooling; Redis `prefix` isolates keyspaces on any version (Memcached has no equivalent) | `blocks_iter_ttl`, `metafile_exists_ttl`, `metafile_doesnt_exist_ttl`, `metafile_content_ttl`, Redis `prefix` | block iteration listing key was the root path, identical across tenants; a tenant reads another's block list, finds none of the ULIDs and classes all as `partial` (`cached=0 returned=0 partial=73`); store gateway stays `Ready`, serves no historical data, long queries return partial results with no error | C #le-caching-bucket-ne-se-partage-pas-entre-tenants
R78. A single-tenant canary does not validate sharing | n/a | it validates protocol, NetworkPolicy, TTL, hit ratio but says nothing about cross-tenant key collisions | C
R79. Index cache on shared Redis uses its own db when caching bucket is on the same backend | `db: 1` (index cache) beside `db: 0` (caching bucket) | allows `FLUSHDB` on the index cache alone without losing chunks | C
R80. If IN-MEMORY base config comes from shared Helm values, override per stack as a YAML string, not a map | `indexCacheConfig: |` | Helm deep-merges maps so `max_size` etc. leak into the REDIS config | C
R81. Redis: point at Sentinel service and set `master_name`; on Sentinel >= 6.2 set `sentinel resolve-hostnames yes` | `addr: redis-sentinel.<namespace>.svc.cluster.local:26379`, `master_name`, `sentinel resolve-hostnames yes` | otherwise after failover Thanos talks to the old master (`can't write against a read only replica`) and replica IPs accumulate | C
R82. Redis is a startup dependency: roll cache resize first, then the config change | n/a | client connects at creation; store gateway with unreachable backend crashloops at boot until cache returns; restarting the cache during a store gateway rollout triggers it | C
R83. `cache_size` > 0 enables a client-side cache over Redis | `cache_size` (example 0) | useful for repeated keys (dashboard refreshed every 30 s) | C
R84. Expected log burst right after switching: `failed to cache series in memcached err=the async buffer is full` (keeps "memcached" wording on Redis) | `max_async_buffer_size` | async write queue overflows while cache is cold; writes dropped, queries untouched; tune only if it persists | C
R85. Dragonfly (Redis protocol, multi-threaded) is a valid shared backend; its operator pitfalls | `--proactor_threads`, port `admin` for metrics, NetworkPolicy, `dragonfly_evicted_keys_total`, `dragonfly_expired_keys_total` | metrics only on separate `admin` port and the operator's default NetworkPolicy blocks Prometheus (add a NetworkPolicy, do not disable the operator's: policies are additive); no HTTP `/metrics` on the RESP port (timeout); the 2 counters are not declared while 0 so panels show "No data" (use used memory reaching `maxmemory` as eviction signal) | C
R86. Memcached vs Redis | n/a | Memcached: simple but not horizontally scalable (client shards, HA is work); Redis: Sentinel failover and real cluster behaviour, slightly higher ops cost | C
R87. A new compacted block is cold in every cache whatever the backend | n/a | keys carry the block ULID, each compaction level creates a new one; first long query reads chunks from object storage (`get_range` 6-8 s p99, `Series` ~16 s p99, index cache hit ratio 0.95 to 0.8; same query a few minutes later ~1 s). Nothing to optimise on the query side | C #un-block-neuf-est-froid-partout

### 1.7 Cross-cutting (zones, spot, limits, GitOps)

R88. Keep all components of a stack in the SAME zone | pod anti-affinity/topology: single zone; bucket regional in the same region | inter-zone traffic within a region is billed on GCP (free inside a zone); arrows in the data path are billed traffic (Receive upload, store gateway re-download on cache miss, gRPC series to querier, global fan-out); a bucket in another region or multi-region pays egress on every read | T #eviter-le-trafic-inter-zone
R89. Accept zone-loss trade-off explicitly | single-zone stack | a stack dies with its zone (same trade-off as RF=1); history stays in bucket | T
R90. Put every stateless/replayable component on a dedicated spot pool; only Receive on-demand | `nodeSelector cloud.google.com/compute-class: thanos-spot`, toleration `kubernetes.io/arch=arm64` | evicted querier is retried elsewhere, store gateway re-downloads index-headers (up to 30 min to be ready), compactor resumes at next run; ARM stacks with spot on price/performance | T
R91. Do not rely on gRPC batching tuning | batching since 0.41 (up to 64 series per `SeriesResponse`, `DefaultResponseBatchSize`); flag `query.series-response-batch-size` removed | 64 is the default batch size not a gain factor; no config gives it, upgrade does | T
R92. Pin to the Thanos version you read the docs for; flags and defaults move and some are deprecated silently | e.g. `--store.grpc.series-sample-limit` -> `--store.limits.request-samples` | wiki written for Thanos 0.42 (cache article tested 0.35+) | T, C
R93. One tenant, one stack; do not share a multi-tenant cluster by default | one bucket, namespace, receive, store gateways, querier per source cluster | blast radius stops at namespace, per-tenant sizing, no noisy neighbour on ingestion; cost is ~20 compactors/queriers/store gateways to operate | T
R94. Size a stack on query workload, not data volume | n/a | fan-out load follows the query workload: stacks rise and fall together 17.7 to 45.1 calls/s over 24 h within a few percent of each other | T
R95. Generate stacks from an ArgoCD ApplicationSet on a cluster label selector; layer Helm values common -> thanos-common -> `thanos-<type>` -> `thanos-<tenant>` with `ignoreMissingValueFiles: true`; one glob per layer, layers ordered | `ignoreMissingValueFiles: true`, `valueFiles` glob | adding a cluster needs no MR; glob expands alphabetically so precedence only matters between layers | T #garder-une-vingtaine-de-stacks-maintenables
R96. Do not right-size CPU of a memory-bound component expecting savings | global querier CPU request 4 vs measured peak 0.31 | on a highmem node (~7.8 GiB per vCPU) 45 GB RAM already pins 5.3 vCPU: lowering the request frees no node nor pod density; binding dimension is memory | T
R97. Put the concurrency invariant in the manifest as a comment on each multiplier naming the downstream cap | comments on the 4 flags of R30 | flags live in different config blocks/files and nothing links them | Q #ordonner-les-limites-de-concurrence
R98. Measure pathological latency at p999/p9999, not p99 | quantile choice | pathological queries were 0.12 % of traffic: p99 read 0.15 s while p999 4 s and p9999 5.3 s (30x hidden); on the gate, p99 and p999 both 10-17 ms but p9999 95 ms ruled out queueing | T #nos-tests-et-nos-echecs
R99. Read a gate panel with a subquery wrapped in `max_over_time` with explicit step and range covering the display step | `max_over_time((max by (pod) (thanos_query_concurrent_gate_queries_in_flight) / on (pod) max by (pod) (thanos_query_concurrent_gate_queries_max))[$__interval:1m])` | gate jumps 0 to cap inside one scrape: at a 30 min step raw panel shows 0 while the enveloped one shows 1; `[5m:1m]` on a 30 min panel leaves 25/30 min blind; `[5m:]` takes server `evaluation_interval` (1 min default) so results vary per Prometheus; divide by exported `_max` not a hard-coded number | Q #lire-au-bon-pas-dechantillonnage
R100. Count the fleet with `count(group by (pod) (up{...} == 1))`, never with the `max_over_time` used for peaks | `count(group by (pod) (up{...} == 1))` | a 24 h `max_over_time` resurrects pods of replaced ReplicaSets (believing 24 queriers with 7 saturated when there are 3, all saturated) | Q
R101. For sizing numbers use a percentile of a rolling multi-day window with explicit subquery step, not an instant `increase([2h])` | `increase(<counter>[2h])`, subquery | instant read is an arbitrary sample, underestimates bursts | Q
R102. Use `ThanosStoreIsDown`-style alerting windows consistent with spot recovery (30 m), see R54 | `for: 30m` | else night pages for nothing | T

Total rules: 102 (R1 to R102).

## 2. Diagnostic procedures

### D1. Store gateway gate saturated while inbound traffic is flat (Q)

1. Identify the amplification chain: user request x split slices (`--query-range.split-interval`, up to `--query-range.max-query-parallelism` in parallel) x vector selectors (capped by `--query.max-concurrent-select`) x fan-out to stacks. Per pod: at least the parallelism (and parallelism x min(selectors, 4) in reality); across fleet: parallelism x number of stacks (Q).
2. Time-range sharding concentrates load: a 7-day dashboard hits the same shard on all stacks (2 pods per stack) (Q).
3. Decompose with Little's law `in_flight = lambda x T` (Q):
   - lambda per pod: `sum by (namespace, pod) (rate(thanos_bucket_store_series_gate_queries_total[5m]))`
   - T mean (includes gate wait, since `queryGate.Start()` is the first call of `Series()`): `sum by (namespace, pod) (rate(grpc_server_handling_seconds_sum{grpc_method="Series"}[5m])) / sum by (namespace, pod) (rate(grpc_server_handling_seconds_count{grpc_method="Series"}[5m]))`
   - Found: normal to peak, throughput x4.5, duration x190 (0.7 ms to 132 ms): duration dominates, a QPS graph alone says nothing about saturation (Q). Tail matters too: last 0.1 % of calls take seconds.
4. Pick the lever per term: bound lambda via upstream multipliers; bound T via `--store.limits.request-series` / `--store.limits.request-samples` (0 by default) but only after measuring call size with `thanos_bucket_store_series_data_touched_bucket{data_type="series"}` (Q).
5. Order the 4 limits (Q), table:
   - `--query-range.max-query-parallelism` (query frontend, default 14)
   - `--query.max-concurrent-select` (querier, default 4; clips `min(selectors, 4)`)
   - `--query.max-concurrent` (querier, default 20, PromQL queries per pod)
   - `--store.grpc.series-max-concurrency` (store gateway, default 20, Series calls per pod)
   Invariant: parallelism x min(selectors, max-concurrent-select) < min(gate, max-concurrent). Defaults give 14 x 4 = 56 vs 20. Threshold 1: parallelism reaches gate cap, one query saturates all stacks' gates. Threshold 2: parallelism nears `--query.max-concurrent`: isolation issue, computed on the whole querier pool (3 x 64 = 192).
6. Read at the right sampling (see R99 query): raw panels at 30 min step hide the spike.
7. Prove queueing vs refusal: `thanos_bucket_store_series_gate_queries_duration_seconds` (wait histogram); do NOT use `thanos_bucket_store_queries_dropped_total` (R43). Saturation shows as timeouts (`--query.timeout`, `--store.response-timeout`).
8. Check distribution over 7 days at 1 min step, max over fleet: 98 % of minutes below 14 concurrent calls, p99 pinned at cap (about 100 min/week). Ask "what produces the 2 %", not "is the limit too low". Find the client in the query frontend slow log (`--query-frontend.log-queries-longer-than=10s`). Almost never raise the gate (Q).
9. Gate metrics: `thanos_query_concurrent_gate_queries_in_flight`, `thanos_query_concurrent_gate_queries_max`.

### D2. Slow global queries on trivial selectors (T)

1. Latency = slowest of ~20 branches; check tails (p999/p9999), not p99.
2. Check pruning: is `--selector-label` set and visible in `external_labels` on `thanos_store_nodes_grpc_connections`? Compare `Series` call rate per stack: identical to 0.4 % means no pruning.
3. Check whether dashboards carry the cluster label (variable on "All" = regex match-all).
4. Bound the tail: `--store.response-timeout` + `--query.partial-response` per datasource (Grafana human only), never for alert rules.
5. Use Thanos UI `Analyze` to see where the time goes (T).

### D3. First query after idle is very slow (T)

1. Graph residency `(thanos_bucket_store_indexheader_lazy_load_total - thanos_bucket_store_indexheader_lazy_unload_total) / blocks_loaded`.
2. Use `lazy_load_duration_seconds` `sum / count` (not histogram_quantile).
3. Rule out CPU and disk (container CPU, disk busy time) before blaming them.
4. Reload cost depends on index-header size (tenant cardinality). Lever is faster disks or fewer series, not a flag.

### D4. Cache sizing (C)

1. Admission volume: `increase(thanos_redis_operation_duration_seconds_count{operation="set"}[TTL])` x average entry size.
2. Take P95 of rolling window over >= 24 h with subquery and explicit step.
3. Divide by replicas per shard only.
4. Index cache bounds from IN-MEMORY pods (low = per-shard max replica peak; high = all pods sum); then raise ceiling by steps until eviction rate collapses.
5. Caching bucket: working set of 24 h (`chunk_subrange_ttl`); compare `evicted_keys` and `expired_keys`.
6. Container memory: `maxmemory` + ~2 GiB, measured on RSS.
7. Before tuning cache or split: measure cacheable share (instant queries >70 % of frontend traffic, never cached).

### D5. Compaction health in CronJob mode (T)

1. CronJob staleness: `time() - kube_cronjob_status_last_successful_time{cronjob=~".*thanos-compact.*"} > 12 * 3600`.
2. Failed jobs: `kube_job_failed{job_name=~".*thanos-compact.*", condition="true"} > 0`.
3. Backlog proxy on store gateways: `min(thanos_blocks_meta_synced{state="loaded", job=~".*thanos-store.*"}) - min(... offset 24h) > 0` for 24 h.
4. Failures: the Job/CronJob rules of steps 1-2 only. `thanos_compact_group_compactions_failures_total` is never scraped in CronJob mode (R61).
5. Logs for `empty chunks happened, skip series`.

### D6. Receive memory (T)

Reduce active series (relabel, `head_series_limit`), then Ketama + more pods, then router/ingester split; watch WAL segments; set GOMEMLIMIT. Do not cap RAM.

### D7. Choosing a query step for downsampling (T)

Source resolution = step / 5: step >= 25 min for 5m blocks, >= 5 h for 1h blocks; otherwise raw is read.

### D8. Pick which label to advertise (T)

Label must be what queries carry AND single-valued per stack; usually one candidate (deployment-specific: read it from the config).

### D9. Count in-flight querier fleet and stores

`min(count by (pod) (thanos_store_nodes_grpc_connections > 0))`; `count(group by (pod) (up{...} == 1))`.

### D10. Alert for store readiness (T)

Compare StatefulSet desired vs ready replicas with `for: 30m`.

## 3. Anti-patterns a reviewer would miss

1. Default concurrency limits already violate the invariant (14 x 4 = 56 vs gate 20) and nothing breaks until traffic grows; `--query.max-concurrent-select` is a cap, the multiplier is the selector count (Q).
2. Lowering `--query-range.max-query-parallelism` alone does not fix gate saturation; the select cap (64 in one fleet) keeps the product high (Q).
3. Copying `--store.limits.request-series=2000000` as a "safety" setting: real max call was 200000 so it never fires; the real problem is concurrent calls (Q). And `thanos_bucket_store_queries_dropped_total` at 0 proves nothing (Q).
4. Raising the series gate cap to cure saturation: 98 % of the time it does nothing, and removes the only bound during the 2 % spikes; memory is the real constraint (Q).
5. Partial response (on by default) without `--store.response-timeout` (0ms by default) only drops stores that error: a slow store fails the whole query at `--query.timeout` (T); enabling partial response for alert callers risks silent missed alerts and kills caching (T).
6. `--selector-label` on a stack that ingests 2 clusters returns empty for the second one: silent data loss; never a template default (T).
7. Advertising labels nobody queries on (Receive labels) gives zero pruning; and most dashboards (346 of 417) have no cluster filter, so real gain was 28 % not 96 % (T).
8. Sharing a caching bucket across tenants on Thanos < v0.35.0: iteration cache key collision makes the store gateway Ready, healthy, and serving no historical data (`partial=73`); a single-tenant canary can not detect it (C).
9. Sizing a shared cache from the IN-MEMORY cache size (measures pod uptime, not working set), from an instant `increase`, or dividing by total pod count rather than replicas per shard (C).
10. Redis `expiration` does not govern caching bucket chunk subranges (`chunk_subrange_ttl`, 24 h) and the frontend cache config file rejects `enabled_items`/`ttl` (UnmarshalStrict: component won't start) (C).
11. Compactor as a CronJob: no `concurrencyPolicy: Forbid` corrupts blocks; stock `ThanosCompactIsDown` fires 23 h/24; `thanos_compact_todo_*` gauges are never registered without `--wait`, so alerts on them silently never fire (T).
12. Bucket lifecycle policies / archive storage classes on a Thanos bucket: compactor retry loop turned a 50 USD/month saving into a 10x higher API bill (T). Also `--no-debug.halt-on-error` does not catch downsampling "empty chunks" warnings, so raw blocks can be deleted with no downsampled replacement (T).
13. `head_series_limit` is inert without a reachable `meta_monitoring_url`, and request limits (413) lose data while series limit (429) just slows (T).
14. Dashboards read at coarse step: a saturation gate panel at 30 min step shows 0 while gate is full; `max_over_time` over 24 h resurrects dead pods; `[5m:]` depends on server evaluation_interval; p99 hides 0.1 % pathologies (Q, T).
15. Instant queries (>70 % of frontend traffic) are never cached nor split: cache/split tuning affects < 1/3 of traffic (C).
16. `ThanosStoreIsDown` on `up == 0` never fires for a Pending evicted pod, and `for: 5m` pages on normal 30 min spot recovery (T).
17. `--grpc-compression=snappy` is deprecated after v0.43.0; `--store.grpc.touched-series-limit` and `--store.grpc.series-sample-limit` are deprecated; `query.series-response-batch-size` is gone (T).
18. Lazy reader (`--store.enable-index-header-lazy-reader`) shifts cost to the first query (up to 114 s p99 for the heaviest tenant); lazy download made p99 about 224 s and was removed (T).

(Top 12 for the skill if space is tight: 1, 3, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16.)
