---
description: "PodDisruptionBudget et topologySpreadConstraints : ce qu'un PDB protège vraiment, les configurations qui bloquent un drain, matchLabelKeys, minDomains et le diagnostic d'un upgrade de node pool GKE qui n'avance pas."
tags:
  - Kubernetes
  - PDB
  - GKE
  - Scheduling
---

# PDB et topology spread : ne pas bloquer un upgrade de node pool

Un upgrade de node pool qui reste 1h sur le même node, c'est un PDB. Pas un souci de quota, pas un souci de CSI : quelqu'un a écrit un budget qui n'autorise aucune éviction et l'API refuse poliment de sortir le pod. Le pire, c'est que le PDB fait exactement ce qu'on lui a demandé.

## Ce qu'un PDB protège et ce qu'il ne protège pas

Un PodDisruptionBudget ne s'applique qu'aux **évictions volontaires**, celles qui passent par l'API Eviction. C'est la moitié de l'histoire que les gens oublient.

Ce qui passe par l'API Eviction, donc ce qu'un PDB freine :

- `kubectl drain`
- l'upgrade d'un node pool, GKE comme RKE
- le scale-down du cluster autoscaler
- un descheduler, ou n'importe quel opérateur qui rééquilibre

Ce qui ne passe pas par l'API Eviction, donc ce qu'un PDB ne protège absolument pas :

- un node qui tombe, un kernel panic, un câble arraché
- un OOMKill, un `livenessProbe` qui échoue
- la reprise d'une [Spot VM](../../cloud/gcloud/spot_nodes.md) par le cloud provider
- un `kubectl delete pod`, qui n'est pas une éviction

Un PDB n'est donc pas une garantie de disponibilité, c'est une garantie sur les opérations de maintenance. Compter sur un PDB pour survivre à une panne de zone, c'est se tromper d'outil.

## minAvailable ou maxUnavailable

Un PDB porte l'un des deux, jamais les deux. Les deux acceptent un entier ou un pourcentage.

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

`maxUnavailable` est presque toujours le bon choix : il reste correct quand le nombre de replicas change. Un `minAvailable: 4` sur un deployment qui scale de 6 à 4 la nuit passe silencieusement à zéro éviction autorisée, alors qu'un `maxUnavailable: 1` continue de dire la même chose à toutes les tailles.

Le pourcentage est arrondi **vers le haut** pour `minAvailable` et vers le haut aussi pour `maxUnavailable`, mais sur de petits effectifs ça donne des résultats contre-intuitifs : `maxUnavailable: 10%` sur 3 replicas donne 1, sur 5 replicas donne 1 aussi. En dessous d'une dizaine de pods, on met un entier et on sait ce qu'on a.

## Les configurations qui bloquent un drain à vie

3 écritures produisent un budget à zéro éviction autorisée et donc un node qu'on ne pourra jamais vider :

- `minAvailable` égal au nombre de replicas. Un `minAvailable: 3` sur 3 pods : aucune marge, jamais.
- `maxUnavailable: 0`. C'est la façon la plus directe de dire « ne touche à rien ».
- `minAvailable: 1` sur un deployment à 1 replica. Le classique, parce que ça a l'air raisonnable écrit comme ça.

Le dernier cas est le plus fréquent et il n'a pas de bonne réponse : sur un seul pod, soit on accepte la coupure le temps du reschedule, soit on bloque toute maintenance. Un PDB n'invente pas de la redondance qui n'existe pas. La vraie correction, c'est de passer à 2 replicas.

La colonne à regarder est `ALLOWED DISRUPTIONS` :

```bash
kubectl get pdb -A
```

```text
NAMESPACE   NAME   MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
prod        api    N/A             1                 1                     42d
prod        etcd   3               N/A               0                     42d
```

`0` sur une ligne veut dire qu'aucun drain ne sortira ce workload. Si ce n'est pas volontaire, c'est le bug.

## Le deployment cassé qui bloque tout

Voici le scénario qui coûte une heure. Un deployment à 3 replicas avec `maxUnavailable: 1`, dont 2 pods sont en `CrashLoopBackOff`. Le budget est déjà épuisé par les pods cassés, donc l'API Eviction refuse de sortir le troisième, y compris s'il est lui aussi en vrac. Le drain tourne en boucle sur des pods qui ne servent plus rien.

