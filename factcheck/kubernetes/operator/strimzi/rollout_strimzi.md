---
article: docs/kubernetes/operator/strimzi/rollout_strimzi.md
checked: '2026-11-11'
commit: 2d312dc1c66403096e6093e25fda2ad3d9034252
sources:
- repo: strimzi-kafka-operator
  path: documentation/modules/deploying/proc-deploy-kafka-cluster-kraft.adoc
  lines: '76'
  ref: origin/main
  commit: f3f62188c40cac3973ac7be135c1dbe85dfe6e2f
unpinned: 2
---

# docs/kubernetes/operator/strimzi/rollout_strimzi.md

## Findings

- L4 OUTDATED corrigé : description sans ZooKeeper, mention que ZooKeeper n'est plus supporté depuis 0.46 (KRaft uniquement), exemple de sortie `get strimzipodsets` passé en KRaft (pools broker/controller), une phrase garde le cas legacy `<cluster>-kafka` / `<cluster>-zookeeper`. Preuve : strimzi-kafka-operator CHANGELOG.md@origin/main (f3f62188c, 2026-11-06) L356 "Support for ZooKeeper-based clusters ... has been removed.", sous la section "## 0.46.0".
- L20 IMPRECISE corrigé : podset nommé `<cluster>-<pool>`. Preuve : cluster-operator/.../model/KafkaPool.java@origin/main:238-240 `componentName = kafka name + "-" + pool name`, et KafkaCluster.java:1253-1256 `WorkloadUtils.createPodSet(pool.componentName, ...)` pour chaque pool.

## En plus

- Commande pod (L36) : précisé que le suffixe du pod est le node ID, attribué sur tout le cluster, donc pas forcément `-0` pour les brokers. Preuve : documentation/modules/deploying/proc-deploy-kafka-cluster-kraft.adoc:76@origin/main "Node IDs are assigned sequentially starting at 0 (zero) across all node pools within a cluster".
- Ajout après l'annotation du podset : prise en compte à la prochaine réconciliation (2 min par défaut), annotation retirée à la fin, et risque d'écrasement si on annote pendant une réconciliation (doc recommande d'annoter les pods). Preuve : documentation/modules/managing/proc-manual-rolling-update-strimzipodset.adoc@origin/main L14-15 (IMPORTANT) et L44-47.
- `variables:` ajoutées (`namespace`, `podset`) pour les deux commandes `kubectl annotate`.

## Modernisation

- Noms `<cluster>-<pool>` en >= 0.46 : appliqué.
- Annoter le pod pour un seul broker : déjà dans l'article, conservé.

## Tests

- Pas de cluster : vérification sur le code source local (~/Documents/work/src/strimzi-kafka-operator, origin/main f3f62188c).

## À signaler

- La doc officielle Strimzi (proc-manual-rolling-update-strimzipodset.adoc) montre encore `<cluster_name>-kafka` comme nom de podset, ce qui ne correspond plus au code avec node pools. L'article suit le code.
- Le lien de fin `#assembly-rolling-updates-str` n'a pas été vérifié sur le site publié.
