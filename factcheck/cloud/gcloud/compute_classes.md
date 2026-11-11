---
article: docs/cloud/gcloud/compute_classes.md
checked: '2026-11-11'
commit: 9ca62493e9f39b3deb0e858b3a2a84e3df956303
sources: []
unpinned: 2
---

# docs/cloud/gcloud/compute_classes.md

## Findings

- L37 IMPRECISE corrigé : "GKE prend la série de machines par défaut du cluster" est faux, la doc donne `e2` comme défaut du champ `machineFamily`. Écrire "sans `machineFamily`, GKE retombe sur `e2`". Preuve : docs.cloud.google.com/kubernetes-engine/docs/concepts/about-custom-compute-classes ("If unspecified, the default is `e2`.") @ lu le 2026-11-11

## Verified

Vérifiés contre les pages GKE (lues le 2026-11-11, aucune source de code publique pour ces CRD) : versions 1.30.3-gke.1451000 et 1.33.3-gke.1136000, défaut de `whenUnsatisfiable` (`ScaleUpAnyway` avant 1.33, `DoNotScaleUp` ensuite), recommandation `activeMigration` pour les workloads stateful, `optimizeRulePriority` à `false` ou absent, rejet d'un pod qui demande classe et Spot ou série, labels de namespace et versions 1.33.1-gke.1788000 et 1.33.1-gke.1744000, `--enable-default-compute-class`, taint ARM et toleration automatique, `CCC is healthy.`, `NodePoolNotExist`, `ReservationUnusable`, `Invalid machine type`, les 2 `messageId`, la métrique `cluster_pending_pods_per_ccc` (1.37+), `unable_to_provision`, conseil de lister les `machineType` du moins cher au plus cher.

## Unpinned

- L43 "hors canal Rapid" : la page des ComputeClass ne mentionne aucune exception pour le canal Rapid.
- L91 la toleration ajoutée automatiquement par GKE pour le taint `cloud.google.com/compute-class` : la doc décrit le taint et le label, mais pas de toleration automatique.
