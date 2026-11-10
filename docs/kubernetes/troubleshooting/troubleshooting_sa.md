---
description: Déboguer les droits d'accès d'un service account Kubernetes avec des pods de test dédiés
tags:
  - RBAC
  - ServiceAccount
variables:
  - name: namespace
    default: loki
---

# Debug son ServiceAccount Kubernetes

Un ServiceAccount ? Kezako, encore une notion bizarre de Kube, mais super utile pour donner des droits spécifique à un Pod

Un ServiceAccount sur Kubernetes est une resource d'API qui représente une identité pour les applications s'exécutant dans un cluster Kubernetes. Il est utilisé pour permettre aux pods ou aux autres ressources d'accéder aux ressources du cluster Kubernetes de manière sécurisée. Un ServiceAccount est associé à un ensemble de permissions définies par des rôles ou des rôles liés, ce qui détermine les actions que l'entité peut effectuer dans le cluster. Cela permet de contrôler et de limiter les privilèges des applications, améliorant ainsi la sécurité du système.

Tout cela est bien beau, mais quand notre Pod ne fonctionne pas et qu'on soupconne le ServiceAcccount, comment qu'on fait ? :)

C'est simple, en lancant un pod qui utilise ce ServiceAccount et qui exécute une action sur la ressource associée.

Exemple simple, j'ai un ServiceAccount qui a pour but de donner l'accès à un bucket S3. Voici à quoi ressemble mon ServiceAccount :

```bash
k get serviceaccounts loki -n <namespace> -o yaml
```

```yaml
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AccessToS3Loki
    meta.helm.sh/release-name: loki
    meta.helm.sh/release-namespace: <namespace>
  creationTimestamp: "2023-05-15T14:15:20Z"
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: loki
    app.kubernetes.io/version: 2.8.2
    helm.sh/chart: loki-5.5.0
  name: loki
  namespace: <namespace>
  resourceVersion: "103524415"
  uid: dd3baab0-7d90-4cf7-aead-76abbe9f77f0
```

Pas de champ `secrets:` sur un cluster récent : depuis Kubernetes 1.24, plus aucun Secret de token n'est créé automatiquement pour un ServiceAccount, le token est projeté dans le Pod avec une durée de vie limitée.

On observe que notre bucket S3 reste vide alors que nos pod tournent, on peut donc (légitimiement) soupconner le role d'être mauvais, ou que le ServiceAccount soit défaillant d'une manière ou d'une autre.

On va donc lancer la CLI aws dans un Pod en utilisant ce ServiceAccount. Le Pod doit tourner dans le même namespace que le ServiceAccount, sinon il ne le trouve pas :

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: my-pod
  name: my-pod
  namespace: <namespace>
spec:
  serviceAccountName: loki
  initContainers:
  - image: amazon/aws-cli
    name: my-aws-cli
    command: ['aws', 's3', 'ls', 's3://loki/']
  containers:
  - image: nginx
    name: my-pod
    ports:
    - containerPort: 80
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
```

Et on observe les logs de notre Pod

```bash
➜  ~ stern my-pod
+ my-pod › my-aws-cli
my-pod my-aws-cli
my-pod my-aws-cli An error occurred (AccessDenied) when calling the ListObjectsV2 operation: Access Denied
```

Bingo, notre pod a un problème pour accéder au Bucket :) On est ici côté IAM AWS, pas côté RBAC Kubernetes : la cause peut être la policy du rôle, sa trust policy (le `sub` doit correspondre à `system:serviceaccount:<namespace>:loki`), l'annotation du ServiceAccount ou la bucket policy.

Pour savoir quel rôle le Pod assume vraiment, un Pod jetable suffit :

```bash
kubectl run aws-debug -n <namespace> --rm -it --restart=Never \
  --image=amazon/aws-cli \
  --overrides='{"spec":{"serviceAccountName":"loki"}}' \
  -- sts get-caller-identity
```

Si l'`Arn` renvoyé n'est pas le rôle `AccessToS3Loki`, c'est le lien IRSA qui est cassé (annotation, OIDC provider ou trust policy), pas la policy.

Quand le doute porte sur le RBAC Kubernetes, pas besoin de Pod :

```bash
kubectl auth can-i list pods -n <namespace> --as=system:serviceaccount:<namespace>:loki
```

Par ailleurs, la bonne pratique est de ne pas utiliser le ServiceAccount par défaut, voici une petite commande pour être sur qu'aucun Pod ne tourne avec :

```bash
kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.serviceAccountName == "default")]}{.metadata.namespace} {.metadata.name}{"\n"}{end}' 2>/dev/null
```

## Voir aussi

- [Créer son service account ArgoCD](../argocd/argocd_sa.md) - le cas d'un SA à usage programmatique
- [GKE Workload Identity](../../cloud/gcloud/workload_identity.md) - quand le problème est le lien entre le SA Kubernetes et le SA GCP
- [Alloy](../../monitoring/lgtm/alloy.md) - un exemple de RBAC à donner à un agent qui scrape tout le cluster
- [Kubernetes : Commandes Avancées](../cli/advanced_commands.md) - les requêtes jsonpath pour fouiller les SA
