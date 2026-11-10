---
description: Capacité réelle des nodes GKE - CPU et RAM allouables après réservations système, par taille de node.
tags:
  - GKE
  - FinOps
---

# GKE - Capacité réelle des nodes

Sur GKE, le node size annoncé et ce que K8s voit réellement sont 2 choses différentes.
GKE réserve une part du CPU et de la RAM pour ses composants système et ce n'est pas négligeable sur les petits gabarits.

Source : [GKE - Plan node sizes / Resource reservations](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes#resource_reservations)

!!! warning "Node pools créés en GKE 1.36 ou avant"
    Les formules et le tableau ci-dessous valent pour les node pools créés en 1.36 ou avant (même upgradés ensuite). Les node pools créés en 1.37+ réservent moins de RAM, voir la section dédiée plus bas.
    GCP peut modifier les formules de réservation à tout moment - vérifier la source officielle ci-dessus avant de dimensionner en production.

## Ce qui est réservé

### CPU (progressif, toujours en millicores)

- 6% du 1er core
- 1% du 2e core
- 0,5% des cores 3 et 4
- 0,25% au-delà de 4 cores

### RAM (progressif également)

- 255 MiB fixe pour les machines de moins de 1 GiB
- 25% des premiers 4 GiB
- 20% des 4 GiB suivants (jusqu'à 8 GiB)
- 10% des 8 GiB suivants (jusqu'à 16 GiB)
- 6% des 112 GiB suivants (jusqu'à 128 GiB)
- 2% au-delà de 128 GiB
- +100 MiB fixe pour le seuil d'éviction pods

## Capacité réelle par gabarit

Valeurs calculées pour des nodes avec autant de GiB que de vCPU (ex: 4 GiB / 4 vCPU) :

| Node (GiB / vCPU) | RAM réservée (GiB) | RAM allouable (GiB) | CPU réservé (vCPU) | CPU allouable (vCPU) | Efficacité RAM |
| --: | --: | --: | --: | --: | --: |
| 4 | 1,10 | 2,90 | 0,08 | 3,92 | 72,5% |
| 8 | 1,90 | 6,10 | 0,09 | 7,91 | 76,3% |
| 16 | 2,70 | 13,30 | 0,11 | 15,89 | 83,1% |
| 32 | 3,66 | 28,34 | 0,15 | 31,85 | 88,6% |
| 64 | 5,58 | 58,42 | 0,23 | 63,77 | 91,3% |
| 128 | 9,42 | 118,58 | 0,39 | 127,61 | 92,6% |

La réservation CPU est quasi négligeable (< 0,5 vCPU dans tous les cas).
La RAM, en revanche, pique sur les petits nodes : sur un 4 GiB, on perd 27,5% avant même de scheduler le moindre pod.

!!! tip "Implication FinOps"
    Privilégier des nodes plus grands améliore l'efficacité RAM (72% → 92%).
    Sur des clusters avec beaucoup de petits nodes, on paye pour de la RAM que K8s ne peut pas utiliser.

## Node pools créés en GKE 1.37+

La RAM réservée dépend aussi du nombre max de pods par node, on garde le plus petit des 2 :

```text
MemoryReserved = Min(ancienne formule, 15 MiB x MaxPodsPerNode + BaseOverhead)
```

- `BaseOverhead` vaut 500 MiB sur Container-Optimized OS, 700 MiB sur Ubuntu
- les 100 MiB du seuil d'éviction s'ajoutent toujours par-dessus
- le CPU réservé est plafonné à 1 vCPU, sans effet sur les gabarits du tableau

Exemple sur un node 32 GiB en COS : avec 110 pods max, on réserve 2,20 GiB au lieu de 3,66 GiB ; avec 32 pods max, 1,05 GiB. Avec 110 pods max (le défaut en Standard), rien ne change jusqu'à 8 GiB : le gain se voit sur les gros nodes et quand on baisse le max pods.

## Voir aussi

- [GKE Spot Nodes](spot_nodes.md) - Réduire les coûts en complément du dimensionnement