C'est le comportement par défaut, `unhealthyPodEvictionPolicy: IfHealthyBudget`, qui n'autorise l'éviction d'un pod not-ready que si le budget est respecté. Depuis que le champ existe, on peut dire à Kubernetes que les pods déjà cassés sont évinçables sans compter :

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

`AlwaysAllow` est le bon défaut pour à peu près tout ce qui est stateless : un pod not-ready ne sert pas de trafic, donc le sortir ne dégrade rien. On garde `IfHealthyBudget` là où un pod peut être not-ready tout en travaillant, typiquement une base en train de rejouer son WAL.

## Répartir les pods pour que le budget ait de la marge

Un PDB à `maxUnavailable: 1` ne sert à rien si les 3 replicas sont sur le même node : le drain de ce node demande 3 évictions d'un coup, le budget en autorise 1 et on repart pour un tour. Le budget dit combien de pods peuvent partir, le spread dit s'ils partiront ensemble.

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
```

2 contraintes, 2 rôles différents. Celle sur `hostname` en `DoNotSchedule` garantit qu'un node ne porte pas 2 pods du même deployment, donc qu'un drain ne demande jamais plus d'une éviction. Celle sur `zone` en `ScheduleAnyway` répartit sur les zones quand c'est possible, sans jamais bloquer un scheduling si une zone est saturée.

L'inverse, `DoNotSchedule` sur la zone, est le piège : le jour où une zone est en panne de capacité, les pods restent `Pending` au lieu d'aller ailleurs. Sur du stateless, la disponibilité passe avant la beauté de la répartition.

!!! note "Le cluster a déjà des contraintes par défaut"
    Sans rien déclarer, le scheduler applique un `maxSkew: 3` sur `kubernetes.io/hostname` et un `maxSkew: 5` sur `topology.kubernetes.io/zone`, les deux en `ScheduleAnyway`. Ça explique pourquoi les pods sont vaguement répartis sans qu'on ait rien demandé et pourquoi ce vague ne suffit pas.

## Le skew faussé pendant un rollout

Le `matchLabelKeys: ["pod-template-hash"]` du bloc précédent n'est pas cosmétique. Sans lui, le `labelSelector` matche les pods de l'ancienne et de la nouvelle ReplicaSet en même temps : pendant un rollout, le scheduler compte des pods en `Terminating` dans son calcul de skew et place les nouveaux pods pour compenser un déséquilibre qui va disparaître dans 30 secondes.

Le résultat est une répartition correcte pendant le rollout et bancale après. Sur un deployment qui rollout souvent, la dérive s'accumule.

`pod-template-hash` est le label que le controller pose tout seul sur chaque ReplicaSet, donc il n'y a rien à ajouter dans le template : ajouter la clé dans `matchLabelKeys` suffit à scoper le calcul à la révision courante.

## Les domaines qui n'existent pas encore

Le skew est calculé sur les domaines **qui existent**, pas sur ceux qu'on voudrait avoir. Un `maxSkew: 1` sur la zone avec des nodes dans une seule zone est satisfait trivialement : il n'y a qu'un domaine, donc aucun écart possible et les pods s'empilent au même endroit en toute légalité.

`minDomains` corrige ça en exigeant un nombre minimum de domaines :

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

En dessous de 3 zones occupées, la contrainte n'est pas satisfaite, les pods passent `Pending` et le cluster autoscaler voit qu'il lui manque de la capacité ailleurs. C'est le seul moyen d'obtenir une vraie répartition multi-zone sur un cluster qui démarre.

`minDomains` ne fonctionne qu'avec `whenUnsatisfiable: DoNotSchedule`, ce qui est logique : en `ScheduleAnyway` la contrainte est un souhait, donc un minimum n'a pas de sens.

Les deux autres champs qui traînent dans la spec et qui servent en vrai :

- `nodeAffinityPolicy` : est-ce que les nodes exclus par le `nodeAffinity` du pod comptent comme des domaines. En `Honor`, ils ne comptent pas, ce qui est presque toujours ce qu'on veut.
- `nodeTaintsPolicy` : pareil pour les taints. En `Honor`, un node pool tainté que le pod ne tolère pas n'est plus compté comme un domaine disponible, donc le skew reflète la réalité.

Les défauts sont `Ignore` pour les deux, ce qui fait compter des domaines où le pod ne pourra jamais atterrir.

## Pourquoi pas podAntiAffinity

`podAntiAffinity` fait à peu près la même chose en moins bien. En `requiredDuringSchedulingIgnoredDuringExecution`, c'est du tout ou rien : un pod de plus que de nodes disponibles et il reste `Pending` indéfiniment, sans réglage intermédiaire. En `preferred`, le scheduler pondère mais on ne contrôle pas l'écart toléré.

Le coût de scheduling est l'autre argument : l'anti-affinity compare le pod candidat à tous les pods de tous les nodes, ce qui se paye en latence de scheduling sur un gros cluster. Le topology spread travaille sur un décompte par domaine.

`podAntiAffinity` garde un usage : quand on veut exclure la cohabitation avec un **autre** workload, pas avec soi-même. Le spread ne sait pas exprimer « jamais sur le même node qu'Elasticsearch ».

## Diagnostiquer un drain qui n'avance pas

Le premier réflexe est de demander au serveur ce qui se passerait, sans rien faire :

```bash
kubectl drain gke-prod-pool-1-abc123 \
  --ignore-daemonsets --delete-emptydir-data \
  --dry-run=server
