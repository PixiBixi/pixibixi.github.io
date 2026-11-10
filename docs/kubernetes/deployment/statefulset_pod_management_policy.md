---
description: "podManagementPolicy dans les StatefulSets Kubernetes : OrderedReady vs Parallel - quand utiliser chaque mode et impact sur les rolling updates."
tags:
  - StatefulSet
  - Kubernetes
---

# StatefulSet - podManagementPolicy

Par défaut, un StatefulSet démarre ses pods un par un dans l'ordre : `pod-0` doit être Running et Ready avant que `pod-1` démarre. C'est `OrderedReady`.

C'est bien pour les workloads où les pods s'initialisent entre eux (Kafka, ZooKeeper, etcd), mais c'est lent pour tout le reste.

## Les 2 modes

### `OrderedReady` (défaut)

- Démarrage séquentiel : `pod-0` → `pod-1` → `pod-2`
- Scale-down en ordre inverse : `pod-2` → `pod-1` → `pod-0`
- Rolling update : un pod à la fois, le suivant attend Ready

### `Parallel`

- Tous les pods démarrent ou s'arrêtent en même temps
- Rolling update : toujours 1 pod à la fois par défaut (`maxUnavailable` vaut 1). `Parallel` ne joue que sur la création, la suppression et le scale
- Aucune garantie d'ordre

## Configurer

Le champ se pose au niveau du `spec` du StatefulSet :

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

`Parallel` divise par N le temps de démarrage initial et de scale : les N pods partent en même temps au lieu d'attendre chacun le Ready du précédent. Pour le rolling update, `Parallel` seul ne change rien, le gain vient de `maxUnavailable` (voir plus bas).

## Impact sur les rolling updates

Par défaut `maxUnavailable` vaut 1 : sans le fixer, un rolling update recrée 1 pod à la fois, même en `Parallel`.

Avec `OrderedReady`, `maxUnavailable: 2` n'aide pas vraiment : le contrôleur peut supprimer 2 pods, mais il les recrée un par un en attendant le Ready de chacun. La doc du champ dit qu'il "might not be effective" avec cette policy.

Avec `Parallel`, `maxUnavailable` est respecté : on update vraiment N pods à la fois.

`rollingUpdate.maxUnavailable` est derrière le feature gate `MaxUnavailableStatefulSet` : alpha en 1.24, beta mais désactivé en 1.35 et 1.36, activé par défaut depuis 1.37. Sur un cluster plus ancien sans le gate (cas de la plupart des clusters managés), le champ est ignoré et l'update reste à 1 pod à la fois.

On combine donc les 2 :

```yaml
spec:
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 3
```

## Voir aussi

- [Resize les PVC de son StatefulSet](../troubleshooting/resize_pvc_statefulset.md) - l'ordre de redémarrage compte pendant un resize
- [PDB et topology spread](pdb_topology_spread.md) - le budget d'éviction qui s'ajoute à cette policy pendant un drain
- [Comment rollout restart un composant Strimzi](../operator/strimzi/rollout_strimzi.md) - le cas d'un StatefulSet piloté par un opérateur
