---
article: docs/cloud/gcloud/gke_upgrades.md
checked: '2026-11-11'
commit: f286032f175de1f098895abde6d2697c8c876b32
sources: []
unpinned: 1
---

# docs/cloud/gcloud/gke_upgrades.md

## Findings

- L12 IMPRECISE corrigé : ajout d'un paragraphe expliquant que sans `--location` la commande liste toutes les opérations du project, toutes locations et tous clusters confondus (et ignore la propriété `compute/region`), avec une commande filtrée `--filter='targetLink~/clusters/<cluster> AND status=RUNNING'`. Preuve : google-cloud-sdk 535.0.0 local, `lib/surface/container/operations/list.py` (`location_get(args, ignore_property=True, required=False)`) et `lib/googlecloudsdk/api_lib/container/api_adapter.py:6631-6637` (`if not location: location = '-'`). Filtre testé avec `googlecloudsdk.core.resource.resource_filter.Compile(...).Evaluate()` : True pour une opération de node pool RUNNING du cluster, False pour la même DONE et pour un autre cluster RUNNING.

## En plus

- Rien.

## Modernisation

- Appliqué : filtre `status=RUNNING` (fusionné avec le filtre cluster) et `gcloud container operations wait <operation> --location=<location>`. `--location` ajouté car `wait` appelle `location_get(args)` sans `ignore_property` ni `required=False` (`lib/surface/container/operations/wait.py`), donc sans propriété de zone/région configurée il en faut une. Ajout de `variables:` (cluster, location, operation) avec les valeurs de l'exemple.

## Tests

- gcloud SDK 535.0.0 (lecture du code et test du parseur de filtre en local, aucun appel API : pas de projet GCP utilisé).

## À signaler

- Le filtre a été testé sur un dict Python, pas contre l'API réelle : à valider une fois sur un vrai project (`status` est un enum côté API, rendu `RUNNING` en texte).
