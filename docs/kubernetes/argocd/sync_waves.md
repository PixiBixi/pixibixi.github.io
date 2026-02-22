---
description: Contrôler l'ordre de déploiement avec les sync waves et les hooks ArgoCD — PreSync, PostSync, SyncFail et gestion des dépendances.
tags:
  - ArgoCD
  - GitOps
---

# ArgoCD : Sync Waves & Hooks

Par défaut ArgoCD applique tout en parallèle. En pratique ça pose problème : un Deployment
qui démarre avant sa ConfigMap, une migration qui tourne pendant que l'appli reçoit du trafic...

2 solutions s'offrent ici à nous : on attend le retry d'ArgoCD où on gère ça proprement avec les _waves_ et les _hooks_.

## Sync Waves

ArgoCD applique wave par wave en ordre croissant, et attend que tout soit `Healthy` avant de passer à la suivante.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "5"
```

Wave par défaut : `0`. Les waves négatives passent avant les ressources sans annotation.

### Exemple : postgres avant le backend

![Exemple de sync waves : Namespace → ConfigMap/Secret → StatefulSet postgres → Job migration → Deployment backend → Ingress](./_img/sync_waves.svg)

```yaml
# namespace.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# postgres-statefulset.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
---
# migration-job.yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: my-app:1.2.3
          command: ["./migrate", "--run"]
```

!!! danger "Blocage total du sync"
    Pour passer à la wave suivante, toutes les ressources de la wave courante doivent être
    `Healthy`. Si un StatefulSet reste en `Progressing`, tout le déploiement est gelé —
    l'app ne se met plus à jour jusqu'à intervention manuelle.

!!! warning "À utiliser avec parcimonie"
    Dans beaucoup de cas, les sync waves ne sont pas la bonne solution. Elles introduisent
    une dépendance d'ordre rigide difficile à maintenir, et un seul composant unhealthy bloque
    tous les autres. Préférer les hooks (`PreSync`) pour les cas simples comme une migration DB,
    et réserver les waves aux topologies vraiment complexes avec des dépendances fortes.

## Hooks

Des ressources (souvent des Jobs) qu'on branche sur des moments clés du sync, indépendamment
des waves.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

### Types de hooks

| Hook | Quand |
|------|-------|
| `PreSync` | Avant le début du sync |
| `Sync` | Pendant le sync (wave 0) |
| `PostSync` | Après que tout soit `Healthy` |
| `SyncFail` | Si le sync échoue |
| `Skip` | Jamais appliqué |

### Politiques de suppression

| Politique | Comportement |
|-----------|-------------|
| `HookSucceeded` | Supprime si le hook réussit |
| `HookFailed` | Supprime si le hook échoue |
| `BeforeHookCreation` | Supprime l'ancienne instance avant re-création |

On combine généralement `HookSucceeded` + `BeforeHookCreation` pour les Jobs de migration.

### Migration DB en PreSync

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: my-app:{{ .Values.image.tag }}
          command: ["python", "manage.py", "migrate", "--noinput"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: database-url
```

### Smoke test en PostSync

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 2
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: smoke
          image: curlimages/curl:latest
          command:
            - sh
            - -c
            - curl -f http://my-app.my-app.svc.cluster.local/health || exit 1
```

### Alerte en SyncFail

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: notify-failure
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: HookFailed
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - sh
            - -c
            - |
              curl -X POST "$SLACK_WEBHOOK" \
                -H 'Content-type: application/json' \
                --data '{"text":"Sync failed on my-app!"}'
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-secrets
                  key: webhook-url
```

## Dans quel ordre ça se passe

Les hooks ignorent les waves. L'ordre c'est toujours : PreSync → waves (de -N à +N) → PostSync.
Un `PreSync` s'exécute donc toujours avant la wave `-1`.

## Debug

```bash
# État des hooks du dernier sync
argocd app get my-app --show-operation

# Logs d'un Job hook
kubectl get jobs -n my-app
kubectl logs -n my-app job/db-migrate
```
