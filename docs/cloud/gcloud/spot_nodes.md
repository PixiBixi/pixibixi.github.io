---
description: Réduire les coûts GKE avec les Spot VMs — configuration des node pools, taints, tolérances et bonnes pratiques pour la production.
tags:
  - GKE
  - GCP
  - FinOps
  - Cost Optimization
---

# GKE Spot Nodes

Les Spot VMs sont des instances que GCP peut reprendre à tout moment avec 30 secondes de
préavis. On obtient un gain financier entre 4-5x le prix d'une instance standard

En pratique GCP les reprend rarement et conviennent à une majorité de workload stateless

!!! note "Spot VM vs Preemptible"
    `--preemptible` est déprécié, durée max 24h. En Terraform c'est `spot = true`.

## Deux pools : system + spot

On ne met jamais uniquement des Spot Nodes. Le pattern standard c'est deux pools :

* Pool `system` — On-Demand, pour kube-system, ingress, monitoring, ArgoCD
* Pool `spot` — Spot VM, pour les workloads applicatifs, batch, CI runners

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

## Scheduler les pods sur Spot

Les nœuds Spot reçoivent automatiquement le taint `cloud.google.com/gke-spot=true:NoSchedule`.
Les pods ont besoin de la tolérance correspondante.

```yaml
spec:
  tolerations:
    - key: cloud.google.com/gke-spot
      operator: Equal
      value: "true"
      effect: NoSchedule
  nodeSelector:
    cloud.google.com/gke-spot: "true"
  # GCP donne 30s de préavis max — on reste en dessous
  terminationGracePeriodSeconds: 25
  containers:
    - name: my-app
      image: my-app:latest
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
```

## Éviter que GCP reprenne tout d'un coup

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

## Ce qui passe sur Spot, ce qui ne passe pas

La vraie question : **ce nœud détient-il un state critique non répliqué instantanément ?**

Le tableau ci-dessous donne des exemples courants mais chaque appli est différente — à évaluer au cas par cas selon son architecture réelle.

| Workload | Spot OK ? | Pourquoi |
|----------|:---------:|---------|
| Déploiements stateless (N > 1 + PDB) | ✅ | Aucun state local |
| Jobs batch / workers de queue | ✅ | Retry natif |
| CI/CD runners | ✅ | Job rejoué si interrompu |
| Ingress controllers (N > 1 + PDB) | ✅ | Stateless |
| ArgoCD (HA, composants stateless) | ✅ | Stateless, redémarre proprement |
| DB replica / standby | ✅ | Ne détient pas les écritures actives |
| Prometheus avec `remote_write` | ✅ | State flushé en continu, perte négligeable |
| Prometheus sans `remote_write` | ❌ | Perte du TSDB local à la reprise |
| DB primary / leader | ❌ | Failover ~30-60s, GCP donne 30s — fenêtre trop serrée |
| StatefulSet sans réplication | ❌ | State local non répliqué |

## Autoscaler : plusieurs pools pour limiter le risque

Si GCP n'a plus de place pour un type d'instance donné, l'autoscaler est bloqué.
On crée plusieurs pools Spot avec des types différents :

```text
spot-n2-standard-8
spot-n2d-standard-8
spot-c2-standard-8
```

L'autoscaler utilisera celui qui a de la capacité.

## Commandes utiles

```bash
# Voir quels nœuds sont Spot
kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,SPOT:.metadata.labels.cloud\.google\.com/gke-spot'

# Simuler la reprise d'un nœud par GCP
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data --grace-period=25
```
