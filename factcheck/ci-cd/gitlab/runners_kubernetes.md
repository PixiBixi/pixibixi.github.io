---
article: docs/ci-cd/gitlab/runners_kubernetes.md
checked: '2026-11-11'
commit: 805c4048f210221366b09902659aa83d361b341d
sources:
  - repo: gitlab-runner
    path: executors/kubernetes/kubernetes.go
    lines: 2852-2882
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: executors/kubernetes/autoscaler/pause_pod_manager.go
    lines: 22-30,257-300,330-368,447-503
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: executors/kubernetes/autoscaler/policy.go
    lines: 61-90
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: executors/kubernetes/autoscaler/provider.go
    lines: 188-210
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: executors/kubernetes/overwrites.go
    lines: 102-104,737-760
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: common/config.go
    lines: 706-708,739,741-753
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: common/consts.go
    lines: 28-29
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: commands/builds_helper.go
    lines: 575-581
    ref: v18.11.0
    commit: 249f0215b976bc5287e53035980a40a1333e1d53
  - repo: gitlab-runner
    path: commands/register.go
    lines: 541-552
    ref: v19.5.3
    commit: 33227fd48c5b411d0b49a74e129d187728abcc3b
  - repo: gitlab-runner
    path: docs/executors/kubernetes/_index.md
    lines: 539-570,599-609
    ref: origin/main
    commit: 2e73aab778d8053c65e8ff56ea3272f7f1fef2c9
  - repo: gitlab-runner
    path: executors/kubernetes/autoscaler/pause_pod_manager.go
    lines: 22-30
    ref: v18.10.0
    commit: ac71f4d8afb8063ac1cfdd8a8a6cb7b91bbb515c
  - repo: kubernetes
    path: pkg/registry/core/pod/storage/eviction.go
    lines: 230-237
    ref: origin/master
    commit: c41dac6b0f518f2068c98b323964949fd015e760
  - repo: kube-state-metrics
    path: internal/store/pod.go
    lines: 42
    ref: origin/main
    commit: 8732d1a166df246da75c670709fe3eec786cfe39
unpinned: 6
---

# docs/ci-cd/gitlab/runners_kubernetes.md

## Findings

- L192 ERROR corrigé : le PodDisruptionBudget "ne vise pas le pod" est juste, mais la conséquence est inversée. Dès que 2 jobs d'un même projet tournent, chaque job pod est couvert par plusieurs PDB (un par job pod, même selector) et l'API d'éviction refuse alors d'évincer le pod (erreur 500), donc le drain n'en évince aucun, il ne laisse pas "tous sauf un". Corriger en : un drain reste bloqué tant que 2 jobs du projet tournent en parallèle, et pour un job seul il bloque jusqu'à la fin du job. Preuve : executors/kubernetes/kubernetes.go:2873-2881 @ v18.11.0 (selector `job.<runnerLabelNamespace>/pod` sur le nom unique du projet, `minAvailable: 1`), pkg/registry/core/pod/storage/eviction.go:230-237 @ origin/master ("This pod has more than one PodDisruptionBudget, which the eviction subresource does not support.", code 500).
- L90 IMPRECISE corrigé : `pause_pod_labels` et `pause_pod_annotations` "existent pour ça" sans version. Ils sont absents de tous les tags publiés, y compris v19.5.3, et n'existent que sur la branche principale (la doc les annonce en 19.5, le code du tag 19.5.3 ne les contient pas). Un lecteur sur un runner publié met une clé que le runner ne connaît pas. Préciser "pas encore dans une release (au moins jusqu'à 19.5.3)" ou retirer la mention. Preuve : common/config.go (aucune occurrence de `pause_pod_labels`) @ v18.11.0 et @ v19.5.3, docs/executors/kubernetes/_index.md:602-603 @ origin/main.
- L67 IMPRECISE corrigé : "Chaque pause pod reprend `cpu_request`, `memory_request`, `node_selector` et les tolerations" est incomplet. Dès 18.11 il reprend aussi `service_account` et `runtime_class_name`, et la doc actuelle ajoute node affinity, scheduler et requests au niveau pod. Preuve : executors/kubernetes/autoscaler/provider.go:202-206 @ v18.11.0, docs/executors/kubernetes/_index.md:560-566 @ origin/main.

Le reste a été vérifié et confirmé, dont : `poll_timeout` 180 par défaut, `cleanup_resources_timeout` 5 minutes, pause pods en 18.11 (absents de v18.10.0, malgré "Introduced in 18.10" dans la doc), image `registry.k8s.io/pause:3.10`, PriorityClass `gitlab-runner-idle-capacity` de valeur -1, dernière policy active gagnante et retour à 0 hors période, `idle_time` limité à la baisse, `ceil(scale_factor x jobs)` plafonné par `scale_factor_limit` puis `max_pause_pods`, warning sans ClusterRole puis création du Deployment, `pod_disruption_budget` en 18.11 avec `minAvailable: 1`, noms des `*_overwrite_max_allowed` et variables `KUBERNETES_*`, variable ignorée sans maximum, message `higher than limit allowed`, `gitlab_runner_jobs_total` avec `runner_name`, `Evicted` dans `kube_pod_status_reason`, flags de `register` ignorés en mode compatible, `POST /user/runners` (scope `create_runner`, `tag_list` en chaîne), `GET /runners/all` admin ou auditeur, `status=offline` incluant `stale`, `GET /groups/:id/runners` (Owner ou Auditor, `manage_runner`), `gitlab-runner unregister --all-runners`, projet Pod Cleanup cité par la doc, PriorityClass GKE -10 avec `preemptionPolicy: Never` et seuil -10 pour le scale up, préemption Spot hors garanties des PDB.

## Unpinned

- L44 et L23 : la valeur de `consolidationDelayMinutes` "10 minutes" dans le cas étudié et la durée du `Pending` vécu (observations de terrain). La doc GKE ne donne aucune valeur par défaut.
- L141 : un runner ne prend que les jobs dont tous les tags figurent dans sa liste, comportement documenté côté GitLab mais non relu dans le code.
- L190 : une éviction de node comptée ou non comme `runner_system_failure` (déjà formulé comme à vérifier).
- L226 : boot disk de taille fixe sur un node Spot (dépend de la config du node pool).
- L241 : noms des métriques node-exporter `node_filesystem_avail_bytes` et `node_filesystem_size_bytes`.
