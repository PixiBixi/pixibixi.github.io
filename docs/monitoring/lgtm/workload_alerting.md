---
description: "Écrire des alertes Prometheus de workload Kubernetes qui valent un réveil : replicas unavailable sur Deployment et StatefulSet, cas du HPA, suppression des alertes CPU, severity, for et keep_firing_for, annotations runbook_url et dashboard_url, routage par équipe et tests promtool."
tags:
  - Prometheus
  - Alerting
  - Kubernetes
  - SRE
tested_with:
  - "Prometheus 3.16 (promtool)"
  - "kube-state-metrics 2.x"
---

# Alertes de workload Kubernetes : replicas, severity, routage et tests

Un jeu d'alertes hérité d'un chart ou d'un mixin finit souvent avec des dizaines de règles, dont quelques-unes sonnent la nuit pour rien sans que personne n'ose les supprimer. Les alertes de workload sont les pires, puisqu'un `CPUThrottled` ou un `CPU wait IO` se déclenche sur des pods qui servent très bien leur trafic.

On repart ici d'une base plus courte : une alerte « il manque des replicas » par type de workload, le cas du HPA, ce qu'on retire et pourquoi. Viennent ensuite ce qui rend une alerte actionnable (severity, `for`, `keep_firing_for`, annotations, routage) et le test promtool qui la verrouille. Les règles complètes de la stack sont sur [rules.jdelgado.fr](https://rules.jdelgado.fr/), dans le groupe [kubernetes](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/kubernetes.rules.yml).

## Réserver le réveil aux alertes qui demandent une action

Le critère de tri est classique en SRE : une alerte qui réveille quelqu'un doit être liée à un symptôme visible de l'utilisateur ou à un risque imminent et appeler une action précise. Le reste va dans un dashboard ou dans un ticket.

Pour un workload, le symptôme le plus fidèle est la capacité de service, c'est-à-dire le nombre de pods qui répondent. Un pod qui consomme beaucoup de CPU est une cause possible, pas un symptôme. On alerte donc sur les replicas. Les causes (CPU, mémoire, I/O) se lisent sur le dashboard lié à l'alerte.

## Alerter sur les replicas unavailable

kube-state-metrics expose, pour un Deployment, `kube_deployment_spec_replicas` (le nombre désiré) et `kube_deployment_status_replicas_unavailable` (le nombre de replicas indisponibles). Pour un StatefulSet, il expose `kube_statefulset_replicas` et `kube_statefulset_status_replicas_ready`. Ces noms sont ceux de la [doc amont](https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics/workload).

L'alerte tient sur une proportion et pas sur un `!=`. Un Deployment à 2 replicas dont 1 manque et un Deployment à 50 dont 1 manque ne sont pas le même incident. En exprimant le trou en fraction du désiré, un seuil unique convient à toute la flotte.

```yaml
groups:
  - name: workload-reliability
    rules:
      - alert: DeploymentReplicasUnavailable
        expr: |
          kube_deployment_status_replicas_unavailable
            / kube_deployment_spec_replicas > 0.5
        for: 15m
        keep_firing_for: 5m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} has {{ $value | humanizePercentage }} of its replicas unavailable"
          runbook_url: "https://runbooks.example.com/workload/replicas-unavailable"
          dashboard_url: "https://grafana.example.com/d/workload-overview?var-namespace={{ $labels.namespace }}&var-deployment={{ $labels.deployment }}"
      - alert: StatefulSetReplicasUnavailable
        expr: |
          (kube_statefulset_replicas - kube_statefulset_status_replicas_ready)
            / kube_statefulset_replicas > 0.5
        for: 15m
        keep_firing_for: 5m
        labels:
          severity: critical
        annotations:
          summary: "StatefulSet {{ $labels.namespace }}/{{ $labels.statefulset }} has {{ $value | humanizePercentage }} of its replicas not ready"
          runbook_url: "https://runbooks.example.com/workload/replicas-unavailable"
          dashboard_url: "https://grafana.example.com/d/workload-overview?var-namespace={{ $labels.namespace }}"
```

Le seuil de 50 % et les 15 minutes sont des valeurs de départ à ajuster selon le workload, pas des constantes. Un Deployment à 1 replica qui tombe vaut 100 % et alerte, comme attendu.

Le [kubernetes-mixin](https://github.com/kubernetes-monitoring/kubernetes-mixin) procède autrement avec `KubeDeploymentReplicasMismatch` : il compare `kube_deployment_spec_replicas` à `kube_deployment_status_replicas_available` et ajoute `changes(kube_deployment_status_replicas_updated[10m]) == 0` pour ne pas alerter pendant un rollout qui progresse. Notre `for: 15m` joue le même rôle avec moins de PromQL : un rollout qui progresse repasse sous le seuil avant la fin du délai, un rollout bloqué le dépasse.

## Le cas du HPA

Sous un HPA, le nombre désiré n'est plus une constante : le contrôleur réécrit `spec.replicas` du Deployment à chaque décision de scale. Une alerte « désiré différent de disponible » voit donc un écart à chaque montée en charge, normal et transitoire.

La proportion d'unavailable évite ce bruit en mesurant la part des replicas ciblés qui ne répondent pas, quel que soit le nombre ciblé. Elle ne dit rien en revanche d'un HPA qui n'arrive pas à atteindre son désiré (quota, nœuds indisponibles, pods `Pending`). Ce cas a sa propre alerte, qui compare ce que le HPA veut à ce qu'il a :

```yaml
      - alert: HpaStuckBelowDesired
        expr: |
          kube_horizontalpodautoscaler_status_desired_replicas
            > kube_horizontalpodautoscaler_status_current_replicas
        for: 20m
        labels:
          severity: warning
        annotations:
          summary: "HPA {{ $labels.namespace }}/{{ $labels.horizontalpodautoscaler }} cannot reach its desired replicas"
          runbook_url: "https://runbooks.example.com/workload/hpa-stuck"
          dashboard_url: "https://grafana.example.com/d/workload-overview?var-namespace={{ $labels.namespace }}"
```

Le `for` est plus long que celui des replicas unavailable, puisqu'un scale-out légitime laisse `current` en retard le temps de provisionner un nœud. Le mixin a un équivalent, `KubeHpaReplicasMismatch` : `desired != current` avec `current` strictement entre `min` et `max`, sans changement de `current` sur 15 minutes, pendant 15 minutes en `severity: warning`. Il ignore donc un HPA bloqué à son `min`, que `HpaStuckBelowDesired` attrape. Le mixin couvre aussi le HPA au maximum avec `KubeHpaMaxedOut` (`current == spec_max` avec `max != min` et la condition `ScalingLimited` vraie, pendant 15 minutes, en `severity: warning`), utile à qui veut savoir qu'il faut relever `maxReplicas`. C'est une information de capacité, à mettre en ticket plutôt qu'en page.

## Supprimer les alertes CPU

3 familles d'alertes sont à retirer du chemin de réveil. Elles décrivent une cause sans dire si quelqu'un en souffre :

- `CPUThrottled` (le throttling CFS d'un conteneur, `container_cpu_cfs_throttled_periods_total` rapporté à `container_cpu_cfs_periods_total`). Un conteneur avec une limit CPU est throttlé dès qu'il consomme tout son quota CFS. Le throttling n'a de sens qu'avec la latence qui l'accompagne. Le mixin l'a lui-même classé en `severity: info` sous le nom `CPUThrottlingHigh`, à plus de 25 % pendant 15 minutes
- `CPU wait IO` (le temps CPU passé en `iowait` sur un nœud). C'est un signal de saturation disque, utile sur un dashboard de nœud, mais il n'indique ni quel workload en souffre ni si le service est dégradé
- les alertes CPU génériques du type « CPU > 80 % pendant 10 minutes ». Un pod bien dimensionné tourne près de ses requests, donc un seuil fixe sonne sur un usage normal ou reste muet sur un vrai problème

Ces 3 familles restent utiles pour diagnostiquer et leurs métriques sont conservées. On sort la règle de l'alerting et on garde le panneau dans le dashboard du workload, celui que `dashboard_url` ouvre. Si un throttling réel dégrade la latence, l'alerte de SLO sur la latence ou celle sur les replicas sonnera à sa place.

!!! warning "Supprimer une alerte a un coût"
    Retirer une règle sans alerte de remplacement sur le symptôme laisse un trou. Avant de supprimer `CPUThrottled`, vérifier qu'une alerte de latence ou d'erreurs existe sur le service concerné.

## Choisir la severity

2 niveaux suffisent, définis par ce qui arrive à la personne qui reçoit l'alerte :

- `critical` : on réveille quelqu'un, parce que le service est dégradé maintenant ou le sera avant le matin. Les 2 alertes de replicas unavailable en sont
- `warning` : on ouvre un ticket, ça se traite en heures ouvrées. `HpaStuckBelowDesired` en est une

Une alerte `critical` sans action possible la nuit est un `warning` mal classé. À l'inverse, un `warning` que personne ne traite pendant des semaines doit être supprimé, pas promu. Le label `severity` n'est pas décoratif : c'est lui que le routage d'Alertmanager lit pour choisir entre la page et le ticket.

## Absorber les rollouts et les flaps avec for et keep_firing_for

`for` fait attendre l'alerte avant qu'elle ne passe en `firing`. C'est lui qui absorbe un rollout, une éviction de nœud ou un scale-out. Il se règle sur la durée normale de l'événement bénin le plus long : un StatefulSet qui monte pod par pod demande plus longtemps qu'un Deployment.

`keep_firing_for` fait l'inverse, côté résolution. La [doc Prometheus](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) le décrit ainsi : l'alerte continue de firer pendant la durée indiquée après la dernière évaluation où la condition était vraie. Pour une alerte de replicas, il évite le flap quand un pod passe `Ready` puis retombe au bout de 2 minutes. Sans lui, l'alerte se résout à la première évaluation sous le seuil et la résolution est notifiée, puis un nouveau cycle de `for` repart de zéro. Avec lui, l'incident reste ouvert 5 minutes de plus et une rechute le prolonge.

## Imposer 3 annotations

Une alerte sans lien est une alerte qu'on doit comprendre avant d'agir, à 3h du matin. Les 3 annotations suivantes sont obligatoires :

- `summary` : une ligne, avec le workload et la valeur (`{{ $value | humanizePercentage }}`), lisible telle quelle dans une notification
- `runbook_url` : la page qui dit quoi vérifier et quoi faire. Une page par famille d'alerte suffit, les 2 alertes de replicas partagent la même
- `dashboard_url` : le dashboard du workload, avec le namespace et le nom déjà posés dans l'URL par templating, pour arriver sur le bon graphe sans filtrer

Un test impose ces annotations mieux qu'une convention, comme le montre la dernière section.

## Router vers l'équipe propriétaire

Une alerte qui arrive dans un canal commun n'est traitée par personne. Chaque alerte porte donc un label `team`, que le routage d'Alertmanager lit pour choisir le receiver.

```yaml
route:
  receiver: platform-default
  group_by: [alertname, namespace, team]
  routes:
    - matchers: ['team="payments"', 'severity="critical"']
      receiver: payments-pager
    - matchers: ['team="payments"']
      receiver: payments-tickets
```

Le label peut être écrit en dur dans la règle, comme plus haut, mais ça ne tient pas at scale : une règle générique couvre tous les workloads du cluster. On préfère alors le propager depuis les métadonnées du workload. kube-state-metrics sait convertir les labels Kubernetes en labels Prometheus via `kube_deployment_labels`, à condition de les déclarer dans `--metric-labels-allowlist` (voir la [doc des flags](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/developer/cli-arguments.md)). Un `group_left` ajoute ensuite `label_team` à l'alerte. Un workload sans label tombe sur le receiver par défaut, donc l'oubli se voit.

## Tester avec promtool

Une règle qui ne sonne jamais et une règle qui sonne tout le temps se ressemblent tant qu'on n'a pas rejoué des séries. `promtool test rules` le fait avec des séries synthétiques, donc sans cluster. Les 2 cas qui comptent pour notre alerte sont le rollout qui ne doit pas sonner et le blocage qui doit sonner, puis rester ouvert `keep_firing_for` après la résolution.

```yaml title="workload.test.yml"
rule_files:
  - workload.rules.yml
evaluation_interval: 1m
tests:
  - interval: 1m
    name: a rollout in progress does not page
    input_series:
      - series: 'kube_deployment_status_replicas_unavailable{namespace="shop",deployment="api"}'
        values: '4x5 0x30'
      - series: 'kube_deployment_spec_replicas{namespace="shop",deployment="api"}'
        values: '6x35'
    alert_rule_test:
      - alertname: DeploymentReplicasUnavailable
        eval_time: 30m
        exp_alerts: []
  - interval: 1m
    name: a stuck deployment pages after 15m and keeps firing 5m
    input_series:
      - series: 'kube_deployment_status_replicas_unavailable{namespace="shop",deployment="api"}'
        values: '4x25 0x10'
      - series: 'kube_deployment_spec_replicas{namespace="shop",deployment="api"}'
        values: '6x35'
    alert_rule_test:
      - alertname: DeploymentReplicasUnavailable
        eval_time: 14m
        exp_alerts: []
      - alertname: DeploymentReplicasUnavailable
        eval_time: 16m
        exp_alerts:
          - exp_labels:
              severity: critical
              team: payments
              namespace: shop
              deployment: api
            exp_annotations:
              summary: "Deployment shop/api has 66.67% of its replicas unavailable"
              runbook_url: "https://runbooks.example.com/workload/replicas-unavailable"
              dashboard_url: "https://grafana.example.com/d/workload-overview?var-namespace=shop&var-deployment=api"
      - alertname: DeploymentReplicasUnavailable
        eval_time: 33m
        exp_alerts: []
```

Le test exige les 3 annotations dans `exp_annotations` : une règle qui perd son `runbook_url` fait échouer le test. Le deuxième cas vérifie aussi que l'alerte est muette à 14 minutes, donc avant la fin du `for`. Le test se lance après un contrôle de syntaxe :

```console
$ promtool check rules workload.rules.yml
Checking workload.rules.yml
  SUCCESS: 3 rules found

$ promtool test rules workload.test.yml
Processing test file: workload.test.yml
  SUCCESS
```

Brancher les 2 commandes en pre-commit ou en CI évite qu'une alerte modifiée à la main parte en prod sans avoir été rejouée.

## Voir aussi

- [Les règles Kubernetes de rules.jdelgado.fr](https://rules.jdelgado.fr/), avec les tests associés dans le même repo
- [Générer des alertes depuis Loki](loki_alerting.md), pour le routage vers Alertmanager côté logs
