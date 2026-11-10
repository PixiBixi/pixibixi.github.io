---
description: Valider les ressources Kubernetes avec des policies CEL natives, sans webhook ni outil tiers.
tags:
  - Security
  - Admission Control
  - CEL
---

# ValidatingAdmissionPolicy : admission control sans webhook

Par défaut Kubernetes n'empêche rien : un pod sans limits, un container `privileged`,
un Service NodePort exposé sur tous les nœuds... Avant v1.30 on réglait ça avec [Kyverno](https://kyverno.io/),
OPA Gatekeeper ou un webhook maison - tous avec leur lot d'infra à opérer.

Depuis v1.30 c'est natif avec **ValidatingAdmissionPolicy** et du CEL. Le pendant pour modifier les objets, **MutatingAdmissionPolicy**, est GA et activé par défaut depuis v1.36.

!!! warning "Les exemples de cet article sont des points de départ"
    Toutes les règles présentées ici sont à adapter au workload. Bloquer les NodePorts peut casser un ingress controller déployé en `hostPort`. Forcer les limits sur tous les pods peut bloquer des DaemonSets système. Passer systématiquement par la phase `Audit` pour mesurer l'impact avant d'activer `Deny`.

2 ressources à connaître :

- `ValidatingAdmissionPolicy` - la règle (quoi vérifier, comment)
- `ValidatingAdmissionPolicyBinding` - le binding (où l'appliquer, comment réagir)

## Structure de base

La policy porte l'expression CEL, le binding dit où elle s'applique et comment elle réagit :

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-resource-limits
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups:   [""]
        apiVersions: ["v1"]
        operations:  ["CREATE", "UPDATE"]
        resources:   ["pods"]
  validations:
    - expression: >
        object.spec.containers.all(c,
          has(c.resources) &&
          has(c.resources.limits) &&
          has(c.resources.limits.cpu) &&
          has(c.resources.limits.memory)
        )
      message: "Tous les containers doivent avoir des limits CPU et mémoire."
```

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-resource-limits-binding
spec:
  policyName: require-resource-limits
  validationActions: [Deny]
```

Le binding sans `matchResources` s'applique à tous les namespaces. Pour le scoper :

```yaml
spec:
  matchResources:
    namespaceSelector:
      matchLabels:
        env: production
```

## Variables CEL disponibles

| Variable | Description |
| --- | --- |
| `object` | La ressource en cours de création/modification |
| `oldObject` | L'ancienne version de la ressource (UPDATE uniquement) |
| `request` | L'AdmissionRequest - contient `request.userInfo`, `request.operation`… |
| `params` | La ressource de paramètres liée via `paramRef` (si configurée) |

## Exemples pratiques

### Bloquer les containers `privileged`

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: no-privileged-containers
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods", "pods/ephemeralcontainers"]
  validations:
    - expression: >
        object.spec.containers.all(c,
          !has(c.securityContext) ||
          !has(c.securityContext.privileged) ||
          c.securityContext.privileged == false
        )
      message: "Les containers privileged sont interdits."
    - expression: >
        !has(object.spec.initContainers) ||
        object.spec.initContainers.all(c,
          !has(c.securityContext) ||
          !has(c.securityContext.privileged) ||
          c.securityContext.privileged == false
        )
      message: "Les initContainers privileged sont interdits."
    - expression: >
        !has(object.spec.ephemeralContainers) ||
        object.spec.ephemeralContainers.all(c,
          !has(c.securityContext) ||
          !has(c.securityContext.privileged) ||
          c.securityContext.privileged == false
        )
      message: "Les ephemeralContainers privileged sont interdits."
```

`object.spec.containers` ne couvre que les containers principaux : un pod privileged passe sans problème par un `initContainer`, ou par un ephemeral container ajouté avec `kubectl debug` (sous-ressource `pods/ephemeralcontainers`, d'où la 2e entrée dans `resources`). Chaque liste a donc sa propre expression. Le même trou existe pour les limits et les registries : toute règle sur les containers d'un pod doit aussi regarder `initContainers`.

### Bloquer les Services NodePort

Un NodePort ouvre un port sur chaque nœud du cluster - c'est une faille potentielle. En général on veut un LoadBalancer ou un Ingress devant. Attention, un Service `LoadBalancer` alloue lui aussi des nodePorts par défaut : pour fermer vraiment les ports nœuds, il faut aussi `allocateLoadBalancerNodePorts: false` (si le load balancer du cluster n'en dépend pas).

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: no-nodeport-services
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups:   [""]
        apiVersions: ["v1"]
        operations:  ["CREATE", "UPDATE"]
        resources:   ["services"]
  validations:
    - expression: "object.spec.type != 'NodePort'"
      message: "Les Services de type NodePort sont interdits."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: no-nodeport-services-binding
spec:
  policyName: no-nodeport-services
  validationActions: [Deny]
```

Test :

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: test-nodeport
spec:
  type: NodePort
  ports:
    - port: 80
EOF
# The services "test-nodeport" is invalid:
# ValidatingAdmissionPolicy 'no-nodeport-services' with binding 'no-nodeport-services-binding'
# denied request: Les Services de type NodePort sont interdits.
```

### Limiter aux registries autorisés (avec params)

On passe la liste des registries via une ConfigMap - ça évite de modifier la policy pour changer la liste.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: allowed-registries
spec:
  failurePolicy: Fail
  paramKind:
    apiVersion: v1
    kind: ConfigMap
  matchConstraints:
    resourceRules:
      - apiGroups:   [""]
        apiVersions: ["v1"]
        operations:  ["CREATE", "UPDATE"]
        resources:   ["pods"]
  validations:
    - expression: >
        object.spec.containers.all(c,
          params.data.registries.split(",").exists(r,
            c.image.startsWith(r)
          )
        )
      messageExpression: >
        "Image interdite. Registries autorisés : " + params.data.registries
    - expression: >
        !has(object.spec.initContainers) ||
        object.spec.initContainers.all(c,
          params.data.registries.split(",").exists(r,
            c.image.startsWith(r)
          )
        )
      messageExpression: >
        "Image d'initContainer interdite. Registries autorisés : " + params.data.registries
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: allowed-registries-params
  namespace: default
data:
  registries: "registry.company.com,ghcr.io/my-org"
```

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: allowed-registries-binding
spec:
  policyName: allowed-registries
  validationActions: [Deny]
  paramRef:
    name: allowed-registries-params
    namespace: default
    parameterNotFoundAction: Deny
```

### Labels obligatoires en production

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-team-label
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups:   ["apps"]
        apiVersions: ["v1"]
        operations:  ["CREATE", "UPDATE"]
        resources:   ["deployments"]
  validations:
    - expression: >
        has(object.metadata.labels) &&
        has(object.metadata.labels.team)
      message: "Le label 'team' est obligatoire sur les Deployments."
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-team-label-binding
spec:
  policyName: require-team-label
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        env: production
```

### Cohérence limits/requests

```yaml
validations:
  - expression: >
      object.spec.containers.all(c,
        !has(c.resources.limits) ||
        !has(c.resources.requests) ||
        !has(c.resources.limits.memory) ||
        !has(c.resources.requests.memory) ||
        quantity(c.resources.limits.memory) <= quantity(c.resources.requests.memory) * 2
      )
    message: "La memory limit ne peut pas dépasser 2x la memory request."
```

## auditAnnotations : savoir ce qui pose problème

En mode `Audit`, l'annotation `validation_failure` donne la policy, le binding et le message, mais pas le détail calculé (quels containers posent problème). `auditAnnotations` permet de logger ces données précises dans les audit logs du kube-apiserver via une expression CEL. Elles sont publiées quels que soient les `validationActions` du binding, y compris quand la validation passe : ce n'est pas elles qui décident de bloquer ou non, c'est le binding.

Utile pendant la phase de rollout : avant de passer en `Deny`, on sait exactement quels workloads ont un problème et pourquoi.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-resource-requests
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups:   [""]
        apiVersions: ["v1"]
        operations:  ["CREATE", "UPDATE"]
        resources:   ["pods"]
  validations:
    - expression: >
        object.spec.containers.all(c,
          has(c.resources) &&
          has(c.resources.requests) &&
          has(c.resources.requests.cpu) &&
          has(c.resources.requests.memory)
        )
      message: "Tous les containers doivent avoir des requests CPU et mémoire."
  auditAnnotations:
    - key: containers-without-requests
      valueExpression: >
        object.spec.containers
          .filter(c,
            !has(c.resources) ||
            !has(c.resources.requests) ||
            !has(c.resources.requests.cpu) ||
            !has(c.resources.requests.memory)
          )
          .map(c, c.name)
          .join(", ")
```

Dans les audit logs :

```json
{
  "annotations": {
    "require-resource-requests/containers-without-requests": "app, envoy"
  }
}
```

Sans `requests`, le scheduler place le pod à l'aveugle - c'est le cas le plus dangereux, bien plus que l'absence de `limits`.

## Exclure des namespaces système

`matchConditions` filtre les requêtes avant évaluation - utile pour exclure `kube-system`, `kube-public` ou les namespaces d'opérateurs :

```yaml
spec:
  matchConditions:
    - name: exclude-system-namespaces
      expression: >
        !['kube-system', 'kube-public', 'cert-manager'].exists(
          ns, namespaceObject.metadata.name == ns
        )
```

## Workflow de déploiement : Audit → Warn → Deny

Ne jamais passer directement en `Deny` en production. Les 3 étapes :

<div class="steps" markdown>

### Audit

Log les violations sans bloquer.

```yaml
validationActions: [Audit]
```

Les violations apparaissent dans les audit logs du kube-apiserver sous l'annotation `validation.policy.admission.k8s.io/validation_failure`.

### Warn

Retourne un warning HTTP au client, visible dans `kubectl`.

```yaml
validationActions: [Warn, Audit]
```

Le warning n'arrive qu'au client qui crée l'objet ciblé par la policy. Avec une policy sur les `pods`, un `kubectl apply` de Deployment ne montre rien : les pods sont créés par le controller ReplicaSet, qui reçoit le warning à notre place. Pour le voir, on applique un Pod directement :

```text
Warning: Validation failed for ValidatingAdmissionPolicy 'require-resource-limits' with binding 'require-resource-limits-binding': Tous les containers doivent avoir des limits CPU et mémoire.
pod/my-app created
```

### Deny

Bloque effectivement la requête.

```yaml
validationActions: [Deny]
```

!!! warning "Deny + Warn sont incompatibles"
    `[Deny, Warn]` est invalide. On combine `[Warn, Audit]` ou `[Deny]` seul.

</div>

## `failurePolicy` : Fail vs Ignore

`failurePolicy` contrôle ce qui se passe si la policy elle-même plante (erreur d'évaluation CEL, param introuvable...) :

- `Fail` (défaut) - l'erreur est traitée comme une violation, selon les `validationActions` du binding : elle ne bloque la requête que si le binding contient `Deny`, sinon elle est seulement auditée ou remontée en warning
- `Ignore` - l'erreur est ignorée, la requête passe, quels que soient les `validationActions`

En général, `Fail` est le bon choix pour du security enforcement. `Ignore` peut servir pendant la phase de test sur des policies expérimentales.

## Voir aussi

- [PDB et topology spread](pdb_topology_spread.md) - refuser à l'admission un budget qui n'autorise aucune éviction
- [Spegel : un OCI registry cache stateless](local_image_cache.md) - le pendant de la policy qui restreint les registries autorisées
- [GOMEMLIMIT/GOMAXPROCS automatiques](gomaxprocs_gomemlimit_kubernetes.md) - ce que les limits imposées par la policy changent côté runtime Go
- [HAProxy : Reverse proxy](../../web/haproxy/overview.md) - load balancer L4/L7 en production, alternative aux Services NodePort
