---
description: Réduire les coûts GKE avec les Spot VMs - configuration des node pools, taints, tolerations et bonnes pratiques pour la production.
tags:
  - GKE
  - GCP
  - FinOps
---

# Spot sur GKE : node pools, scheduling et workloads éligibles

Les Spot VMs sont des instances que GCP peut évincer à tout moment avec 30 secondes de préavis. En échange, la [doc Compute Engine](https://cloud.google.com/compute/docs/instances/spot#pricing) annonce une remise allant jusqu'à 91 % du prix on-demand, qui varie selon le type de machine et la région (voir la [grille tarifaire](https://cloud.google.com/spot-vms/pricing)).

La fréquence des évictions varie selon le type de machine et la zone. Un workload stateless et répliqué les absorbe en général sans impact visible.

!!! note "Spot VM vs Preemptible"
    Les VM preemptible expirent au bout de 24h, les Spot VMs n'ont aucune durée maximale. GKE supporte toujours les 2, mais Google recommande Spot pour remplacer preemptible. En Terraform, on pose `spot = true`.

## Séparer un pool system d'un pool spot

Un cluster entièrement en Spot perdrait aussi kube-system, l'ingress et le monitoring lors d'une éviction groupée. Le schéma usuel repose donc sur 2 pools :

- Pool `system`, en On-Demand, pour kube-system, l'ingress, le monitoring et ArgoCD
- Pool `spot`, en Spot VM, pour les workloads applicatifs, les batchs et les runners de CI

Le type de machine (`machine_type`) change la capacité réellement allouable, voir [GKE - Capacité réelle des nodes](gke_node_capacity.md) pour bien dimensionner.

```hcl
resource "google_container_node_pool" "system" {
  name    = "system"
  cluster = google_container_cluster.main.name

  initial_node_count = 3

  autoscaling {
    min_node_count = 3
    max_node_count = 6
  }

  node_config {
    machine_type = "n2-standard-4"
    spot         = false
  }
}

resource "google_container_node_pool" "spot" {
  name    = "spot"
  cluster = google_container_cluster.main.name

  initial_node_count = 0

  autoscaling {
    min_node_count = 0
    max_node_count = 30
  }

  node_config {
    machine_type = "n2-standard-8"
    spot         = true

    taint {
      key    = "cloud.google.com/gke-spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }
}
```

Sur un cluster régional, `min_node_count` et `initial_node_count` s'appliquent à chaque zone. Le pool system démarre donc à 9 nodes sur 3 zones.

## Scheduler les pods sur Spot

GKE pose automatiquement le label `cloud.google.com/gke-spot=true` sur les nodes Spot. Le taint `cloud.google.com/gke-spot=true:NoSchedule` n'est posé automatiquement que sur les pools créés par le node auto-provisioning. Sur un pool créé à la main, il n'existe que si on le déclare, comme dans le Terraform ci-dessus. Les pods qui doivent s'y placer ont alors besoin de la toleration correspondante.

```yaml
spec:
  tolerations:
    - key: cloud.google.com/gke-spot
      operator: Equal
      value: "true"
      effect: NoSchedule
  nodeSelector:
    cloud.google.com/gke-spot: "true"
  # Sur les 30s de préavis, GKE ne laisse que 15s aux pods applicatifs
  terminationGracePeriodSeconds: 15
  containers:
    - name: my-app
      image: my-app:1.4.2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
```

Les 30 secondes de préavis ne vont pas toutes à l'application. GKE donne 15 secondes aux pods ordinaires, puis 15 secondes aux pods système critiques. Un `terminationGracePeriodSeconds` au-delà de 15 ne sert à rien sur une éviction Spot. Depuis la version 1.35.0-gke.1171000 du control plane, la [doc GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/spot-vms) permet d'allonger cette période jusqu'à 120 secondes sur un node pool Standard.

## Ce que le PDB couvre sur Spot

Un PDB ne retient pas GCP quand il évince un node Spot, car cette éviction est involontaire et ne passe pas par l'API Eviction. La doc GKE prévient qu'on peut subir plus d'indisponibilité que ce que le PDB autorise. Le PDB couvre en revanche le drain manuel, l'autoscaler et l'upgrade de pool. Le détail est dans [PDB et topology spread](../../kubernetes/deployment/pdb_topology_spread.md).

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  selector:
    matchLabels:
      app: my-app
  minAvailable: 2
```

## Choisir les workloads éligibles à Spot

La question qui décide de l'éligibilité est de savoir si le node détient un state critique qui n'est pas répliqué instantanément. Le tableau couvre les cas les plus courants mais ne dispense pas de vérifier ce que l'application garde réellement en local.

| Workload | Spot OK ? | Pourquoi |
|----------|:---------:|---------|
| Déploiements stateless (N > 1 + PDB) | ✅ | Aucun state local |
| Jobs batch / workers de queue | ✅ | Retry natif |
| Runners de CI/CD | ✅ | Job rejoué si interrompu |
| Ingress controllers (N > 1 + PDB) | ✅ | Stateless |
| ArgoCD (HA, composants stateless) | ✅ | Stateless, redémarre proprement |
| DB replica / standby | ✅ | Ne détient pas les écritures actives |
| Prometheus avec `remote_write` | ✅ | Les échantillons partent en continu, la perte se limite à la fenêtre pas encore envoyée |
| Prometheus sans `remote_write` | ❌ | Perte de la TSDB locale à l'éviction |
| DB primary / leader | ❌ | Un failover dure souvent plus longtemps que les 15s laissées au pod |
| StatefulSet sans réplication | ❌ | State local non répliqué |

## Autoscaler : plusieurs pools pour limiter le risque

Quand GCP n'a plus de capacité Spot pour un type d'instance, l'autoscaler ne peut plus agrandir le pool concerné. Plusieurs pools Spot de types différents évitent ce blocage :

```text
spot-n2-standard-8
spot-n2d-standard-8
spot-c2-standard-8
```

L'autoscaler choisit alors le pool à agrandir selon son expander et la capacité disponible.

## Repérer les nodes Spot et tester un drain

Les commandes suivantes listent les nodes Spot et drainent un node pour voir comment l'application réagit. Un drain respecte les PDB, contrairement à une vraie éviction Spot. Il donne donc une vision plus optimiste que la réalité.

```bash
# Voir quels nodes sont Spot
kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,SPOT:.metadata.labels.cloud\.google\.com/gke-spot'

# Approcher une éviction Spot (le drain respecte les PDB, GCP non)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --grace-period=15
```

## Voir aussi

- [GKE - Capacité réelle des nodes](gke_node_capacity.md) - dimensionner les nodes pour optimiser le ROI
- [PDB et topology spread](../../kubernetes/deployment/pdb_topology_spread.md) - ce qu'un PDB protège et ce qu'il ne protège pas
- [GKE Workload Identity](workload_identity.md) - accorder les bonnes permissions aux pods sur des nodes Spot