```

Puis on regarde qui refuse. Les évictions rejetées sortent en `429 Too Many Requests` du côté du client et en événement du côté du pod :

```bash
# Quel budget est à zéro
kubectl get pdb -A -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,ALLOWED:.status.disruptionsAllowed,EXPECTED:.status.expectedPods,HEALTHY:.status.currentHealthy'

# La condition qui dit pourquoi
kubectl get pdb api -n prod -o jsonpath='{.status.conditions}' | jq .

# Ce que voit le node
kubectl get pods --field-selector spec.nodeName=gke-prod-pool-1-abc123 -A -o wide
```

La condition `DisruptionAllowed` avec `reason: InsufficientPods` est la réponse : il n'y a pas assez de pods sains pour que le budget autorise une sortie.

Le dernier cas à connaître est le PDB orphelin, dont le `selector` ne matche plus aucun pod parce que les labels du deployment ont changé. `expectedPods: 0` avec un `minAvailable` non nul et le drain se bloque sur un budget qui protège des pods qui n'existent pas.

## Côté GKE : surge, blue-green et la limite d'une heure

GKE respecte les PDB pendant le drain d'un node, mais pas indéfiniment : passé environ 1h sur un node, l'upgrade continue sans attendre. C'est un garde-fou pour éviter qu'un PDB mal écrit gèle un cluster entier et c'est aussi pourquoi un PDB cassé se traduit par un upgrade très lent plutôt que par un upgrade en échec. Un node pool de 20 nodes bloqué sur chaque node, ça fait 20h de fenêtre de maintenance.

Les deux stratégies d'upgrade se règlent par node pool :

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

`--max-unavailable-upgrade 0` avec un `--max-surge-upgrade` non nul est la combinaison qui coûte le plus cher et casse le moins : GKE ajoute des nodes avant d'en retirer, donc la capacité ne descend jamais sous la cible. Sur du delivery en heure de pointe, ça se justifie. Ailleurs, un surge de 1 suffit.

Le blue-green est le seul mode qui permette un rollback rapide, puisque l'ancien pool existe encore pendant la bascule. Il double la capacité le temps de l'opération, donc il faut le quota qui va avec.

Pour suivre l'opération pendant qu'elle tourne, la CLI est plus lisible que la console : voir [Suivre l'upgrade de son cluster GKE](../../cloud/gcloud/gke_upgrades.md).

## Voir aussi

- [Suivre l'upgrade de son cluster GKE](../../cloud/gcloud/gke_upgrades.md) - suivre les opérations d'upgrade en CLI
- [GKE Spot Nodes](../../cloud/gcloud/spot_nodes.md) - les évictions que le PDB ne couvre pas
- [GKE - Capacité réelle des nodes](../../cloud/gcloud/gke_node_capacity.md) - ce qui reste vraiment pour les pods
- [StatefulSet - podManagementPolicy](statefulset_pod_management_policy.md) - l'autre facteur de lenteur d'un rollout
- [ValidatingAdmissionPolicy](validating_admission_policy.md) - refuser un PDB à zéro éviction à l'admission
