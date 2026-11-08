---
description: Les sync options ArgoCD - CreateNamespace, ServerSideApply, Replace, PruneLast, Force, Delete=confirm et les autres gotchas de prod.
tags:
  - ArgoCD
  - GitOps
variables:
  - name: app
    default: my-app
---

# ArgoCD : Sync Options

Les sync options, c'est ce qu'on découvre après s'être pris un comportement bizarre en prod.
Elles se posent à 2 endroits : dans `syncPolicy.syncOptions` de l'Application ou en annotation sur une ressource spécifique.

## Où les mettre

### Au niveau de l'Application

```yaml
spec:
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

### Sur une ressource spécifique

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Replace=true
```

Plusieurs options en une seule annotation, séparées par virgule :

```yaml
argocd.argoproj.io/sync-options: Replace=true,Force=true
```

---

## CreateNamespace

ArgoCD ne crée pas les namespaces par défaut. Sans cette option, le sync échoue si le namespace n'existe pas encore.

```yaml
syncOptions:
  - CreateNamespace=true
```

Pour gérer les labels/annotations du namespace créé :

```yaml
spec:
  syncPolicy:
    managedNamespaceMetadata:
      labels:
        env: production
    syncOptions:
      - CreateNamespace=true
```

---

## ServerSideApply

