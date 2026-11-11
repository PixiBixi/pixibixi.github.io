---
description: "GKE custom ComputeClass : priorities Spot puis on-demand, épingler un workload en on-demand, familles de machines (c4a, highmem), nodePoolAutoCreation, pod Pending et override par workload dans les values Helm."
tags:
  - GKE
  - GCP
  - FinOps
---

# GKE ComputeClass : fallback Spot, on-demand, ARM et pods Pending

Gérer le Spot avec des node pools à la main finit toujours pareil : un pool par type de machine, des taints à répéter dans chaque chart et un pod qui reste Pending dès qu'une zone n'a plus de capacité. Une custom ComputeClass déplace cette logique dans un objet Kubernetes : une liste de machines par ordre de préférence, avec le fallback on-demand déclaré au même endroit. Le workload ne porte plus qu'un `nodeSelector`.

Le Spot lui-même (taints, préavis de 30 secondes, workloads éligibles) est dans [Spot sur GKE](spot_nodes.md). La capacité réellement allouable par taille de node est dans [GKE - Capacité réelle des nodes](gke_node_capacity.md).

## Un fallback Spot puis on-demand en 1 objet

Une ComputeClass est une CRD `cloud.google.com/v1`. Le champ `priorities` est lu dans l'ordre et GKE crée les nodes en suivant cet ordre ([doc GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-attributes-compute-classes)). Dans l'exemple, on tente d'abord du Spot, puis la même famille en on-demand.

```yaml
apiVersion: cloud.google.com/v1
kind: ComputeClass
metadata:
  name: spot-then-on-demand
spec:
  priorities:
    - machineFamily: n4
      spot: true
    - machineFamily: n4
      spot: false
  whenUnsatisfiable: DoNotScaleUp
  nodePoolAutoCreation:
    enabled: true
```

Les champs à connaître :

- sans `machineFamily`, GKE retombe sur `e2`, donc on le pose toujours
- `spot: false` en dernière règle est le filet on-demand
- `minCores` et `minMemoryGb` filtrent les machines d'une règle, par exemple `minMemoryGb: 64` pour viser des gabarits mémoire
- `machineType` remplace la famille quand on veut un type exact (`n4-standard-32`)
- `nodePoolAutoCreation.enabled: true` laisse GKE créer les node pools nécessaires, sans pool préparé à la main

Les ComputeClass exigent GKE 1.30.3-gke.1451000 ou plus. Un cluster Standard plus ancien que 1.33.3-gke.1136000 demande en plus l'auto-provisioning activé au niveau du cluster (hors canal Rapid).

!!! warning "Fixer whenUnsatisfiable explicitement"
    Sans valeur, le défaut est `ScaleUpAnyway` avant GKE 1.33 et `DoNotScaleUp` ensuite. Avec `ScaleUpAnyway`, un pod dont aucune règle n'est satisfaisable atterrit sur une machine par défaut, alors qu'une classe pensée pour un gabarit précis doit refuser ce cas.

## Rebasculer sur Spot quand la capacité revient

Un pod tombé sur la règle on-demand y reste tant que rien ne le déplace. L'`activeMigration` corrige ça : quand une règle plus prioritaire redevient disponible, GKE peut déplacer les pods vers les nodes de cette règle.

```yaml
spec:
  priorities:
    - machineFamily: n4
      spot: true
    - machineFamily: n4
      spot: false
  activeMigration:
    optimizeRulePriority: true
```

La doc la recommande pour les workloads stateless ou qui tolèrent les interruptions : on ne l'active pas sur un workload stateful. Sans cette option (`false` par défaut), GKE ne déplace pas un workload vers des nodes plus prioritaires. La doc de troubleshooting la liste comme cause quand des pods ne reviennent pas sur du Spot.

## Épingler un workload en on-demand

Un workload qui ne supporte pas l'éviction (un primary de base de données, un StatefulSet sans réplication, voir le tableau d'éligibilité de [Spot sur GKE](spot_nodes.md)) ne doit jamais atterrir sur du Spot. Plutôt qu'un `nodeSelector` sur un label de pool, on lui donne une classe sans aucune règle `spot: true`.

```yaml
apiVersion: cloud.google.com/v1
kind: ComputeClass
metadata:
  name: on-demand
spec:
  priorities:
    - machineFamily: n4
      spot: false
    - machineFamily: n2
      spot: false
  whenUnsatisfiable: DoNotScaleUp
  nodePoolAutoCreation:
    enabled: true
```

Le fallback d'un type de machine à un autre reste possible (ici n4 puis n2), mais pas vers du Spot. Épingler se résume alors à changer le nom de la classe dans le workload.

Avec l'auto-création de node pools, GKE rejette un pod qui demande à la fois une ComputeClass et du Spot ou une série de machines précise. Le Spot et la famille se décident dans la classe, jamais en plus dans le pod.

## Choisir la classe côté workload

Le pod demande sa classe avec un `nodeSelector` et GKE ajoute lui-même la toleration qui correspond au taint `cloud.google.com/compute-class=<nom>:NoSchedule` posé sur les nodes de la classe.

```yaml
spec:
  template:
    spec:
      nodeSelector:
        cloud.google.com/compute-class: spot-then-on-demand
```

2 façons d'éviter de répéter ce sélecteur partout :

- un label de namespace, `kubectl label namespaces my-namespace cloud.google.com/default-compute-class=spot-then-on-demand`, qui s'applique aux pods du namespace sans classe explicite. Ce label touche aussi les DaemonSets : sur un namespace système, on pose plutôt `cloud.google.com/default-compute-class-non-daemonset` (GKE 1.33.1-gke.1788000 ou plus)
- une classe nommée `default` avec `gcloud container clusters update my-cluster --location=europe-west4 --enable-default-compute-class`, qui vaut pour tout le cluster à partir de GKE 1.33.1-gke.1744000 ([doc GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/run-pods-default-compute-classes))

