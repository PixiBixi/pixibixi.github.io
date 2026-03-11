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
OPA Gatekeeper, ou un webhook maison — tous avec leur lot d'infra à opérer.

Depuis v1.30 c'est natif avec **ValidatingAdmissionPolicy** et du CEL.

!!! warning "Les exemples de cet article sont des points de départ"
    Toutes les règles présentées ici sont à adapter à ton workload. Bloquer les NodePorts peut casser un ingress controller déployé en `hostPort`. Forcer les limits sur tous les pods peut bloquer des DaemonSets système. Passe systématiquement par la phase `Audit` pour mesurer l'impact avant d'activer `Deny`.

2 ressources à connaître :

- `ValidatingAdmissionPolicy` — la règle (quoi vérifier, comment)
- `ValidatingAdmissionPolicyBinding` — le binding (où l'appliquer, comment réagir)

## Structure de base

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
| `request` | L'AdmissionRequest — contient `request.userInfo`, `request.operation`… |
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
        resources: ["pods"]
  validations:
    - expression: >
        object.spec.containers.all(c,
          !has(c.securityContext) ||
          !has(c.securityContext.privileged) ||
          c.securityContext.privileged == false
        )
      message: "Les containers privileged sont interdits."
```

### Bloquer les Services NodePort

Un NodePort ouvre un port sur chaque nœud du cluster — c'est une faille potentielle.
Dans 99.9% des cas on veut un LoadBalancer devant.

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
# ValidatingAdmissionPolicy 'no-nodeport-services' denied the request:
# Les Services de type NodePort sont interdits.
```

### Limiter aux registries autorisés (avec params)

On passe la liste des registries via une ConfigMap — ça évite de modifier la policy pour changer la liste.

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

En mode `Audit`, on sait qu'il y a des violations — mais pas lesquelles. `auditAnnotations` permet de logger des données précises dans les audit logs du kube-apiserver via une expression CEL, sans bloquer la requête.

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
"annotations": {
  "require-resource-requests/containers-without-requests": "app, envoy"
}
```

Sans `requests`, le scheduler place le pod à l'aveugle — c'est le cas le plus dangereux, bien plus que l'absence de `limits`.

## Exclure des namespaces système

`matchConditions` filtre les requêtes avant évaluation — utile pour exclure `kube-system`, `kube-public` ou les namespaces d'opérateurs :

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

**1. Audit** — log les violations sans bloquer

```yaml
validationActions: [Audit]
```

Les violations apparaissent dans les audit logs du kube-apiserver sous l'annotation `validation.policy.admission.k8s.io/validation_failure`.

**2. Warn** — retourne un warning HTTP au client, visible dans `kubectl`

```yaml
validationActions: [Warn, Audit]
```

```text
Warning: require-resource-limits: Tous les containers doivent avoir des limits CPU et mémoire.
deployment.apps/my-app created
```

**3. Deny** — bloque effectivement la requête

```yaml
validationActions: [Deny]
```

!!! warning "Deny + Warn sont incompatibles"
    `[Deny, Warn]` est invalide. On combine `[Warn, Audit]` ou `[Deny]` seul.

## `failurePolicy` : Fail vs Ignore

`failurePolicy` contrôle ce qui se passe si la policy elle-même plante (erreur d'évaluation CEL, param introuvable...) :

- `Fail` (défaut) — l'erreur bloque la requête
- `Ignore` — l'erreur est ignorée, la requête passe

En général, `Fail` est le bon choix pour du security enforcement. `Ignore` peut servir pendant la phase de test sur des policies expérimentales.
