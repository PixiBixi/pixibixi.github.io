---
description: "External Secrets Operator en production : alerting sur les ExternalSecret en échec (externalsecret_status_condition, ratio et seuil plancher), routage vers l'équipe propriétaire par label de namespace, choix du refreshInterval, resync forcée par l'annotation force-sync, coût sur l'API du provider (GCP Secret Manager), controller en HA avec leader election."
tags:
  - ExternalSecrets
  - Prometheus
  - Alerting
  - Kubernetes
  - FinOps
---

# External Secrets Operator : alerting sur la sync, refreshInterval et HA du controller

Quand un credential du secret store est révoqué, tous les ExternalSecret passent en échec d'un coup alors que les pods de l'operator restent `Running` et que les Secret déjà synchronisés gardent leur dernière valeur. Rien ne casse visiblement jusqu'au premier redémarrage d'une application, qui démarre alors avec un Secret périmé ou absent. Sans alerte dédiée, on le découvre à ce moment-là.

Les alertes ci-dessous détectent cette panne avant le premier redémarrage et la routent vers l'équipe qui possède le namespace. Elles s'appuient sur les métriques d'External Secrets Operator (ESO), avec le choix du `refreshInterval` et son coût sur l'API du provider, puis la config HA du controller. Les valeurs par défaut et les noms de métriques sont lus dans le code d'ESO (branche `main`, chart 2.15.0) et dans la doc de GCP Secret Manager.

## Les métriques qui comptent

