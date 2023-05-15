# Debug son ServiceAccount Kubernetes

Un ServiceAccount ? Kezako, encore une notion bizarre de Kube, mais super utile pour donner des droits spécifique à un Pod

Un ServiceAccount sur Kubernetes est une resource d'API qui représente une identité pour les applications s'exécutant dans un cluster Kubernetes. Il est utilisé pour permettre aux pods ou aux autres ressources d'accéder aux ressources du cluster Kubernetes de manière sécurisée. Un ServiceAccount est associé à un ensemble de permissions définies par des rôles ou des rôles liés, ce qui détermine les actions que l'entité peut effectuer dans le cluster. Cela permet de contrôler et de limiter les privilèges des applications, améliorant ainsi la sécurité du système.

Tout cela est bien beau, mais quand notre Pod ne fonctionne pas et qu'on soupconne le ServiceAcccount, comment qu'on fait ? :)

C'est simple, en lancant un pod qui utilise ce ServiceAccount et qui exécute une action sur la ressource associée.

Exemple simple, j'ai un ServiceAccount qui a pour but de donner l'accès à un bucket S3. Voici à quoi ressemble mon ServiceAccount :

```yaml
➜  ~  k get serviceaccounts loki -o yaml
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam:::role/AccessToS3Loki
    meta.helm.sh/release-name: loki
    meta.helm.sh/release-namespace: namespace
  creationTimestamp: "2023-05-15T14:15:20Z"
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: loki
    app.kubernetes.io/version: 2.8.2
    helm.sh/chart: loki-5.5.0
  name: loki
  namespace: namespace
  resourceVersion: "103524415"
  uid: dd3baab0-7d90-4cf7-aead-76abbe9f77f0
secrets:
- name: loki-x
```

On observe que notre bucket S3 reste vide alors que nos pod tournent, on peut donc (légitimiement) soupconner le role d'être mauvais, ou que le ServiceAccount soit défaillant d'une manière ou d'une autre.

On va donc lancer la CLI aws dans un Pod en utilisant ce ServiceAccount

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: my-pod
  name: my-pod
  namespace:  default
spec:
  serviceAccountName: default
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

```
➜  ~ stern my-pod
+ my-pod › my-aws-cli
my-pod my-aws-cli
my-pod my-aws-cli An error occurred (AccessDenied) when calling the ListObjectsV2 operation: Access Denied
```

Bingo, notre pod a un problème pour accéder au Bucket, probablement la politique à modifier :)
