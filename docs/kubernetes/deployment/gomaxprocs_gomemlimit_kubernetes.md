---
description: GOMAXPROCS et GOMEMLIMIT dans Kubernetes — CFS throttling, resourceFieldRef, uber-go/automaxprocs. Pourquoi Go sature le CPU sans dépasser ses limits, et comment le corriger.
tags:
  - Go
  - Resources
---

# Golang : Définir automatiquement son GOMEMLIMIT/GOMAXPROCS

!!! info "Comportement à partir de Go 1.25"
    Depuis Go 1.25, `GOMAXPROCS` ajuste automatiquement le nombre de threads Go en fonction des limites CPU du conteneur. Plus de détails dans [l'article officiel](https://go.dev/blog/container-aware-gomaxprocs).

Un pod Go tourne sur un node avec 32 cœurs, mais n'a le droit qu'à `limits.cpu: "2"`. Par défaut, Go spawne 32 threads OS — le scheduler Linux throttle les excédentaires via CFS. Résultat : latences P99 qui explosent, CPU usage moyen qui a l'air normal. `GOMAXPROCS` et `GOMEMLIMIT` règlent ça.

- `GOMAXPROCS` — nombre de threads OS que le runtime Go utilise simultanément. Par défaut : nombre de cœurs **du node**, pas du conteneur.
- `GOMEMLIMIT` — taille max de la heap Go. Au-delà, le GC s'emballe pour rester sous le seuil plutôt que de laisser le kernel tuer le pod.

## Pourquoi GOMAXPROCS non calé génère des latences bizarres

Le CFS (Completely Fair Scheduler) de Linux alloue des "périodes CPU" aux conteneurs. Si Go tente de faire tourner 32 threads alors que le pod n'a droit qu'à 2 CPUs, les threads excédentaires attendent — throttlés.

Le piège : cette attente n'est pas visible dans `container_cpu_usage_seconds_total`. Il faut regarder le ratio de throttling :

```promql
rate(container_cpu_cfs_throttled_periods_total{container="mon-app"}[5m])
/ rate(container_cpu_cfs_periods_total{container="mon-app"}[5m])
```

Dès que ce ratio est non nul, le throttling impacte les latences hautes — un P99 ou P999 commence à dériver même à 0.5% de throttling. On règle ça en calant `GOMAXPROCS` sur les limits CPU du conteneur.

## 2 solutions pour injecter les valeurs

### Solution 1 — resourceFieldRef (sans toucher au code)

Kubernetes peut injecter les limites du conteneur comme variables d'environnement au démarrage. Aucune dépendance à ajouter dans le code Go.

Un pod complet avec les deux variables configurées :

```yaml
kind: Namespace
apiVersion: v1
metadata:
  name: demo
---
apiVersion: v1
kind: Pod
metadata:
  name: go-limits
  namespace: demo
spec:
  containers:
    - name: test-container
      image: debian:trixie-slim
      resources:
        limits:
          memory: 128Mi
          cpu: "2"
      env:
        - name: GOMEMLIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.memory
        - name: GOMAXPROCS
          valueFrom:
            resourceFieldRef:
              resource: limits.cpu
      command:
        - sh
        - -c
      args:
        - while true; do echo -en '\n'; printenv GOMEMLIMIT; printenv GOMAXPROCS; sleep 10; done
```

Kubernetes injecte les valeurs de `limits.memory` et `limits.cpu` directement dans les env vars.

!!! warning "Fractions de CPU non supportées"
    `resourceFieldRef` arrondit les fractions à l'entier inférieur. Avec `limits.cpu: "1.5"`, `GOMAXPROCS` est injecté à `1`. Si les pods ont des limits fractionnaires, préférer `automaxprocs`.

### Solution 2 — uber-go/automaxprocs (dans le code)

`automaxprocs` lit les cgroups du conteneur au démarrage et appelle `runtime.GOMAXPROCS()` avec la valeur correcte. Pas de variable d'environnement, pas de config K8S.

Installation :

```bash
go get go.uber.org/automaxprocs
```

Une seule ligne dans `main.go` suffit :

```go
import _ "go.uber.org/automaxprocs"
```

L'import blank déclenche l'`init()` du package. Automaxprocs gère les fractions de CPU, fonctionne hors K8S (Docker, systemd cgroups), et s'adapte si les limits changent entre deux restarts.

Préférer cette approche si les pods ont des limits fractionnaires ou si l'app tourne sur plusieurs environnements.

## GOMEMLIMIT — la bonne valeur

Sans `GOMEMLIMIT`, Go laisse la heap grossir jusqu'à l'OOM kill. Avec une valeur trop proche de `limits.memory`, le GC tourne en boucle pour rester sous le seuil et gaspille du CPU.

La règle : **90% de `limits.memory`**. Les 10% restants couvrent les allocations off-heap (stacks de goroutines, mémoire runtime hors GC).

Avec `resourceFieldRef`, Kubernetes injecte la valeur brute en bytes — pour `128Mi`, `GOMEMLIMIT` sera `134217728`. Go l'accepte directement.

Pour fixer manuellement la marge à 90% :

```yaml
env:
  - name: GOMEMLIMIT
    value: "120795955"  # 128Mi * 0.9
```

## Vérifier que les variables sont bien prises en compte

Depuis kubectl, pour confirmer les valeurs injectées dans le pod :

```bash
kubectl exec -n demo go-limits -- env | grep -E 'GOMAXPROCS|GOMEMLIMIT'
```

Depuis le code Go, pour lire la valeur effective du runtime (sans la modifier) :

```go
fmt.Println(runtime.GOMAXPROCS(0))
```

Avec `automaxprocs`, on peut activer le logging pour tracer la valeur choisie au démarrage :

```go
import "go.uber.org/automaxprocs/maxprocs"

func main() {
    undo, _ := maxprocs.Set(maxprocs.Logger(log.Printf))
    defer undo()
    // ...
}
```

## Interaction avec VPA et HPA

Avec **VPA** : les limits sont recalculées au restart du pod. `resourceFieldRef` et `automaxprocs` relisent les nouvelles valeurs automatiquement.

Avec **HPA** sur des métriques CPU custom : un `GOMAXPROCS` trop élevé crée du throttling CFS, ce qui fait monter le CPU apparent sans que l'app soit réellement saturée. L'HPA interprète ça comme une surcharge et scale inutilement. Corriger `GOMAXPROCS` peut suffire à stabiliser le scaling.

## Ces variables fonctionnent hors Kubernetes

`GOMEMLIMIT` et `GOMAXPROCS` sont des variables d'environnement standard du runtime Go. On peut les injecter via `Dockerfile` (`ENV`), systemd (`Environment=`), ou directement depuis le code (`runtime.GOMAXPROCS(n)`). K8S n'est qu'un vecteur parmi d'autres.
