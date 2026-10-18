---
name: reviewing-thanos-deployments
description: Use when reviewing, writing or sizing a Thanos deployment (Helm values, manifests, component flags, alert rules, cache config) or diagnosing Thanos read path saturation - store gateway gate pinned, slow global queries, first query after idle endless, Receive OOM, compactor alerts that never or always fire, cache sizing for Redis, Memcached or Dragonfly.
---

# Reviewing Thanos deployments

Field rules from running ~20 single-tenant Thanos stacks behind a global querier on GKE (Thanos 0.42, caches 0.35+). Source of truth, with numbers and reasoning:

- Architecture, perf and FinOps: <https://wiki.jdelgado.fr/monitoring/lgtm/thanos/>
- Caches: <https://wiki.jdelgado.fr/monitoring/lgtm/thanos-cache/>
- Read concurrency: <https://wiki.jdelgado.fr/monitoring/lgtm/thanos-query-concurrency/>

The full rule set (R1-R102, flags, defaults, metrics, anchors) is in `references/rules.md`. Read the section of each component the change touches before concluding.

## Review procedure

1. Note the Thanos version (image tag). Flags and defaults move: check every flag against it (rule R92).
2. With a wrapper chart (bitnami `thanos`, a local umbrella chart, hand-written `extraFlags`/`args`), read flags on the rendered manifests (`helm template` per stack), not on the values: layers override each other and some flags only exist in a template.
3. Deployment-specific names (the label stacks are pruned on, tenant labels, cluster or datacenter labels) come from the config itself. When the diff does not show them, ask for the GitOps repo instead of assuming a name.
4. For each component present, walk its checklist below, then its section in `references/rules.md`.
5. Compute the concurrency invariant with the real values whenever any of its 4 flags is set or left at default.
6. Check alert rules against how the component actually runs (CronJob, spot, Pending pods).
7. Report in the output format below.

## Checklist by component

**Concurrency invariant (query frontend + querier + store gateway).** `--query-range.max-query-parallelism` (default 14) x `min(selectors, --query.max-concurrent-select)` (default 4) must stay below `min(--store.grpc.series-max-concurrency, --query.max-concurrent)` (both default 20). Defaults already break it (56 vs 20). Once parallelism alone reaches the gate cap, one query saturates the gate on every stack. A `--query.max-concurrent-select` raised far above 4 removes the cap: the multiplier becomes the raw selector count. A gate sized to bound store gateway RSS (set after OOMKills) is a memory bound, keep it. The invariant binds on wide queries: measured queries average 1.5 selectors, and gate saturation came from several concurrent queries on the history shard, not one wide query. A global querier reaches regional queriers through the StoreAPI, which bypasses their PromQL gates. Fix both multipliers together, global frontend included, compute `--query.max-concurrent` on the whole querier pool, and comment each multiplier with the downstream cap it must respect.

**Querier.**

- `--query.partial-response` without `--store.response-timeout` bounds nothing: the timeout defaults to `0ms` (disabled).
- Partial response on a querier used by the ruler or alerting can silently miss alerts, and partial responses are never cached. Enable it per request on human Grafana datasources only.
- `--selector-label` must never be a template default: a stack ingesting 2 values of the label returns EMPTY for the second one (silent data loss). Opt in per stack, single-valued label that queries actually carry. Check every stack where it is set against what that stack really ingests.
- `--grpc-compression` is deprecated after v0.43.0. Its replacement, `client_config.compression` per endpoint in `--endpoint.sd-config`, is ignored unless that endpoint also sets its own `tls_config` (e.g. `enabled: false`): the global flag still wins otherwise.

**Store gateway.**

- Never raise `--store.grpc.series-max-concurrency` to cure saturation: the gate queues, it does not refuse. Saturation shows as timeouts, most minutes are far below the cap, and raising it removes the only bound during the spikes. Find the client in the query frontend slow log.
- `--store.limits.request-series=2000000` is a copied value that never fires (measured largest call: 200000 series). Measure `thanos_bucket_store_series_data_touched_bucket{data_type="series"}` first.
- `thanos_bucket_store_queries_dropped_total` at 0 proves nothing: it only counts limiters that are 0 (off) by default.
- Time shards must overlap; butt-joined `--min-time`/`--max-time` bounds guarantee a blind window when a replica is missing. `--min-time` is the oldest bound.
- No `emptyDir` on the node boot disk: index-header download saturates it (30 min recovery). Dedicated PVC with provisioned IOPS/throughput; on Hyperdisk Balanced capacity does not buy performance.
- `--sync-block-duration` below the 15m default barely costs anything behind a caching bucket (only `iter` calls depend on it, ~1 USD/month fleet-wide measured): not worth a dedicated rollout, fix it at the next planned restart.
- Keep the lazy reader, never lazy index-header download (p99 ~224 s). At the default 5m idle timeout the first query after each gap pays a full reload; the hidden flag `--store.index-header-lazy-reader-idle-timeout` raised to a working day (10h) cut load time by 84 % on one stack, at the cost of resident memory. Hidden flag: recheck on upgrade.

