---
description: "podManagementPolicy dans les StatefulSets Kubernetes : OrderedReady vs Parallel — quand utiliser chaque mode et impact sur les rolling updates."
tags:
  - StatefulSet
  - Kubernetes
---

# StatefulSet — podManagementPolicy

Par défaut, un StatefulSet démarre ses pods un par un dans l'ordre : `pod-0` doit être Running et Ready avant que `pod-1` démarre. C'est `OrderedReady`.

C'est bien pour les workloads où les pods s'initialisent entre eux (Kafka, Zookeeper, etcd), mais c'est lent pour tout le reste.

## Les 2 modes

### `OrderedReady` (défaut)

- Démarrage séquentiel : `pod-0` → `pod-1` → `pod-2`
- Scale-down en ordre inverse : `pod-2` → `pod-1` → `pod-0`
- Rolling update : un pod à la fois, le suivant attend Ready

### `Parallel`

- Tous les pods démarrent ou s'arrêtent en même temps
- Rolling update : tous les pods sont recréés simultanément (sauf contrainte `maxUnavailable`)
- Aucune garantie d'ordre

## Configurer

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-app
spec:
  podManagementPolicy: Parallel  # OrderedReady par défaut
  replicas: 3
  # ...
```

## Quand utiliser `Parallel`

Dès que les pods n'ont pas besoin de se connaître au démarrage :

- StatefulSet utilisé pour des raisons de sticky storage, mais dont les pods sont indépendants
- Workers de queue (chaque pod consomme un shard indépendant)
- Batch jobs avec PVC dédiés par pod

`Parallel` divise le temps de rollout par N — sur un StatefulSet de 10 replicas, ça peut faire la différence entre 2 min et 20 min.

## Impact sur les rolling updates

Avec `OrderedReady`, même avec `maxUnavailable: 2`, Kubernetes recréé les pods un par un.
Avec `Parallel`, `maxUnavailable` est pleinement respecté — on peut vraiment updater N pods à la fois.

```yaml
spec:
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 3
```
