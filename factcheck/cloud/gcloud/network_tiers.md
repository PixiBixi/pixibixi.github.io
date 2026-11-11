---
article: docs/cloud/gcloud/network_tiers.md
checked: '2026-11-11'
commit: 7ab7aead28a6c9b6cda49c439cc89f53f5956b01
sources: []
unpinned: 9
---

# docs/cloud/gcloud/network_tiers.md

## Findings

- L72 IMPRECISE corrigé : la grille Standard d'europe-west4 est bien 0,085 $ / 0,065 $ / 0,045 $ par GiB (premier palier, 10 à 150 TiB, au-delà de 150 TiB), mais la phrase "0,085 $ contre 0,045 $ au-delà de 150 TiB" mélange les paliers : 0,085 $ est le Premium du palier 10 à 150 TiB (ou le Standard du premier palier), le Premium au-delà de 150 TiB est à 0,07 ou 0,08 $ selon la région. Les paliers de la page sont 200 GiB gratuits, 200 GiB à 10 TiB, 10 à 150 TiB, plus de 150 TiB, pas "le premier TiB". Le ratio 1,3 à 1,9x n'est donc pas celui d'un même palier. Corriger en comparant palier par palier avec la grille lue en direct. Preuve : <https://cloud.google.com/network-tiers/pricing> (page lue le 2026-11-11, pas de commit)

Correction : grille Standard europe-west4 relue sur la page (0,085 $ / 0,065 $ / 0,045 $), Premium relu sur la page VPC pricing, égress vers l'Europe (0,12 $ jusqu'à 1 TiB, 0,11 $ jusqu'à 10 TiB, 0,085 $ au-delà). Preuve : <https://cloud.google.com/vpc/network-pricing> (lue le 2026-11-11, pas de commit)

Les autres affirmations vérifiées sur la doc (LB passthrough régional compatible Standard, Application LB global, proxy global et Cloud CDN Premium seulement, IPv6 Standard en Preview, IP qui ne change pas de tier, tier de la ressource prioritaire sur le projet, Premium par défaut, valeurs `network-default`/`Standard`/`Premium` du cluster, annotation `cloud.google.com/network-tier` prioritaire, héritage du tier cluster par les Services et node pools, tier des node pools non réglable directement, changement de tier du cluster sans effet sur l'existant, erreur `requested ip ... is neither static nor assigned to the LB`) sont exactes. Preuve : <https://docs.cloud.google.com/network-tiers/docs/overview> et <https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-tiers> (pages lues le 2026-11-11, pas de commit)

## Unpinned

- Les noms de SKUs de facturation (`Network Standard Data Transfer Out to Internet from <région>`, anciens noms `Standard Tier` et `Egress`), non vérifiés dans le catalogue billing.
- Le prix Premium exact d'europe-west4 (0,12 $ pour le palier 200 GiB à 10 TiB), la page de pricing rendue en JavaScript ne permet pas de rattacher sans ambiguïté la grille à la région.
- L'événement `Network tier mismatch for resource Static IP (...)` du contrôleur `l4-rbs` et l'event `SyncExternalLoadBalancerFailed`, comportement du contrôleur GKE non publié dans le code source.
- Le refus du tier d'un Service existant par le contrôleur L4 (annotation `cloud.google.com/l4-rbs`).
- L'erreur `Error 400: Cannot configure network tier for a private cluster`, retour d'API observé, absent de la doc GKE.
- L'annotation `networking.gke.io/load-balancer-ip-addresses` pour nommer l'adresse réservée.
- Les mesures `mtr` et traceroute (perte de 2,5 %, 22 ms contre 18 ms), observations terrain.
- Le comportement ApplicationSet ArgoCD (les `values:` inline passent avant les `valueFiles`) et celui d'external-dns avec les TXT d'ownership.
- Le retour direct du LB passthrough (réponse avec la VIP source qui sort sans repasser par le LB) et le tier propre aux adresses Cloud NAT.