Par défaut ArgoCD fait un `kubectl apply` côté client. Ça pose problème avec les CRDs volumineuses
(dépassement de l'annotation `kubectl.kubernetes.io/last-applied-configuration` à 256 KB), ou
quand d'autres outils gèrent partiellement la même ressource.

```yaml
syncOptions:
  - ServerSideApply=true
```

Avec SSA, chaque outil « possède » ses champs (field managers) et ArgoCD n'écrase plus ceux qu'il ne déclare pas. Attention par contre : ArgoCD applique en `kubectl apply --server-side --force-conflicts`, donc sur un champ que son manifest déclare et qu'un autre outil possède, c'est lui qui gagne et il en prend la propriété.

Pour désactiver SSA sur une ressource spécifique quand c'est activé au niveau de l'Application :

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=false
```

!!! warning "Migration client → server side apply"
    Une ressource déjà gérée en client-side apply garde ses managed fields au nom de `kubectl-client-side-apply`. Sans migration, un champ retiré du manifest ne serait jamais supprimé. ArgoCD transfère ces managed fields à son propre manager au premier sync SSA (`ClientSideApplyMigration=true` par défaut), rien à forcer à la main. On le désactive avec `ClientSideApplyMigration=false` si ça cause des problèmes, et on change le manager repris avec l'annotation `argocd.argoproj.io/client-side-apply-migration-manager` sur l'Application.

---

## Replace

Remplace la ressource entière au lieu de la patcher (`kubectl replace`). Utile pour les ressources
qui refusent les patches ou quand un champ immuable a changé.

```yaml
# En annotation sur la ressource plutôt qu'au niveau Application
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Replace=true
```

!!! warning
    À éviter en global sur l'Application : `kubectl replace` envoie l'objet entier, donc tout champ absent du manifest (posé par un controller, un webhook ou un autre outil) est effacé. La doc ArgoCD le classe comme potentiellement destructif, certaines ressources pouvant devoir être recréées. Les CRDs et les Namespaces sont épargnés : ArgoCD leur fait un update au lieu d'un replace, un replace pouvant supprimer toutes les instances du CRD ou tout le contenu du namespace.

Si `Replace=true` et `ServerSideApply=true` sont tous les 2 définis, `Replace` a la priorité.

---

## Force

Avec `Replace=true`, supprime et recrée la ressource à chaque sync (`kubectl delete/create`). Seul, `Force=true` n'agit qu'en client-side apply (`kubectl apply --force`, qui ne supprime et recrée que si l'apply échoue, sur un champ immuable par exemple). Avec `ServerSideApply=true` et sans `Replace`, il est ignoré.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Replace=true,Force=true
```

!!! danger
    **Destructif** - interruption de service garantie sur les Deployments. Réserver aux Jobs uniquement.

---

## PruneLast

Par défaut, dans chaque [sync wave](sync_waves.md), ArgoCD prune d'abord les ressources obsolètes et n'applique les créations/mises à jour qu'une fois les suppressions réussies. Avec `PruneLast`, la suppression se fait après la dernière wave du sync, une fois que tout le reste est `Healthy`.

```yaml
syncOptions:
  - PruneLast=true
```

Cas concret : migration d'un Deployment vers un StatefulSet pour le même composant. Sans
`PruneLast` et sans waves, ArgoCD supprime le Deployment avant même d'appliquer le StatefulSet.

Pour un contrôle plus fin de l'ordre de déploiement, voir [Sync Waves & Hooks](sync_waves.md).

---

## Prune=false

Empêche ArgoCD de supprimer une ressource spécifique lors d'un sync, même si elle n'est plus
dans le manifest. L'Application reste en état `OutOfSync` tant que la ressource existe.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
```

---

## Prune=confirm

ArgoCD ne prune la ressource qu'après une confirmation manuelle. Utile pour protéger les namespaces ou PVCs critiques contre un prune accidentel.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=confirm
```

Ce n'est pas un `Prune=false` : le prune n'est pas sauté, il est mis en attente. Le sync reste en `Syncing` tant que personne ne confirme, et rien d'autre de la wave n'est appliqué en attendant. L'option se pose aussi au niveau de l'Application (`syncPolicy.syncOptions`), l'annotation de la ressource gardant la priorité.

On confirme avec le bouton « Confirm Pruning » de l'UI, ou en CLI :

```bash
argocd app confirm-deletion <app>
```

La CLI pose l'annotation `argocd.argoproj.io/deletion-approved` avec l'heure courante **sur l'Application**, pas sur la ressource à pruner. Un horodatage antérieur au début de l'opération ne confirme rien : une valeur copiée d'un vieux manifest ne débloque pas le sync.

---

## Delete=false / Delete=confirm

Contrôle ce qu'il se passe quand l'Application ArgoCD est supprimée (pas un sync, la suppression
de l'Application elle-même).

```yaml
# La ressource survit à la suppression de l'Application
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Delete=false
```

```yaml
# Exige une confirmation manuelle avant suppression
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Delete=confirm
```

Typique sur les PVCs - évite de perdre des données si quelqu'un supprime l'Application par erreur. La confirmation de `Delete=confirm` se fait comme pour `Prune=confirm` (UI ou `argocd app confirm-deletion`), et les 2 options existent aussi au niveau de l'Application.

---

## ApplyOutOfSyncOnly

N'applique que les ressources qui ont divergé du state désiré. Par défaut, chaque sync réapplique tous les objets : sur une Application de plusieurs milliers de ressources, c'est long, ça charge l'API server et ça gonfle `status.operationState.syncResult.resources` dans etcd.

```yaml
syncOptions:
  - ApplyOutOfSyncOnly=true
```

Une ressource éditée à la main passe `OutOfSync` au diff suivant et reste donc réappliquée. Les hooks de sync tournent toujours.

---

## SkipDryRunOnMissingResource

ArgoCD fait un dry-run avant d'appliquer. Si le CRD fait partie du même sync (un Helm chart comme cert-manager qui installe ses CRDs), ArgoCD saute déjà le dry-run tout seul : pas besoin de l'option.

Elle sert quand le CRD est créé hors du sync, par un controller. Exemple : Gatekeeper, qui crée un CRD pour chaque `ConstraintTemplate`. ArgoCD ne trouve pas le CRD et le sync échoue sur `the server could not find the requested resource`. On la pose en annotation sur les ressources concernées, ou pour toute l'Application :

```yaml
syncOptions:
  - SkipDryRunOnMissingResource=true
```

Le dry-run reste exécuté dès que le CRD existe dans le cluster.

---

## RespectIgnoreDifferences

Par défaut, même si un champ est dans `ignoreDifferences`, ArgoCD le remet à la valeur du
manifest au prochain sync. Avec cette option, les champs ignorés ne sont plus touchés lors de
l'apply (ArgoCD pre-patche l'état désiré avant de l'envoyer au cluster).

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
  syncPolicy:
    syncOptions:
      - RespectIgnoreDifferences=true
```

Utile pour cohabiter avec un HPA - ArgoCD ignore le champ `replicas` géré par le HPA et
ne l'écrase plus à chaque sync. Ne fonctionne que si la ressource existe déjà dans le cluster.

---

## PrunePropagationPolicy

Contrôle comment Kubernetes supprime les ressources prunées. 3 modes :

| Policy | Comportement |
| -------- | ------------- |
| `foreground` | Attend la suppression des dépendants avant de supprimer le parent (défaut) |
| `background` | Supprime le parent immédiatement, les dépendants sont GC en arrière-plan |
| `orphan` | Supprime le parent, laisse les dépendants vivants |

```yaml
syncOptions:
  - PrunePropagationPolicy=foreground
```

---

## FailOnSharedResource

Fait échouer le sync si une ressource est déjà gérée par une autre Application ArgoCD.
Évite les conflits silencieux entre 2 Apps qui appliquent le même objet.

```yaml
syncOptions:
  - FailOnSharedResource=true
```

Désactivé par défaut pour la compatibilité, mais à activer sur les infras multi-teams.

---

## Validate=false

Désactive la validation côté `kubectl` (`--validate=false`). Nécessaire pour certains types
Kubernetes utilisant `RawExtension` (ex : ServiceCatalog).

```yaml
syncOptions:
  - Validate=false
```

## Voir aussi

- [Sync Waves & Hooks](sync_waves.md) - contrôler l'ordre de déploiement avec les waves
- [ApplicationSet](applicationset.md) - déployer automatiquement sur plusieurs clusters
