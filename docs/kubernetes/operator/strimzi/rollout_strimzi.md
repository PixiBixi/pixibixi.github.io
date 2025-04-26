# Comment rollout restart un composant Strimzi

Restart un déploiement est une chose facile sur K8S.

Cependant, comme Strimzi a sa propre CRD (strimzipodset), c'est un peu plus ennuyeux.

Pour restart un composant strimzi, il faut ajouter une annotation.

La première étape consiste à vérifier quels sont les clusters dont nous disposons :

```
➜  strimzi git:(master) k get strimzipodsets.core.strimzi.io -A
NAMESPACE               NAME                                   PODS   READY PODS   CURRENT PODS   AGE
namespace-a             kafka-random-cluster-dev-kafka         3      3            3              2d23h
namespace-a             kafka-random-cluster-dev-zookeeper     3      3            3              2d23h
```

Annotons le cluster Kafka

```
kubectl annotate -n namespace-a strimzipodset kafka-random-cluster-dev-kafka strimzi.io/manual-rolling-update="true"
```

L'opérateur traitera l'annotation et déclenchera le redémarrage des pods

Vous pouvez ajouter la même annotation à un pod spécifique si vous souhaitez redémarrer un seul pod :

```
kubectl annotate -n namespace-a pod kafka-random-cluster-dev-kafka-0 strimzi.io/manual-rolling-update="true"
```

Rien n'a été inventé ici, tout est écrit dans [la documentation](https://strimzi.io/docs/operators/latest/deploying#assembly-rolling-updates-str)
