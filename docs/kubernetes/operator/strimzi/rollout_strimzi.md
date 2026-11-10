---
description: Redémarrer les brokers et controllers Kafka Strimzi via l'annotation de rolling update sur un StrimziPodSet ou un pod
tags:
  - Strimzi
  - Kafka
variables:
  - name: namespace
    default: namespace-a
  - name: podset
    default: kafka-random-cluster-dev-broker
---

# Comment rollout restart un composant Strimzi

Restart un déploiement est une chose facile sur K8s.

Cependant, comme Strimzi a sa propre CRD (strimzipodset), c'est un peu plus ennuyeux.

Pour restart un composant strimzi, il faut ajouter une annotation.

La première étape consiste à vérifier quels sont les clusters dont nous disposons. Depuis Strimzi 0.46, ZooKeeper n'est plus supporté (KRaft uniquement) et chaque KafkaNodePool a son propre StrimziPodSet, nommé `<cluster>-<pool>` :

```bash
➜  strimzi git:(master) k get strimzipodsets.core.strimzi.io -A
NAMESPACE               NAME                                   PODS   READY PODS   CURRENT PODS   AGE
namespace-a             kafka-random-cluster-dev-broker        3      3            3              2d23h
namespace-a             kafka-random-cluster-dev-controller    3      3            3              2d23h
```

Sur un vieux cluster ZooKeeper sans node pools, on retrouve `<cluster>-kafka` et `<cluster>-zookeeper` à la place.

Annotons le pool de brokers :

```bash
kubectl annotate -n <namespace> strimzipodset <podset> strimzi.io/manual-rolling-update="true"
```

L'opérateur traitera l'annotation à la prochaine réconciliation (toutes les 2 minutes par défaut), déclenchera le redémarrage des pods puis retirera l'annotation. Si on annote pendant une réconciliation en cours, l'annotation peut être écrasée sans que le rolling update parte : la doc recommande alors d'annoter les pods directement.

Vous pouvez ajouter la même annotation à un pod spécifique si vous souhaitez redémarrer un seul pod. Le suffixe est le node ID, unique sur tout le cluster : avec des pools, le premier broker n'est pas forcément `-0`, on vérifie avec `kubectl get pods` :

```bash
kubectl annotate -n <namespace> pod <podset>-0 strimzi.io/manual-rolling-update="true"
```

Rien n'a été inventé ici, tout est écrit dans [la documentation](https://strimzi.io/docs/operators/latest/deploying#assembly-rolling-updates-str)
