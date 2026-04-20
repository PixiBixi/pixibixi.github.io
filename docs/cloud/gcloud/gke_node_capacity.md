---
description: Capacité réelle des nodes GKE — CPU et RAM allouables après réservations système, par taille de node.
tags:
  - GKE
  - FinOps
---

# GKE — Capacité réelle des nodes

Sur GKE, le node size annoncé et ce que K8S voit réellement sont deux choses différentes.
GKE réserve une part du CPU et de la RAM pour ses composants système, et ce n'est pas négligeable sur les petits gabarits.

Source : [GKE — Plan node sizes / Resource reservations](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes#resource_reservations)

!!! warning "Chiffres valables en avril 2026"
    Ces valeurs reflètent la documentation GKE au moment de l'écriture de cet article.
    GCP peut modifier les formules de réservation à tout moment — vérifier la source officielle ci-dessus avant de dimensionner en production.

## Ce qui est réservé

**CPU** (progressif, toujours en millicores) :

- 6% du 1er core
- 1% du 2e core
- 0,5% des cores 3 et 4
- 0,25% au-delà de 4 cores

**RAM** (progressif également) :

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
    Sur des clusters avec beaucoup de petits nodes, on paye pour de la RAM que K8S ne peut pas utiliser.

## Voir aussi

- [GKE Spot Nodes](spot_nodes.md) — Réduire les coûts en complément du dimensionnement
