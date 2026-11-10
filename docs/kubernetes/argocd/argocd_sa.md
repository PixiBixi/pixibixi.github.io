---
description: Créer et configurer un service account ArgoCD avec droits d'accès API via des politiques RBAC
tags:
  - ArgoCD
  - Kubernetes
---

# Créer son service account ArgoCD

Un SA est toujours utile si on souhaite taper l'API pour une raison quelconque.

Dans notre cas, ArgoCD est déployé via le Helm chart. On commence par définir le SA dans le `values.yaml` :

```yaml
argo-cd:
  configs:
    cm:
      accounts.mysuperSA: apiKey

    rbac:
      policy.csv: |
        p, mysuperSA, applications, get, */*, allow
```

Ici on définit un compte `mysuperSA` avec l'autorisation `get` sur toutes les applications de tous les projets ArgoCD : pour `applications`, l'objet est `<projet>/<app>` (`<projet>/<namespace>/<app>` avec les applications in any namespace), et `*` matche aussi les `/`, donc `*/*` couvre les deux formats.

La syntaxe des politiques ArgoCD : `p, <role/user/group>, <resource>, <action>, <object>, <effect>` - voir la [documentation RBAC ArgoCD](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/).

On vérifie que le compte existe :

```bash
argocd account list
NAME                 ENABLED  CAPABILITIES
mysuperSA            true     apiKey
```

On génère le token associé. Par défaut il n'expire jamais, on lui donne plutôt une durée de vie avec `--expires-in` (unités `s`, `m`, `h`, `d`) :

```bash
argocd account generate-token --account mysuperSA --expires-in 30d
```

## Voir aussi

- [ApplicationSet](applicationset.md) - déployer la même app sur plusieurs clusters
- [Sync Options](sync_options.md) - contrôler le comportement lors du déploiement
