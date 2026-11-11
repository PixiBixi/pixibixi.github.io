---
article: docs/kubernetes/troubleshooting/resize_pvc_statefulset.md
checked: '2026-11-11'
commit: d5d37d27b0159143b1b7e82863896102a68d8363
sources:
- repo: kubernetes
  path: pkg/features/kube_features.go
  lines: 2032-2036
  ref: v1.37.2
  commit: c50e5395f1ae2d4a2c05f28fdcc38c0916cc1a32
- repo: kubernetes
  path: pkg/apis/apps/validation/validation.go
  lines: '268'
  ref: v1.34.0
  commit: f28b4c9efbca5c5c0af716d9f2d5702667ee8a45
- repo: kubernetes
  path: pkg/apis/core/validation/validation.go
  lines: 2613-2622
  ref: v1.37.2
  commit: c50e5395f1ae2d4a2c05f28fdcc38c0916cc1a32
unpinned: 1
---

# docs/kubernetes/troubleshooting/resize_pvc_statefulset.md

## Findings

- L144 OUTDATED corrigé : la condition sur le feature gate devient "GA et toujours actif depuis 1.34, actif par défaut depuis 1.32, à activer à la main avant". Preuve : kubernetes pkg/features/kube_features.go:2032-2036 @v1.37.2 (Alpha 1.23 off, Beta 1.32 on, GA 1.34 `LockToDefault: true`, "remove in 1.37" ; déjà retiré de origin/master du 2026-11-08).
- L18 IMPRECISE corrigé : `'revisionHistoryLimit'` ajouté au message, avec la plage de versions (1.33 à 1.36), et une phrase sur le message de 1.37. Preuve : pkg/apis/apps/validation/validation.go:268 @v1.34.0 (avec revisionHistoryLimit), :193 @v1.31.0 (sans), absent @v1.32.0, présent @v1.33.0 ; commit 91341fc8793 (v1.37.0-alpha.2) remplace ce Forbidden par `ValidateImmutableField(... VolumeClaimTemplates ...)`, message `field is immutable` (staging/src/k8s.io/apimachinery/pkg/api/validation/objectmeta.go:37, 137-143 @v1.37.2).
- L142 IMPRECISE corrigé : le manque de slot d'attachement est rattaché au cas réel (driver en expansion offline : le pod redémarré ne ré-attache pas son volume, reste `Pending`, PVC en `FileSystemResizePending`) ; "dans l'ordre de fréquence" remplacé par "Les causes qu'on rencontre", faute de source. Preuve : raisonnement sur la procédure offline décrite plus haut dans l'article, pas de source externe.

## En plus

- L144 : "jamais plus petite que `status.capacity`" devient "strictement plus grande que `status.capacity`" (l'égalité est refusée aussi). Preuve : pkg/apis/core/validation/validation.go:2613-2622 @v1.37.2 (`if newSize.Cmp(statusSize) <= 0` -> "field can not be less than status.capacity").

## Modernisation

- Gate GA : appliqué (L144).
- volumeClaimTemplates toujours immuable en 1.37 : confirmé (validation.go @v1.37.2 + types.go:234 `+k8s:alpha(since: "1.37")=+k8s:immutable`), procédure orphan inchangée, mention du nouveau message ajoutée.

## Tests

- Aucun cluster lancé : lecture du source kubernetes (clone local, tags v1.31.0 à v1.37.2 et origin/master).

## À signaler

- Le message 1.37 est cité abrégé (`Invalid value: ...`) : kubectl y imprime la valeur entière du champ, non reproduit sur un vrai cluster.
