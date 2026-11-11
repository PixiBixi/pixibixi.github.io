---
article: docs/kubernetes/troubleshooting/troubleshooting_sa.md
checked: '2026-11-11'
commit: 66d09f857552c5a1235d850409af9d00f12918db
sources: []
unpinned: 4
---

# docs/kubernetes/troubleshooting/troubleshooting_sa.md

## Findings

- L61 ERROR corrigé : le Pod de test utilise `serviceAccountName: loki` dans le namespace du SA (`namespace: <namespace>`), et une phrase dit que le Pod doit être dans le même namespace. Preuve : lecture de l'article (SA `loki` dans `namespace`, Pod dans `default` avec SA `default`); kind v1.31.2 : `kubectl run ... --overrides='{"spec":{"serviceAccountName":"loki"}}' --dry-run=server` renvoie bien `loki`. Le rejet d'un Pod dont le SA n'existe pas dans son namespace n'a pas pu être testé (commande refusée par le permission checker).
- L44 OUTDATED corrigé : `secrets:` retiré de la sortie + phrase sur l'arrêt de la génération auto des Secrets de token depuis 1.24. Preuve : kubernetes pkg/features/kube_features.go@v1.24.0:1005 `LegacyServiceAccountTokenNoAutoGeneration ... Beta`, @v1.26.0:1056 `GA`; kind v1.31.2, `kubectl create sa loki` puis `get -o yaml` : aucun champ `secrets`.
- L30 IMPRECISE corrigé : ARN avec un ID de compte d'exemple `123456789012`. Preuve : format ARN IAM `arn:aws:iam::<account>:role/<name>` (connu, pas de doc AWS rechargée).
- L85 IMPRECISE corrigé : la conclusion précise qu'on est côté IAM AWS et liste les causes possibles (policy du rôle, trust policy et son `sub`, annotation, bucket policy). Preuve : format du `sub` IRSA `system:serviceaccount:<ns>:<sa>` (connu, non rechargé).

## En plus

- `variables:` `namespace` (défaut `loki`) ajouté, utilisé dans la commande `get`, la sortie du SA et le Pod.

## Modernisation

- Appliqué : `kubectl run aws-debug ... --overrides ... -- sts get-caller-identity` pour voir le rôle réellement assumé. Overrides vérifié sur kind (dry-run server), `sts get-caller-identity` non exécuté (pas de compte AWS).
- Appliqué : `kubectl auth can-i ... --as=system:serviceaccount:<ns>:<sa>` pour le RBAC Kubernetes. Testé sur kind (`no`).
- Ignoré : EKS Pod Identity, hors sujet du debug IRSA et non vérifié.

## Tests

- kind v1.31.2 (kindest/node:v1.31.2), kubectl client v1.37.1. Cluster supprimé.

## À signaler

- La sortie `kubectl get sa` est une capture réelle de 2023 : j'en ai retiré `secrets:` pour coller aux clusters actuels, à revoir si l'auteur préfère garder la capture brute.
