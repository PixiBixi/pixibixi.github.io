---
article: docs/kubernetes/deployment/cpu_throttling.md
checked: '2026-11-11'
commit: 852d9682e94689c64618f759aa5449470b5ed72e
sources:
- repo: kubernetes
  path: pkg/kubelet/cm/helpers_linux.go
  lines: 86-128
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/features/kube_features.go
  lines: 1268-1272,1470-1474
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/kubelet/kuberuntime/kuberuntime_manager.go
  lines: 972-978
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/kubelet/cm/cpumanager/policy_static.go
  lines: 1049-1071
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/kubelet/apis/config/validation/validation.go
  lines: 91-96
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/kubelet/qos/policy.go
  lines: 35-36,50-56
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: kubernetes
  path: pkg/kubelet/eviction/helpers.go
  lines: 820-822
  ref: origin/master
  commit: c41dac6b0f518f2068c98b323964949fd015e760
- repo: linux
  path: kernel/sched/fair.c
  lines: 7248-7252,7428-7463,7700-7710
  ref: origin/HEAD
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
- repo: linux
  path: kernel/sched/core.c
  lines: 10012-10014,10352-10357
  ref: origin/HEAD
  commit: e0d8e8de8bcb1ef7b749033b5af5518ba8df7bec
- repo: cadvisor
  path: lib/metrics/prometheus.go
  lines: 210-243
  ref: origin/HEAD
  commit: c57813afc32715351dff34ab76a6164bcb0e5c9d
- repo: kubernetes-mixin
  path: alerts/resource_alerts.libsonnet
  lines: 105,255-277
  ref: origin/HEAD
  commit: ea8e318e706c0c14fe857e9b0182f6b7e0564e88
- repo: kubernetes-mixin
  path: rules/apps.libsonnet
  lines: 31,41
  ref: origin/HEAD
  commit: ea8e318e706c0c14fe857e9b0182f6b7e0564e88
- repo: helm-charts
  path: charts/kube-prometheus-stack/values.yaml
  lines: 1952-1956
  ref: origin/HEAD
  commit: 7d82f66c37f960ef987ca05b5c189a85dc504ba3
- repo: go
  path: src/runtime/runtime1.go
  lines: 375
  ref: go1.25.0
  commit: 6e676ab2b809d46623acb5988248d95d1eb7939c
unpinned: 3
---

# docs/kubernetes/deployment/cpu_throttling.md

## Findings

- L32 IMPRECISE corrigé : la feature gate `DisableCPUQuotaWithExclusiveCPUs` est dite « active par défaut » depuis la 1.33, ce qui est exact (beta), mais elle est deprecated en 1.36, verrouillée à true en 1.37 et supprimée en 1.38. Ajouter que le comportement est devenu permanent, sinon le lecteur cherche une gate qui n'existe plus. Preuve : pkg/features/kube_features.go:1470-1474 @ origin/master

Tout le reste a été vérifié : formule `MilliCPUToQuota` et plancher à 1ms, period de 100ms, `CustomCPUCFSQuotaPeriod` alpha de la 1.12 à la 1.35 puis GA par défaut en 1.36, `cpuCFSQuotaPeriod` (bornes 1ms à 1s), exclusion du quota pour les cœurs exclusifs (Guaranteed, CPU entier), compteurs `cpu.stat` v1 et v2, `nr_periods` qui n'avance que sur groupe actif, `throttled_time` sommé par run queue, condition `Quota != 0` de cAdvisor, drop de `container_cpu_cfs_throttled_seconds_total` par défaut dans kube-prometheus-stack (avec 3 autres séries CPU), `CPUThrottlingHigh` à 25% pendant 15m en `info`, règles `sum_rate5m` et `sum_irate`, `oom_score_adj` de -997 pour Guaranteed, évictions ordonnées par dépassement des requests puis priorité (pas par QoS), Go 1.25 qui dimensionne `GOMAXPROCS` sur la limit CPU.

## Unpinned

- L84 : mesures d'un Prometheus en prod (usage médian 30%, throttling 11% en médiane, 14% au p90), non reproductibles depuis une source
- L90 : mesures d'un collector OpenTelemetry (3 400 à 6 200 spans/s, 4% puis 5,5% de throttling), idem
- L36 : plage 1 à 10000 de `cpu.weight` et conversion `cpu.shares` vers `cpu.weight` faite par le runtime (runc), source non épinglée