ESO expose ses métriques sur `/metrics`, activées avec `serviceMonitor.enabled: true` dans le chart ([doc des métriques](https://external-secrets.io/latest/api/metrics/)). 3 familles servent à l'alerting :

- `externalsecret_status_condition` : une gauge par ExternalSecret et par couple `condition` / `status`, avec les labels `name`, `namespace`, `condition` et `status`. Seule la série du statut courant vaut 1 tandis que celle du statut opposé est remise à 0, d'où le `== 1` dans toutes les requêtes ci-dessous.
- `externalsecret_sync_calls_error` et `externalsecret_sync_calls_total` : des counters avec les labels `name` et `namespace`.
- `externalsecret_provider_api_calls_count` : un counter avec les labels `provider`, `call` et `status` (`success` ou `error`), qui compte les appels vers l'API du provider.

On alerte sur `externalsecret_status_condition` plutôt que sur `externalsecret_sync_calls_error`. Un counter dit qu'une erreur s'est produite, pas que l'objet est toujours en échec. Il repart aussi de 0 à chaque redémarrage ou bascule du controller. La gauge reflète l'état courant et sert aussi à compter les objets Ready.

Le nombre d'appels au provider se lit par type d'appel, par exemple pour GCP Secret Manager :

```promql
sum by (provider, call, status) (rate(externalsecret_provider_api_calls_count[5m])) * 60
```

## Alerter sur un ratio, pas sur un compteur

Sur une grosse flotte, il existe toujours un socle d'ExternalSecret qui échouent en permanence (clé supprimée côté provider, namespace abandonné). Un `> 0` sonne donc en continu et on finit par l'ignorer. On alerte sur la part d'objets en échec, avec 2 niveaux : un warning à 5 % et un critical à 25 % avec un plancher absolu.

Le dénominateur est un `max_over_time` sur une subquery et pas un simple `count`. Au redémarrage du controller, les séries se ré-enregistrent une par une et si celles en échec reviennent en premier, un `count` nu fait grimper le ratio vers 100 % pendant quelques minutes. Le plancher `> 10` évite qu'un cluster avec un seul ExternalSecret pagine sur une seule erreur, qui se lit comme 100 %.

```yaml
groups:
  - name: external-secrets.rules
    rules:
      - alert: ExternalSecretsSyncDegraded
        expr: |
          count(externalsecret_status_condition{condition="Ready", status="False"} == 1)
          /
          max_over_time(count(externalsecret_status_condition{condition="Ready"} == 1)[1h:1m])
          > 0.05
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "More than 5% of ExternalSecrets are failing to sync"
          description: "{{ $value | humanizePercentage }} of ExternalSecrets have been Ready=False for 15 minutes."

      - alert: ExternalSecretsSyncMassFailure
        expr: |
          (
            count(externalsecret_status_condition{condition="Ready", status="False"} == 1)
            /
            max_over_time(count(externalsecret_status_condition{condition="Ready"} == 1)[1h:1m])
            > 0.25
          )
          and
          count(externalsecret_status_condition{condition="Ready", status="False"} == 1) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Over a quarter of ExternalSecrets are failing to sync"
          description: "More than 10 ExternalSecrets have been Ready=False for 5 minutes. Check the secret store credentials used by the operator."
```

Ces 2 alertes sont pour la plateforme : une cause partagée (credentials du store, binding IAM) est bien plus probable que 25 % d'objets cassés indépendamment. Ces règles sont aussi dans le repo [prometheus-rules](https://github.com/PixiBixi/prometheus-rules), avec leurs fixtures de test.

## Router vers l'équipe propriétaire

Un ExternalSecret en échec isolé n'est pas un sujet pour la plateforme mais pour l'équipe qui possède le namespace. On ajoute donc une 3e alerte, `ExternalSecretsSyncFailing`, qui compte les objets en échec par namespace et colle le label `team` de ce namespace pour que l'Alertmanager route au bon endroit.

Le label `team` vient d'un label posé sur chaque namespace (ici `team`), exposé par kube-state-metrics via `kube_namespace_labels`. Les labels de namespace ne sont pas exportés par défaut : il faut les autoriser avec `--metric-labels-allowlist=namespaces=[team]`. On les rend ensuite joignables avec une recording rule, où le `group by` garantit une seule série par namespace et évite un `group_left` many-to-many :

```yaml
groups:
  - name: external-secrets.team
    rules:
      - record: cluster:namespace:team_labels
        expr: |
          group by (namespace, team) (
            label_replace(kube_namespace_labels{label_team!=""}, "team", "$1", "label_team", "(.+)")
          )

      - alert: ExternalSecretsSyncFailing
        expr: |
          (
            count by (exported_namespace) (externalsecret_status_condition{condition="Ready", status="False"} == 1)
            * on (exported_namespace) group_left (team)
            label_replace(cluster:namespace:team_labels, "exported_namespace", "$1", "namespace", "(.+)")
          )
          unless on () ALERTS{alertname="ExternalSecretsSyncMassFailure", alertstate="firing"}
        for: 1h
        labels:
          severity: error
        annotations:
          summary: "ExternalSecrets failing to sync in {{ $labels.exported_namespace }}"
          description: "{{ $value }} ExternalSecrets have been Ready=False for 1 hour in {{ $labels.exported_namespace }}. Team: {{ $labels.team }}."
```

Quelques points qui ne se devinent pas à la lecture :

- Le label s'appelle `exported_namespace` et pas `namespace` : le scrape ajoute son propre label `namespace` (celui de l'operator) et Prometheus renomme le label d'origine en `exported_namespace` quand `honor_labels` est à `false`. Le `label_replace` aligne donc les 2 côtés de la jointure.
- Le `unless` coupe cette alerte quand la `MassFailure` sonne déjà : sur un incident de credentials, les équipes n'ont rien à faire et ne doivent pas toutes être notifiées.
- Le `for: 1h` laisse passer les incidents transitoires du provider. C'est un choix de ticket, pas de page : la sévérité `error` le route vers la file de l'équipe.

## Choisir le refreshInterval

`spec.refreshInterval` fixe le délai avant de relire la valeur dans le provider. Le CRD fixe la valeur par défaut à `1h0m0s`. La valeur `0s` veut dire « lire une fois et ne plus rien faire » (source : `externalsecret_types.go`). `spec.refreshPolicy` complète : `Periodic` (le défaut) suit l'intervalle, `OnChange` ne resynchronise que quand les metadata ou la spec de l'ExternalSecret changent, `CreatedOnce` ne synchronise qu'à la création.

Chaque refresh coûte au moins 1 appel `AccessSecretVersion` par clé lue côté GCP Secret Manager (le label `call` de `externalsecret_provider_api_calls_count` le montre). Le quota d'accès est de 90 000 requêtes par minute et par projet, partagé par tous les consommateurs du projet ([doc des quotas](https://docs.cloud.google.com/secret-manager/quotas)). Le débit vaut donc `nombre de clés / refreshInterval` :

- 2 000 ExternalSecret de 3 clés à `1h` : 6 000 appels par heure, soit 100 par minute
- les mêmes à `1m` : 6 000 appels par minute, soit 60 fois plus d'appels et une part bien plus grosse du quota du projet, pour un gain que peu de secrets justifient

Le provider facture aussi les accès (le tarif en vigueur est sur la page de pricing de Secret Manager). En pratique on garde la valeur par défaut de `1h` pour tout ce qui change rarement (clés d'API, mots de passe de base) et on descend à quelques minutes seulement pour un secret qu'on fait tourner automatiquement et dont une application dépend dans la minute. Un secret qui ne change jamais passe en `refreshPolicy: CreatedOnce`.

## Forcer la resync d'un ExternalSecret

Une fois la cause d'un échec corrigée, ou après avoir fait tourner un secret dans le provider, ESO attend le prochain refresh pour relire la valeur. Pour ne pas attendre l'intervalle, on modifie une annotation de l'ExternalSecret : la doc d'ESO utilise `force-sync` et n'importe quelle valeur différente suffit. Ça ne marche pas en `refreshPolicy: CreatedOnce`.

```bash
kubectl annotate externalsecret my-secret -n my-namespace force-sync=$(date +%s) --overwrite
```

## Faire tourner le controller en HA

Par défaut le chart déploie 1 replica sans leader election (`replicaCount: 1`, `leaderElect: false`, PodDisruptionBudget désactivé). Sur des nodes spot, un reschedule arrête la réconciliation le temps que le pod revienne. On passe donc à 2 replicas derrière une lease. Le chart ne l'impose pas (`leaderElect: false` par défaut, `NOTES.txt` affiche seulement un warning) mais il faut l'activer dès que `replicaCount` dépasse 1, car sans elle les 2 pods réconcilient les mêmes objets en doublant les appels au provider. Les valeurs ci-dessous activent la leader election, le PodDisruptionBudget et l'étalement des pods :

```yaml
replicaCount: 2
leaderElect: true

podDisruptionBudget:
  enabled: true
  minAvailable: 1

topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app.kubernetes.io/name: external-secrets
```

Le paramètre `replicaCount` ne concerne que le controller : le webhook et le cert controller ont chacun le leur (`webhook.replicaCount`, `certController.replicaCount`). Le flag `leaderElect` est partagé : il faut aussi l'activer dès que le cert controller dépasse 1 replica (le warning du chart n'apparaît que si `webhook.certManager.enabled` vaut `false`).

Une bascule de leader a un effet de bord sur l'alerting : le nouveau leader ré-enregistre les séries une par une, exactement comme un redémarrage, cas que le `max_over_time` du dénominateur absorbe. Avec plusieurs replicas, on vérifie aussi que le décompte n'est pas doublé : cette requête doit renvoyer un seul pod, puisque si 2 pods portent les séries, le `count` de l'alerte est doublé :

```promql
count by (pod) (externalsecret_status_condition{condition="Ready"})
```

Le paramètre `concurrent` (1 par défaut dans le chart) borne le nombre de réconciliations parallèles. Après un redémarrage, la file contient tous les ExternalSecret, donc sur une flotte de milliers d'objets la `workqueue_depth` met du temps à retomber à 0. La doc d'ESO indique qu'une profondeur au-dessus de 0 sur la durée signale un controller qui ne réconcilie pas à temps. Elle recommande aussi de mesurer le temps de rattrapage après un redémarrage pour fixer un délai acceptable.

## Les pièges rencontrés

### `1h` devient `1h0m0s`

Le CRD documente la durée sous sa forme canonique (`1h0m0s`, `10m0s`). Avec certaines versions d'ESO, un `refreshInterval: 1h` se retrouve réécrit en `1h0m0s` dans l'objet vivant et l'application ArgoCD reste `OutOfSync` sur ce seul champ alors que le Secret est bien `SecretSynced`. Le controller ajoute son finalizer par un patch et non plus par un update depuis décembre 2025 (commit `7f0ec4c2d`, « use patch instead of update for finalizers addition and removal », #5670), ce qui devrait réduire le cas sur les versions récentes, sans vérification sur un cluster. Écrire la forme canonique dans les manifests évite de dépendre de la version.

### Un namespace sans label `team` ne déclenche rien

La jointure `group_left` écarte les namespaces sans label `team` : l'alerte ne sonne pas pour eux. On vérifie régulièrement qu'il n'en existe aucun avec des ExternalSecret en échec :

```promql
count by (exported_namespace) (externalsecret_status_condition{condition="Ready", status="False"} == 1)
unless on (exported_namespace)
label_replace(cluster:namespace:team_labels, "exported_namespace", "$1", "namespace", "(.+)")
```

Un résultat non vide désigne un namespace orphelin, à rattacher à une équipe.
