---
description: "PodDisruptionBudget et topologySpreadConstraints : ce qu'un PDB couvre vraiment, les budgets qui bloquent un drain, matchLabelKeys, minDomains et le diagnostic d'un upgrade de node pool GKE qui n'avance pas."
tags:
  - Kubernetes
  - PDB
  - GKE
  - Scheduling
---

# PDB et topology spread : maintenance, répartition et upgrades GKE

Un upgrade de node pool qui reste 1h sur le même node s'explique le plus souvent par un PDB dont le budget n'autorise aucune éviction, si bien que l'API Eviction refuse de sortir le pod. Le PDB fait pourtant exactement ce qu'on lui a demandé.

## Ce qu'un PDB couvre et ce qu'il ne couvre pas

Un PodDisruptionBudget ne s'applique qu'aux **évictions volontaires**, celles qui passent par l'API Eviction. Beaucoup de pannes courantes n'en font pas partie.

| Opération | Couverte par le PDB | Pourquoi |
|-----------|:-------------------:|----------|
| `kubectl drain` | ✅ | Passe par l'API Eviction |
| Upgrade d'un node pool GKE | ✅ | Draine chaque node avant de le remplacer, dans la limite d'1h (voir [plus bas](#upgrader-un-node-pool-gke-en-surge-ou-en-blue-green)) |
| Scale-down du cluster autoscaler | ✅ | Draine le node avant de le supprimer |
| Descheduler, opérateur qui rééquilibre les pods | ✅ | Passe par l'API Eviction |
| Node qui tombe, kernel panic, panne matérielle | ❌ | Aucune éviction, le pod disparaît avec le node |
| OOMKill, `livenessProbe` qui échoue | ❌ | Redémarrage du conteneur par le kubelet |
| Éviction d'une [Spot VM](../../cloud/gcloud/spot_nodes.md) par le cloud provider | ❌ | Arrêt de la VM, hors de l'API Kubernetes |
| `kubectl delete pod` | ❌ | Suppression directe, pas une éviction |
| Rolling update | ❌ | La ReplicaSet supprime ses anciens pods par un delete direct |

Un PDB n'est donc pas une garantie de disponibilité mais une garantie sur les opérations de maintenance. Pour survivre à une panne de zone, il faut répartir les replicas sur plusieurs zones.

## Choisir entre minAvailable et maxUnavailable

Un PDB porte l'un des 2 et l'API refuse un objet qui pose les 2. Les 2 acceptent un entier ou un pourcentage.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api
```

Le plus souvent, `maxUnavailable` est le bon choix parce qu'il reste correct quand le nombre de replicas change. Un `minAvailable: 4` sur un deployment qui passe de 6 à 4 replicas la nuit n'autorise plus aucune éviction, alors qu'un `maxUnavailable: 1` garde le même sens à toutes les tailles.

Un pourcentage est arrondi vers le haut, pour `minAvailable` comme pour `maxUnavailable`. Sur de petits effectifs, `maxUnavailable: 10%` autorise ainsi 1 éviction sur 3 replicas comme sur 5, soit 33 % puis 20 % des pods indisponibles. À ces tailles, un entier se lit sans calcul.

## Éviter les budgets qui n'autorisent aucune éviction

3 écritures donnent un budget à zéro éviction autorisée. Aucun drain ne vide alors le node qui porte ces pods tant que le budget reste en l'état :

- `minAvailable` égal au nombre de replicas. Un `minAvailable: 3` sur 3 pods : **aucune marge, jamais**.
- `maxUnavailable: 0`, la façon la plus directe de dire « ne touche à rien ».
- `minAvailable: 1` sur un deployment à 1 replica, qui a l'air raisonnable écrit ainsi.

Sur un seul pod, il faut choisir entre accepter la coupure le temps du reschedule et bloquer toute maintenance, car un PDB ne crée pas de redondance. Passer à 2 replicas supprime ce dilemme.

La colonne à regarder est `ALLOWED DISRUPTIONS` :

```console
$ kubectl get pdb -A
NAMESPACE   NAME   MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
prod        api    N/A             1                 1                     42d
prod        etcd   3               N/A               0                     42d
```

Un `0` signifie qu'aucun drain n'évictera ce workload. Si ce n'est pas voulu, le budget est à corriger.

### Lire le verdict avec klens

Un `0` dans `ALLOWED DISRUPTIONS` recouvre pourtant des cas très différents : un budget impossible à satisfaire, des pods cassés, un rollout en cours ou un PDB qui ne sélectionne plus rien. Le plugin [klens](https://github.com/PixiBixi/kubectl-klens) les distingue en croisant `expectedPods`, `desiredHealthy`, `currentHealthy` et `disruptionsAllowed`. Il trie ensuite les PDB du plus risqué au moins risqué :

```bash
kubectl krew index add pixibixi https://github.com/PixiBixi/krew-index.git
kubectl krew install pixibixi/klens
kubectl klens pdb -A
```

| Verdict | Condition | Signification |
|---------|-----------|---------------|
| `NO-GUARD` | `desiredHealthy` à 0 sur au moins 2 pods | Un drain peut évicter tous les replicas d'un coup |
| `PERMABLOCK` | `desiredHealthy` ≥ `expectedPods` | Le budget n'autorisera **jamais** d'éviction |
| `BLOCKED` | `currentHealthy` < `desiredHealthy` et aucune éviction autorisée | Des pods sont déjà cassés, le drain reste bloqué |
| `AT-FLOOR` | Aucune éviction autorisée, pods au plancher | Le drain attend qu'un pod de remplacement soit prêt |
| `ORPHAN` | `expectedPods` à 0 | Le `selector` ne matche plus rien, le PDB est inerte |
| `OK` | Au moins 1 éviction autorisée | Le drain passe |

Les 3 cas de la liste ci-dessus sortent en `PERMABLOCK`, le deployment cassé de la section suivante en `BLOCKED`. Les autres plugins utiles sont listés dans [Mes meilleurs plugins Krew](../cli/krew_plugins.md).

## Évicter des pods déjà cassés sans consommer le budget

Prenons un deployment à 3 replicas avec `maxUnavailable: 1`, dont 2 pods sont en `CrashLoopBackOff`. Le budget exige 2 pods sains alors qu'il n'en reste qu'1, si bien qu'il n'autorise plus aucune éviction. L'API Eviction refuse de sortir le pod sain comme les 2 pods cassés. Le drain retente alors sans fin sur des pods qui ne servent plus à rien.

Ce blocage vient du comportement par défaut, `unhealthyPodEvictionPolicy: IfHealthyBudget`. Un pod pas encore prêt n'est évictable que si le nombre de pods sains atteint le minimum exigé (`currentHealthy >= desiredHealthy`). Le champ est GA depuis Kubernetes 1.31 (beta depuis 1.27) et `AlwaysAllow` rend les pods pas encore prêts évictables sans condition :

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
spec:
  maxUnavailable: 1
  unhealthyPodEvictionPolicy: AlwaysAllow
  selector:
    matchLabels:
      app: api
```

Les 2 pods cassés sortent alors du node. Le pod sain reste protégé par le budget, comme voulu.

Pour un workload stateless, `AlwaysAllow` convient dans la plupart des cas, car un pod not-ready ne reçoit pas de trafic et l'évicter ne dégrade rien. On garde `IfHealthyBudget` là où un pod peut être not-ready tout en travaillant, par exemple une base qui rejoue son WAL.

## Répartir les pods pour que le budget ait de la marge

Avec `maxUnavailable: 1` et les 3 replicas sur le même node, le drain de ce node demande 3 évictions alors que le budget n'en autorise qu'1. Chaque éviction suivante attend qu'un pod évicté redevienne prêt ailleurs et le drain s'étire d'autant. Le budget fixe combien de pods peuvent partir, le spread décide s'ils partent ensemble.

```yaml
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api
          matchLabelKeys:
            - pod-template-hash
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: api
          matchLabelKeys:
            - pod-template-hash
```

La contrainte sur `hostname` en `DoNotSchedule` évite qu'un node porte 2 pods du même deployment tant que le nombre de replicas ne dépasse pas le nombre de nodes éligibles. Elle ne garantit rien au-delà, car `maxSkew` borne l'écart entre un domaine et le minimum global et non le nombre de pods par domaine. Avec 5 replicas sur 3 nodes, la répartition 2/2/1 a un minimum global de 1 et un skew de 1. Elle satisfait `maxSkew: 1` et le drain d'un des nodes chargés demandera 2 évictions.

La contrainte sur `zone` en `ScheduleAnyway` répartit les pods sur les zones quand c'est possible, sans bloquer le scheduling si une zone est saturée. Poser `DoNotSchedule` sur la zone laisserait les pods en `Pending` le jour où une zone manque de capacité, au lieu de les placer ailleurs. Pour du stateless, la disponibilité compte plus que l'équilibre de la répartition.

!!! note "Le cluster a déjà des contraintes par défaut"
    Un pod qui ne déclare aucune `topologySpreadConstraints` reçoit celles du scheduler : un `maxSkew: 3` sur `kubernetes.io/hostname` et un `maxSkew: 5` sur `topology.kubernetes.io/zone`, les 2 en `ScheduleAnyway`. Elles ne s'appliquent que si le pod est sélectionné par un Service, une ReplicaSet, un StatefulSet ou un ReplicationController. Elles expliquent que les pods soient déjà à peu près répartis sans configuration, mais un `maxSkew` de 3 par node laisse trop d'écart pour que le budget du PDB suffise.

## Garder un skew correct pendant un rollout

Le `matchLabelKeys: ["pod-template-hash"]` de l'exemple précédent compte. Sans lui, le `labelSelector` matche à la fois les pods de l'ancienne et de la nouvelle ReplicaSet. Le scheduler ignore les pods en cours de suppression (`countPodsMatchSelector` fait un `continue` dès que `DeletionTimestamp != nil`) mais compte les pods de l'ancienne ReplicaSet encore `Running`. Il place donc les nouveaux pods pour compenser une distribution qui va disparaître. La répartition paraît correcte pendant le rollout puis se déséquilibre quand l'ancienne ReplicaSet tombe à zéro.

Le champ `matchLabelKeys` résout ses clés contre les labels du **pod entrant**. Le Deployment controller pose `pod-template-hash` sur chaque pod qu'il crée, si bien qu'ajouter la clé suffit à limiter le calcul à la révision courante, sans rien changer au template. Le champ est en beta, activé par défaut, depuis Kubernetes 1.27.

## Exiger un nombre minimum de zones avec minDomains

Le skew se calcule sur les domaines qui existent, pas sur ceux qu'on voudrait avoir. Un `maxSkew: 1` sur la zone, avec des nodes dans une seule zone, est toujours satisfait puisqu'il n'y a qu'un domaine et donc aucun écart possible. Tous les pods s'empilent alors dans cette zone.

Le champ `minDomains`, GA depuis Kubernetes 1.30, exige un nombre minimum de domaines :

```yaml
topologySpreadConstraints:
  - maxSkew: 1
    minDomains: 3
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: api
```

Tant qu'il y a moins de 3 domaines éligibles, le scheduler compte le minimum global à 0. Chaque zone existante reçoit alors au plus `maxSkew` pods et les suivants restent `Pending`. Avec 2 zones et `maxSkew: 1`, les 2 premiers pods se placent et le 3e attend qu'une 3e zone apparaisse. Le scheduler ne connaît que les zones où un node existe déjà, un node pool à zéro dans une zone n'est donc pas compté.

`minDomains` n'est accepté qu'avec `whenUnsatisfiable: DoNotSchedule`. Avec `ScheduleAnyway`, la contrainte reste une préférence et un minimum n'aurait pas de sens.

!!! warning "minDomains et le cluster autoscaler GKE"
    Le [cluster autoscaler de GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler) ne supporte pas les contraintes en `DoNotSchedule`. Il ne créera pas le node de la zone manquante pour débloquer les pods `Pending`. `minDomains` se réserve donc aux workloads dont la répartition sur les zones compte plus que la disponibilité, comme un quorum, sur des node pools déjà présents dans chaque zone.

## Choisir quels nodes comptent comme des domaines

2 autres champs de la spec décident quels nodes comptent comme des domaines :

- `nodeAffinityPolicy` indique si les nodes exclus par le `nodeAffinity` ou le `nodeSelector` du pod comptent. En `Honor`, ils ne comptent pas. C'est presque toujours le comportement voulu.
- `nodeTaintsPolicy` fait de même pour les taints. En `Honor`, un node pool tainté que le pod ne tolère pas n'est plus compté comme un domaine disponible et le skew reflète la réalité.

Les 2 champs n'ont pas le même défaut. Un `nodeAffinityPolicy` non renseigné vaut `Honor` (*If this value is nil, the behavior is equivalent to the Honor policy*). Les nodes exclus par le `nodeAffinity` ou le `nodeSelector` du pod ne sont donc déjà pas comptés sans rien déclarer. Un `nodeTaintsPolicy` non renseigné vaut `Ignore`, si bien qu'un node pool tainté que le pod ne tolère pas reste compté comme un domaine disponible.

Seul `nodeTaintsPolicy: Honor` mérite donc d'être écrit explicitement. Les 2 champs sont GA depuis Kubernetes 1.33 et leur feature gate `NodeInclusionPolicyInPodTopologySpread` ne se désactive plus.

## Choisir topology spread plutôt que podAntiAffinity

`podAntiAffinity` couvre le même besoin avec moins de réglages. En `requiredDuringSchedulingIgnoredDuringExecution`, il fonctionne en tout ou rien : un pod de plus que de nodes disponibles reste `Pending` indéfiniment. C'est le seul moyen de garantir strictement un pod par node, au prix de ce `Pending`. En `preferred`, le scheduler pondère mais on ne contrôle pas l'écart toléré.

L'anti-affinity coûte aussi en latence de scheduling sur un cluster de plusieurs centaines de nodes, puisqu'elle compare le pod candidat aux pods déjà placés. Le topology spread travaille sur un décompte par domaine.

`podAntiAffinity` garde un usage propre : exclure la cohabitation avec un **autre** workload. Le spread ne sait pas exprimer « jamais sur le même node qu'Elasticsearch ».

## Diagnostiquer un drain qui n'avance pas

Le premier réflexe est de demander au serveur ce qui se passerait, sans rien faire :

```bash
kubectl drain gke-prod-pool-1-abc123 \
  --ignore-daemonsets --delete-emptydir-data \
  --dry-run=server
```

Il faut ensuite trouver qui refuse. Une éviction rejetée par un PDB remonte en `429 Too Many Requests` côté client sans créer d'event sur le pod. La raison se lit dans le PDB lui-même :

```bash
# Quel budget est à zéro et pourquoi (voir le tableau des verdicts plus haut)
kubectl klens pdb -A

# La condition qui dit pourquoi
kubectl get pdb api -n prod -o jsonpath='{.status.conditions}' | jq .

# Ce que voit le node
kubectl get pods --field-selector spec.nodeName=gke-prod-pool-1-abc123 -A -o wide
```

La condition `DisruptionAllowed` avec `reason: InsufficientPods` indique qu'il n'y a pas assez de pods sains pour que le budget autorise une sortie.

Un pod sélectionné par 2 PDB ne s'évicte pas non plus. L'API répond une erreur 500 (*This pod has more than one PodDisruptionBudget, which the eviction subresource does not support*), par exemple quand un chart et un manifest écrit à la main posent chacun leur PDB.

Le PDB orphelin est le dernier cas à connaître. Son `selector` ne matche plus aucun pod parce que les labels du deployment ont changé. Il affiche `expectedPods: 0`, `ALLOWED DISRUPTIONS: 0` et la condition `InsufficientPods`. Il donne ainsi l'impression de tout bloquer. Il ne bloque rien, car l'API Eviction ne consulte que les PDB dont le `selector` matche le pod visé (`getPodDisruptionBudgets` fait un `continue` sur les autres). Le workload visé n'est en réalité plus protégé du tout.

!!! danger "Un `selector: {}` bloque le drain de tout le namespace"
    En `policy/v1`, un sélecteur vide matche **tous** les pods du namespace, à l'inverse de `policy/v1beta1` où il n'en matchait aucun. Un `selector: {}` hérité d'un vieux manifest gèle donc le drain de tout le namespace. Il affiche un `expectedPods` élevé et non 0, à la différence du PDB orphelin.

## Upgrader un node pool GKE en surge ou en blue-green

En surge, GKE respecte les PDB pendant le drain d'un node [pendant 1h au plus](https://cloud.google.com/kubernetes-engine/docs/concepts/node-pool-upgrade-strategies). Passé ce délai, les pods restants sont évictés de force, PDB ou non. Un PDB cassé donne donc un upgrade très lent plutôt qu'un upgrade en échec, avec une coupure à la fin. Avec un surge de 1, un node pool de 20 nodes tous bloqués prend 20h. Un surge plus élevé met à jour plusieurs nodes en parallèle et divise ce délai d'autant.

Le blue-green ne respecte pas non plus les PDB indéfiniment. Les pods qui bloquent encore à la phase de suppression de l'ancien pool sont supprimés de force, après une période de soak d'1h par défaut.

Les 2 stratégies se règlent par node pool :

```bash
# Surge : N nodes en plus pendant l'upgrade, M indisponibles au maximum
gcloud container node-pools update prod-pool-1 \
  --cluster central-prod-ew9 --region europe-west9 \
  --max-surge-upgrade 2 --max-unavailable-upgrade 0

# Blue-green : un pool neuf en parallèle, bascule puis suppression de l'ancien
gcloud container node-pools update prod-pool-1 \
  --cluster central-prod-ew9 --region europe-west9 \
  --enable-blue-green-upgrade
```

Associer `--max-unavailable-upgrade 0` à un `--max-surge-upgrade` non nul est la combinaison la plus sûre pour la capacité : GKE ajoute des nodes avant d'en retirer et la capacité ne descend pas sous la cible. Elle coûte des nodes supplémentaires pendant l'upgrade et se justifie sur un service très chargé en heure de pointe, alors qu'un surge de 1 suffit ailleurs.

Le blue-green permet un rollback rapide tant que l'ancien pool existe, c'est-à-dire pendant le soak. Un upgrade en surge terminé ne se rollback pas. Le blue-green double la capacité le temps de l'opération et demande donc le quota correspondant.

Le suivi d'une opération en cours se fait en CLI, comme décrit dans [Suivre l'upgrade de son cluster GKE](../../cloud/gcloud/gke_upgrades.md).

## Voir aussi

- [Suivre l'upgrade de son cluster GKE](../../cloud/gcloud/gke_upgrades.md) - suivre les opérations d'upgrade en CLI
- [Spot sur GKE](../../cloud/gcloud/spot_nodes.md) - les évictions que le PDB ne couvre pas
- [GKE - Capacité réelle des nodes](../../cloud/gcloud/gke_node_capacity.md) - ce qui reste vraiment pour les pods
- [StatefulSet - podManagementPolicy](statefulset_pod_management_policy.md) - l'autre facteur de lenteur d'un rollout
- [ValidatingAdmissionPolicy](validating_admission_policy.md) - refuser un PDB à zéro éviction à l'admission
