---
article: docs/cloud/gcloud/spot_nodes.md
checked: '2026-11-11'
commit: 2b042d2f093f98ae0e6b61a98aa768d23e1b710a
sources: []
unpinned: 1
---

# docs/cloud/gcloud/spot_nodes.md

## Findings

- L11 IMPRECISE corrigé : "30 secondes de préavis" remplacé par "pas de préavis par défaut, période d'arrêt de 30 s au plus (best effort)" ; L84 (commentaire YAML) et L95 reformulés en "30 s de graceful termination côté GKE à la réception du signal de préemption". Preuve : docs.cloud.google.com/compute/docs/instances/spot ("The shutdown period for Spot VMs is best effort and up to 30 seconds", préavis 0 s par défaut, 120 s recommandé) et docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms ("By default, GKE clusters have a 30-second graceful termination period for Pods to shut down", 15 s + 15 s, 120 s depuis 1.35.0-gke.1171000), lus le 2026-11-09.

## En plus

- Rien.

## Modernisation

- Aucune suggestion.

## Tests

- Aucun, vérification documentaire uniquement.

## À signaler

- La doc GKE cite aussi 1.36.0-gke.3204000 pour l'extension à 120 s via ComputeClass custom ; non ajouté (l'article parle des node pools Standard).
- L'option Compute Engine "preemption notice duration" (120 s) n'est pas mentionnée : je n'ai pas vérifié si elle est exposée côté GKE.