**Caches.**

- Shared caching bucket across tenants on Thanos < v0.35.0: key collision, store gateway stays `Ready` and serves no historical data. Redis `prefix` isolates on any version. A single-tenant canary cannot catch it.
- Index cache and caching bucket on the same Redis: separate `db` (index `db: 1`).
- Do not size a shared cache from IN-MEMORY cache sizes (they measure pod uptime). Size on the working set over the TTL window (P95 of a rolling >= 24 h subquery with explicit step), divided by the measured overlap between replicas of a shard, never the pod count. Replicas load the same blocks but cache different chunks: 2 replicas measured 1.4, not 2.
- Caching bucket subranges live 24 h (`chunk_subrange_ttl`); Redis `expiration` does not govern them.
- Query frontend cache file is parsed strictly: no `ttl`, no `enabled_items`, TTL is `expiration` under `config:`. Unknown keys: the component refuses to start.
- Redis behind Sentinel: Sentinel service + `master_name`, else writes go to the old master after failover.

**Receive.**

- Stays on-demand with a dedicated priority class: the only component holding not-yet-uploaded data. Everything else goes on spot.
- Size the memory limit on peak active series. `head_series_limit` only pays off in a shared multi-tenant Receive or with replication: with one replica a 429 blocks every write of the tenant, an OOM only costs a restart and a WAL replay. It is inert without a reachable `meta_monitoring_url`. Request limits return 413 (Prometheus drops the data), the series limit returns 429 (retried).
- Ketama hashring, not `hashmod`, when the pool size will change.
- Bound the Go heap: `GOMEMLIMIT` from the pod memory limit, or `--enable-auto-gomemlimit` (off by default, 0.9 of the container limit). Go sets GOMAXPROCS from the cgroup since 1.25, never GOMEMLIMIT. A Receive OOM means a WAL replay before it serves again.

**Compactor.**

- As a CronJob: `concurrencyPolicy: Forbid` is mandatory (2 compactors on one bucket corrupt blocks).
- `thanos_compact_todo_*` gauges are only registered with `--wait`: in CronJob mode an alert on them never fires. Stock `ThanosCompactIsDown` fires 23 h/24. Replace with kube-state-metrics CronJob rules and a store gateway `thanos_blocks_meta_synced` backlog proxy. Any alert on a compactor metric (`thanos_compact_group_compactions_failures_total`...) never fires in CronJob mode: no scrape target between runs.
- Never a bucket lifecycle rule or archive storage class on a Thanos bucket: only the compactor knows block dependencies; the retry loop multiplied the API bill 10x the saving.
- Retention tiers aligned with what store gateways serve.

**Cross-cutting.**

- All components of a stack in one zone: inter-zone traffic is billed on every arrow of the data path. A zone spread constraint on a stack is a cost bug, a deliberate trade-off to state otherwise.
- Store readiness alert on StatefulSet desired vs ready replicas with `for: 30m`: `up == 0` never fires for an evicted Pending pod, and `for: 5m` pages on normal spot recovery.

## Diagnosing saturation

Use procedures D1-D10 in `references/rules.md`. Core of D1: `in_flight = throughput x duration` (Little's law), measured per pod; duration usually dominates (x190 vs x4.5 in the field). Read gate panels with `max_over_time(...[$__interval:1m])`, latency at p999/p9999, fleet size with `count(group by (pod) (up == 1))`.

## Output format

Findings ranked by severity: data loss or silent wrong results, then outage risk (a config the component refuses to start with counts here), then cost, then hygiene. Each finding:

- field or flag, with the line
- the problem and its concrete consequence
- the fix, as the exact value or snippet
- the wiki URL with anchor, copied from `references/rules.md` (rule IDs are internal, leave them out)
