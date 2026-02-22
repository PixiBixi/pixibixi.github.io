---
description: Générer automatiquement plusieurs ArgoCD Applications depuis une seule ressource ApplicationSet — générateurs list, git, cluster et matrix.
tags:
  - ArgoCD
  - GitOps
---

# ArgoCD ApplicationSet

Déployer la même appli sur N clusters en maintenant N manifests `Application` quasiment identiques est totalement inmaintenable at scale.

L'ApplicationSet règle ça : un seul manifest pour les générer tous.

## Structure de base

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-appset
  namespace: argocd
spec:
  generators:        # source des paramètres
    - list:
        elements:
          - cluster: staging
            url: https://k8s-staging.example.com
  template:          # template de l'Application générée
    metadata:
      name: 'my-app-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/repo.git
        targetRevision: HEAD
        path: 'apps/my-app/{{cluster}}'
      destination:
        server: '{{url}}'
        namespace: my-app
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Générateurs

### List

Une liste statique de valeurs, le plus simple.

```yaml
generators:
  - list:
      elements:
        - env: staging
          cluster: https://k8s-staging.example.com
          replicas: "2"
        - env: production
          cluster: https://k8s-prod.example.com
          replicas: "5"
```

### Git — Répertoires

Une Application par répertoire qui matche le pattern. Utile pour le pattern App of Apps.

```yaml
generators:
  - git:
      repoURL: https://github.com/org/gitops-repo.git
      revision: HEAD
      directories:
        - path: apps/*
        - path: apps/legacy
          exclude: true
```

### Git — Fichiers

Une Application par fichier JSON/YAML qui matche. Pratique pour des configs par environnement.

```yaml
generators:
  - git:
      repoURL: https://github.com/org/gitops-repo.git
      revision: HEAD
      files:
        - path: "envs/**/config.json"
```

Avec un `config.json` du genre :

```json
{
  "env": "staging",
  "cluster": "https://k8s-staging.example.com",
  "namespace": "my-app"
}
```

### Cluster

Une Application pour chaque cluster enregistré dans ArgoCD. Le cluster local est inclus,
ajoute un `selector` si tu ne veux pas le cibler.

```yaml
generators:
  - clusters:
      selector:
        matchLabels:
          env: production
```

### Matrix

Combine deux générateurs — 3 clusters × 4 apps = 12 Applications générées.

```yaml
generators:
  - matrix:
      generators:
        - clusters:
            selector:
              matchLabels:
                env: production
        - git:
            repoURL: https://github.com/org/repo.git
            revision: HEAD
            directories:
              - path: apps/*
```

## Variables utiles dans le template

| Variable | Description |
|----------|-------------|
| `{{name}}` | Nom du cluster |
| `{{server}}` | URL du cluster |
| `{{metadata.labels.env}}` | Label du cluster |
| `{{path}}` | Chemin Git matché |
| `{{path.basename}}` | Dernier segment du chemin |

## Politique de suppression

Par défaut, supprimer un ApplicationSet supprime aussi toutes les Applications générées.
Sur de la prod, on ajoute ça :

```yaml
spec:
  syncPolicy:
    preserveResourcesOnDeletion: true
```

Sans ça, un `kubectl delete applicationset` en prod c'est un incident.

## Pattern App of Apps

Structure de repo :

```text
gitops-repo/
├── apps/
│   ├── nginx/
│   │   ├── staging/values.yaml
│   │   └── production/values.yaml
│   └── redis/
│       ├── staging/values.yaml
│       └── production/values.yaml
└── appsets/
    └── all-apps.yaml
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-apps
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - git:
              repoURL: https://github.com/org/gitops-repo.git
              revision: HEAD
              directories:
                - path: apps/*/*
          - list:
              elements:
                - cluster: staging
                  url: https://k8s-staging.example.com
                - cluster: production
                  url: https://k8s-prod.example.com
  template:
    metadata:
      name: '{{path[1]}}-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/gitops-repo.git
        targetRevision: HEAD
        path: '{{path}}'
        helm:
          valueFiles:
            - 'values.yaml'
      destination:
        server: '{{url}}'
        namespace: '{{path[1]}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Commandes utiles

```bash
# Lister les ApplicationSets
kubectl get applicationset -n argocd

# Voir les Applications générées
kubectl get applications -n argocd -l app.kubernetes.io/managed-by=applicationset-controller

# Forcer le refresh
kubectl annotate applicationset my-appset -n argocd \
  argocd.argoproj.io/refresh=normal --overwrite
```
