---
description: Les sync options ArgoCD — CreateNamespace, ServerSideApply, Replace, PruneLast, Force, Delete=confirm et les autres gotchas de prod.
tags:
  - ArgoCD
  - GitOps
---

# ArgoCD : Sync Options

Les sync options, c'est ce qu'on découvre après s'être pris un comportement bizarre en prod.
Elles se posent à deux endroits : dans `syncPolicy.syncOptions` de l'Application, ou en annotation sur une ressource spécifique.

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

SSA résout les conflits de field managers — chaque outil "possède" ses champs, ArgoCD ne touche que les siens.

Pour désactiver SSA sur une ressource spécifique quand c'est activé au niveau de l'Application :

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=false
```

!!! warning "Migration client → server side apply"
    Migrer une ressource déjà gérée en client-side apply vers SSA peut déclencher des conflits.
    Forcer avec `--server-side --force-conflicts` lors du premier sync manuel. La migration des
    managed fields est automatique (`ClientSideApplyMigration=true` par défaut) — désactivable
    avec `ClientSideApplyMigration=false` si ça cause des problèmes.

---

## Replace

Remplace la ressource entière au lieu de la patcher (`kubectl replace`). Utile pour les ressources
qui refusent les patches, ou quand un champ immuable a changé.

```yaml
# En annotation sur la ressource, pas au niveau Application
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Replace=true
```

!!! warning
    À éviter en global sur l'Application — un `Replace` sur un Service supprime et recrée l'objet, ce qui change le ClusterIP et casse les connexions en cours.

Si `Replace=true` et `ServerSideApply=true` sont tous les deux définis, `Replace` a la priorité.

---

## Force

Supprime et recrée la ressource à chaque sync.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Replace=true,Force=true
```

!!! danger
    **Destructif** — interruption de service garantie sur les Deployments. Réserver aux Jobs uniquement.

---

## PruneLast

Par défaut, ArgoCD prune les ressources obsolètes pendant le sync, en parallèle des
créations/mises à jour. Avec `PruneLast`, la suppression se fait après la dernière [sync wave](sync_waves.md),
une fois que tout le reste est `Healthy`.

```yaml
syncOptions:
  - PruneLast=true
```

Cas concret : migration d'un Deployment vers un StatefulSet pour le même composant. Sans
`PruneLast`, ArgoCD peut supprimer le Deployment avant que le StatefulSet soit prêt.

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

Même chose que `Prune=false`, mais ArgoCD peut procéder au prune après confirmation manuelle.
Utile pour protéger les namespaces ou PVCs critiques contre un prune accidentel.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=confirm
```

Confirmer via annotation (ou via l'UI/CLI) :

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=confirm
    argocd.argoproj.io/deletion-approved: "2024-12-01T10:00:00Z"
```

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

Typique sur les PVCs — évite de perdre des données si quelqu'un supprime l'Application par erreur.

---

## ApplyOutOfSyncOnly

N'applique que les ressources qui ont divergé du state désiré. Accélère les syncs sur des
Applications avec beaucoup de ressources stables.

```yaml
syncOptions:
  - ApplyOutOfSyncOnly=true
```

!!! warning
    À utiliser avec précaution : si une ressource est `Synced` dans ArgoCD mais corrompue en dehors (quelqu'un a édité à la main), elle ne sera pas recorrigée avant le prochain diff complet.

---

## SkipDryRunOnMissingResource

ArgoCD fait un dry-run avant d'appliquer. Si le CRD d'une ressource n'existe pas encore
(parce qu'il est installé dans la même Application, wave 0), le dry-run échoue.

```yaml
syncOptions:
  - SkipDryRunOnMissingResource=true
```

Typique avec des Helm charts qui installent leurs propres CRDs et les utilisent dans le même
chart. Sans cette option, le premier sync d'une app comme Cert-Manager ou Prometheus Operator
échoue systématiquement.

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

Utile pour cohabiter avec un HPA — ArgoCD ignore le champ `replicas` géré par le HPA et
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
Évite les conflits silencieux entre deux Apps qui appliquent le même objet.

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

- [Sync Waves & Hooks](sync_waves.md) — contrôler l'ordre de déploiement avec les waves
- [ApplicationSet](applicationset.md) — déployer automatiquement sur plusieurs clusters
