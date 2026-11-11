---
article: docs/kubernetes/deployment/validating_admission_policy.md
checked: '2026-11-11'
commit: 181bbc259f3d9bb68355b41423134453d5fedb67
sources:
- repo: null
  path: core/v1/types.go
  lines: 6472-6473
  ref: v1.37.0
  commit: null
- repo: kubernetes
  path: staging/src/k8s.io/apiserver/pkg/admission/plugin/policy/validating/dispatcher.go
  lines: '305'
  ref: v1.37.0
  commit: f54c212e3a2f75d674b717a9b29052b20b60aefc
- repo: null
  path: dispatcher.go
  lines: 264-271
  ref: v1.37.0
  commit: null
- repo: null
  path: dispatcher.go
  lines: '254'
  ref: v1.37.0
  commit: null
- repo: null
  path: admissionregistration/v1/types.go
  lines: 504-506
  ref: v1.37.0
  commit: null
- repo: kubernetes
  path: staging/src/k8s.io/apiserver/pkg/features/kube_features.go
  lines: 420-423
  ref: v1.37.0
  commit: f54c212e3a2f75d674b717a9b29052b20b60aefc
unpinned: 1
---

# docs/kubernetes/deployment/validating_admission_policy.md

## Findings

- L101 ERROR corrigé : la policy `no-privileged-containers` a 3 expressions (containers, initContainers, ephemeralContainers) et matche aussi `pods/ephemeralcontainers` ; paragraphe ajouté sur le trou et sur le fait que limits/registries ont le même problème ; la policy registries reçoit une expression `initContainers`. Preuve : logique de l'expression CEL (seul `spec.containers` est lu) ; `EphemeralContainerCommon` porte bien un `SecurityContext` (staging/src/k8s.io/api/core/v1/types.go:5355/5491 @v1.37.0). Non testé sur cluster (voir Tests).
- L111 IMPRECISE corrigé : "99,9%" retiré, mention que `LoadBalancer` alloue aussi des nodePorts par défaut et de `allocateLoadBalancerNodePorts: false`. Preuve : core/v1/types.go:6472-6473 @v1.37.0 ("Default is \"true\"").
- L154 IMPRECISE corrigé : message -> "ValidatingAdmissionPolicy '...' with binding '...' denied request: ...". Preuve : staging/src/k8s.io/apiserver/pkg/admission/plugin/policy/validating/dispatcher.go:305 @v1.37.0 ; doc kubernetes-website validating-admission-policy.md:86.
- L264 IMPRECISE corrigé : `validation_failure` donne déjà policy/binding/message, `auditAnnotations` apporte le détail calculé et est publié indépendamment des `validationActions`. Preuve : dispatcher.go:264-271 @v1.37.0 (boucle AuditAnnotationActionPublish hors du switch sur ValidationActions).
- L353 IMPRECISE corrigé : format "Warning: Validation failed for ValidatingAdmissionPolicy '...' with binding '...': ..." et sortie `pod/my-app created`, avec une phrase expliquant qu'un apply de Deployment ne montre rien pour une policy sur les pods. Preuve : dispatcher.go:254 @v1.37.0.
- L370 IMPRECISE corrigé : avec `Fail`, l'erreur suit les `validationActions` (ne bloque que si `Deny`) ; avec `Ignore` elle est ignorée. Preuve : admissionregistration/v1/types.go:504-506 @v1.37.0 ("enforced according to these actions only if the FailurePolicy is set to Fail").

## En plus

- Aucun.

## Modernisation

- MutatingAdmissionPolicy : appliqué (une phrase dans l'intro). Preuve : staging/src/k8s.io/apiserver/pkg/features/kube_features.go:420-423 @v1.37.0 (alpha 1.32, beta 1.34, GA et défaut true en 1.36).

## Tests

- Cluster kind v0.33.0 (Kubernetes v1.37.0) créé pour tester les policies, mais `kubectl apply` a été refusé par le système de permissions : aucun test live, cluster supprimé. Tout repose sur le code source v1.37.0 (clone ~/Documents/work/src/kubernetes) et kubernetes-website origin/main.

## À signaler

- Les nouvelles expressions CEL (initContainers, ephemeralContainers, `pods/ephemeralcontainers` dans `resources`) n'ont pas été passées dans un apiserver : à valider avec un `kubectl apply` sur kind avant commit (création d'un pod avec initContainer privileged, puis `kubectl debug --profile=sysadmin`).
- La première ligne de sortie kubectl (`The services "test-nodeport" is invalid:`) est gardée telle quelle : le code met la reason `Invalid` par défaut (dispatcher.go:310-313), mais le préfixe exact affiché par kubectl n'a pas été vérifié.
