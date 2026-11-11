---
article: docs/cloud/gcloud/gke_node_capacity.md
checked: '2026-11-11'
commit: 140a16dceae6aa820ca4d75aba27a7ad9b057229
sources: []
unpinned: 2
---

# docs/cloud/gcloud/gke_node_capacity.md

## Findings

- L15 OUTDATED corrigé : l'avertissement "valables en avril 2026" devient "Node pools créés en GKE 1.36 ou avant", et une section "Node pools créés en GKE 1.37+" est ajoutée (formule Min(ancienne, 15 MiB x MaxPods + BaseOverhead), BaseOverhead 500 MiB COS / 700 MiB Ubuntu, 100 MiB d'éviction en plus, CPU plafonné à 1 vCPU) avec un exemple chiffré. Preuve : <https://docs.cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes> (section Resource reservations, relue le 2026-11-09) ; exemples recalculés avec un script Python (32 GiB : 2,20 GiB à 110 pods, 1,05 GiB à 32 pods, contre 3,66).
- L24 IMPRECISE corrigé : palier "255 MiB pour les machines de moins de 1 GiB" ajouté. Preuve : même page.

## En plus

- Aucun. Le tableau existant a été recalculé (formule 1.36) : valeurs exactes.

## Modernisation

- Aucune suggestion fournie.

## Tests

- Script Python (uv) de recalcul des réservations RAM.

## À signaler

- "110 pods max = défaut en Standard" est écrit de mémoire (connu, non resourcé dans cette passe).
- Le lien vers la nouvelle section est en texte ("plus bas") : l'ancre Python-Markdown (`crees`) et celle de markdownlint MD051 (`créés`) divergent sur les accents.