## Passer en ARM avec c4a

Les nodes ARM portent par défaut le taint `kubernetes.io/arch=arm64:NoSchedule`. Un pod qui sélectionne `kubernetes.io/arch: arm64` reçoit la toleration correspondante. Une image multi-arch peut recevoir la toleration à la main ([doc GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/prepare-arm-workloads-for-deployment)). Une classe qui met une famille ARM en tête de ses priorités impose donc une image multi-arch.

```yaml
apiVersion: cloud.google.com/v1
kind: ComputeClass
metadata:
  name: arm-first
spec:
  priorities:
    - machineFamily: c4a
      spot: true
    - machineFamily: c4a
      spot: false
    - machineFamily: n4
      spot: false
  whenUnsatisfiable: DoNotScaleUp
  nodePoolAutoCreation:
    enabled: true
```

Pour un gabarit mémoire (le highmem de la famille), on contraint la règle avec `minMemoryGb` plutôt qu'avec un `machineType` figé : la classe reste valable si GKE propose une autre taille.

La dernière règle est en n4, donc x86. Si GKE tombe dessus avec une image arm64 seule, le pod ne peut pas tourner sur ce node. L'image est donc multi-arch ou toutes les règles restent en ARM.

## Un pod Pending à cause de la classe

Un pod Pending avec une ComputeClass vient le plus souvent d'une config. Le tableau suit la [page de troubleshooting de GKE](https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/custom-computeclass).

| Symptôme | Cause probable | Correctif |
|---|---|---|
| Pending | le `nodeSelector` `cloud.google.com/compute-class` manque ou son nom ne correspond à aucune classe (à vérifier avec `kubectl get computeclass`) | corriger le nom dans le pod |
| Pending, l'autoscaler ne crée rien | `nodePoolAutoCreation.enabled` absent ou `false` ou auto-provisioning coupé au niveau cluster | activer les 2 |
| Pending | les requests du pod dépassent toutes les machines de `priorities` | baisser les requests ou ajouter une machine plus grande |
| Pending sur pool créé à la main | le pool n'a ni le label ni le taint de la classe | les poser sur le node pool |
| Pending, `unable_to_provision` | quota, IP, permissions ou capacité | lire les visibility events |
| Pod sur une machine par défaut | `whenUnsatisfiable: ScaleUpAnyway` | passer à `DoNotScaleUp` |

Le premier réflexe est de lire ce que le pod demande réellement, puis l'état de la classe.

```console
$ kubectl get pod my-app-0 -n my-namespace -o jsonpath='{.spec.nodeSelector}'
{"cloud.google.com/compute-class":"spot-then-on-demand"}
$ kubectl get computeclass
$ kubectl describe computeclass spot-then-on-demand
$ kubectl get nodes -l cloud.google.com/compute-class=spot-then-on-demand
```

La sortie du `describe` indique si la classe est saine (« CCC is healthy. ») ou la raison de l'échec : `NodePoolNotExist`, `ReservationUnusable` ou `Invalid machine type`. Un sélecteur qui nomme une classe absente n'apparaît pas à cet endroit, puisqu'il n'y a justement pas d'objet à décrire : c'est le `get computeclass` qui le révèle. Dans ce cas on lit `kubectl describe pod` et on compare le nom au résultat du `get`.

Les events utiles sont ceux de l'autoscaler, visibles dans Cloud Logging sur `log_id("container.googleapis.com/cluster-autoscaler-visibility")`. Les `messageId` `no.scale.up.nap.resource.exhausted` et `no.scale.up.nap.quota.exceeded` séparent un manque de capacité d'un quota atteint. Sur GKE 1.37 et plus, la métrique `kubernetes.io/autoscaler/cluster_pending_pods_per_ccc` compte les pods Pending par classe.

Quand la capacité Spot manque, la doc suggère de lister des `machineType` explicites du moins cher au plus cher.

## Surcharger la classe par workload dans Helm

Dans un chart maison qui sert plusieurs dizaines d'applications, la classe se règle au même endroit que les resources, sous forme de map. Un chart qui expose `computeClass.name` et `computeClass.enableARM` génère le `nodeSelector` et les tolerations à la place du chart appelant, par exemple :

```yaml
# values/common.yml
computeClass:
  name: spot-then-on-demand
  enableARM: true
```

```yaml
# values/prod.yml : une base de données épinglée en on-demand
computeClass:
  name: on-demand
  enableARM: false
```

Helm fusionne les maps en profondeur d'un fichier de values à l'autre, donc l'override par workload ne déclare que la valeur qui change. Une liste est en revanche remplacée en bloc. Une fois la classe en place, on supprime les tolerations ARM écrites à la main plutôt que de les empiler avec celles que le chart génère.

Un nom de classe recopié d'un cluster à l'autre est une cause classique de Pending, puisque la ComputeClass est un objet du cluster et qu'elle n'existe pas forcément sur le suivant. Avant de synchroniser sur un nouveau cluster, on liste ses classes avec `kubectl get computeclass`.

## Voir aussi

- [Spot sur GKE](spot_nodes.md) - node pools Spot, taints et workloads éligibles
- [GKE - Capacité réelle des nodes](gke_node_capacity.md) - ce que les `minCores` et `minMemoryGb` donnent vraiment à scheduler
- [Doc GKE : about custom ComputeClasses](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-custom-compute-classes)
