---
article: docs/kubernetes/deployment/statefulset_pod_management_policy.md
checked: '2026-11-10'
commit: 7046bb03f6d374bc676e8306be1c517bae9f5032
sources:
- repo: kubernetes
  path: staging/src/k8s.io/api/apps/v1/types.go
  lines: '140'
  ref: origin/master
  commit: 66762faae31c6610d62e645606ee13860307243b
- repo: kubernetes
  path: pkg/features/kube_features.go
  lines: 1708-1711
  ref: origin/master
  commit: 66762faae31c6610d62e645606ee13860307243b
unpinned: 2
---

# docs/kubernetes/deployment/statefulset_pod_management_policy.md

## Findings

- L25 ERROR corrigé : la puce Parallel dit maintenant que le rolling update reste à 1 pod à la fois par défaut et que Parallel ne joue que sur création/suppression/scale. Preuve : kubernetes `staging/src/k8s.io/api/apps/v1/types.go:140 @origin/master (v1.38.0-beta.0-170-g66762faae31)` "Defaults to 1" ; `pkg/controller/statefulset/stateful_set_control.go:877` `maxUnavailable := 1`.
- L49 ERROR corrigé : le gain par N est limité au démarrage initial et au scale, renvoi vers maxUnavailable pour le rolling update, chiffres 2 min / 20 min retirés (non sourcés). Preuve : mêmes fichiers.
- L53 OUTDATED corrigé : paragraphe sur le feature gate `MaxUnavailableStatefulSet` (alpha 1.24, beta off 1.35-1.36, on depuis 1.37, ignoré sinon). Preuve : `pkg/features/kube_features.go:1708-1711 @origin/master` ; `v1.36.0` n'a que les entrées 1.24 et 1.35 ; tags v1.37.x présents. Sans le gate, `stateful_set_control.go:783` saute la logique maxUnavailable et la boucle legacy supprime un pod à la fois.
- L53 IMPRECISE corrigé : OrderedReady nuancé ("le contrôleur peut supprimer 2 pods mais les recrée un par un"), citation "might not be effective". Preuve : `types.go:145` ; `stateful_set_control.go:973-990` (branche OrderedReady, `podsToDelete := maxUnavailable - unavailablePods`) et recréation monotone L764-774.

## En plus

- Phrase ajoutée avant le premier bloc YAML (section Configurer), règle "une phrase avant chaque bloc".

## Modernisation

- Feature gate et versions : appliqué (voir L53 OUTDATED).

## Tests

- Lecture de source uniquement (clone local kubernetes), pas de cluster lancé.

## À signaler

- Rien.
