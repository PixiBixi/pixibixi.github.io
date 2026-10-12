---
description: "GOMAXPROCS et GOMEMLIMIT dans Kubernetes : CFS throttling, GOMAXPROCS natif depuis Go 1.25, GOMEMLIMIT toujours manuel, automemlimit, resourceFieldRef, automaxprocs."
tags:
  - Go
  - Resources
---

# Golang : Définir automatiquement son GOMEMLIMIT/GOMAXPROCS

Un pod Go tourne sur un node avec 32 cœurs, mais n'a le droit qu'à `limits.cpu: "2"`. Avant Go 1.25, le runtime fait tourner du code Go sur 32 threads OS en parallèle et le CFS throttle tout le conteneur dès que le quota est consommé. Résultat : latences P99 qui explosent, CPU usage moyen qui a l'air normal. `GOMAXPROCS` et `GOMEMLIMIT` règlent ça.

- `GOMAXPROCS` - nombre de threads OS qui exécutent du code Go simultanément. Avant Go 1.25 : nombre de cœurs **du node**, pas du conteneur.
- `GOMEMLIMIT` - limite mémoire soft du runtime Go. À l'approche du seuil, le GC tourne plus souvent pour rester dessous plutôt que de laisser le kernel tuer le pod.

Depuis Go 1.25, le CPU est géré par le runtime, la mémoire non :

- **Go 1.25 et plus** : `GOMAXPROCS` est automatique, il reste à poser `GOMEMLIMIT`
- **Go 1.24 et moins** : les 2 sont à faire à la main

## Pourquoi GOMAXPROCS non calé génère des latences bizarres

Le CFS (Completely Fair Scheduler) de Linux alloue des "périodes CPU" aux conteneurs. Si Go fait tourner 32 threads alors que le pod n'a droit qu'à 2 CPUs, le quota de la période est mangé en quelques ms et tous les threads du conteneur attendent la période suivante, throttlés.

Le piège : cette attente n'est pas visible dans `container_cpu_usage_seconds_total`. Il faut regarder le ratio de throttling :

```promql
rate(container_cpu_cfs_throttled_periods_total{container="mon-app"}[5m])
/ rate(container_cpu_cfs_periods_total{container="mon-app"}[5m])
```

Dès que ce ratio est non nul, le throttling impacte les latences hautes - un P99 ou P999 commence à dériver même avec un ratio faible. On règle ça en calant `GOMAXPROCS` sur les limits CPU du conteneur.

## GOMAXPROCS natif depuis Go 1.25

Sur Linux, le runtime lit la limite CPU du cgroup (v1 et v2) au démarrage, plus de détails dans [l'article officiel](https://go.dev/blog/container-aware-gomaxprocs). Le calcul :

- `GOMAXPROCS` = le minimum entre le nombre de CPUs logiques, le nombre de CPUs de l'affinity mask (cpuset, static CPU manager) et la limite CPU du cgroup
- une limite fractionnaire est arrondie au-dessus : `limits.cpu: "1.5"` donne `2`
- plancher à 2 : `limits.cpu: 500m` donne `2`, pas `1`, sauf si la machine ou l'affinity mask n'a qu'un seul CPU
- la valeur est réévaluée au plus une fois par seconde (moins souvent si l'app est idle), un changement de limits en cours de vie du pod est pris en compte sans restart

Quelques pièges :

- **Seules les limits du conteneur comptent.** Les `requests.cpu` sont ignorées, et Go ne lit que le cgroup du conteneur : une limite posée au niveau du pod (`spec.resources`) lui échappe. Un conteneur sans `limits.cpu` retombe sur le nombre de CPUs visibles, comme avant.
- **Le `go.mod` doit dire `go 1.25` ou plus.** Le comportement est porté par les GODEBUG `containermaxprocs` et `updatemaxprocs`, dont la valeur par défaut suit la directive `go` du module principal. Un binaire compilé en 1.27 avec `go 1.24` dans son `go.mod` garde l'ancien comportement.
- **Une env var `GOMAXPROCS` (entier > 0) ou un appel à `runtime.GOMAXPROCS(n)` avec `n > 0` désactive tout**, y compris la mise à jour périodique. Un `resourceFieldRef` hérité d'avant 1.25 fait donc perdre l'ajustement live, on le retire. `runtime.GOMAXPROCS(0)` ne fait que lire la valeur, il ne désactive rien.

Pour ignorer des CPU limits qui existent bien, par exemple pour un pod qu'on laisse volontairement burster, on revient à l'ancien comportement via `GODEBUG` :

```yaml
env:
  - name: GODEBUG
    value: "containermaxprocs=0,updatemaxprocs=0"
```

`automaxprocs` est contre-productif sur ces versions : il appelle `runtime.GOMAXPROCS(n)`, ce qui fige la valeur et coupe la mise à jour live, et il arrondit à l'inférieur (`1.5` donne `1` là où le runtime donne `2`). On retire l'import.

## GOMEMLIMIT : toujours à la main

Même en Go 1.27, le runtime ne lit pas la limite mémoire du cgroup : `GOMEMLIMIT` reste illimité par défaut. La proposal qui l'ajouterait ([golang/go#75164](https://github.com/golang/go/issues/75164)) est toujours ouverte.

Sans `GOMEMLIMIT`, seul `GOGC` pilote le GC : avec `GOGC=100`, la heap peut grimper jusqu'à environ 2x la heap vivante du cycle précédent et dépasser `limits.memory` avant que le GC passe, d'où l'OOM kill. Avec une valeur trop proche de `limits.memory`, le GC tourne de plus en plus souvent pour rester sous le seuil, jusqu'à brûler 50% du CPU (le plafond du GC CPU limiter). Au-delà, le runtime laisse dépasser la limite : l'app ralentit, puis se fait OOM kill quand même.

La règle : **90% de `limits.memory`**. `GOMEMLIMIT` compte déjà tout ce que le runtime Go gère (heap, stacks de goroutines), les 10% restants couvrent ce qu'il ne voit pas : allocations cgo, binaire et fichiers mappés en mémoire.

### Solution 1 - KimMachineGun/automemlimit (dans le code)

C'est l'équivalent d'`automaxprocs` pour la mémoire : il lit la limite du cgroup au démarrage et pose `GOMEMLIMIT` à 90% par défaut.

Installation :

```bash
go get github.com/KimMachineGun/automemlimit@latest
```

Un import blank dans `main.go` suffit :

```go
import _ "github.com/KimMachineGun/automemlimit"
```

Le ratio se change sans recompiler via l'env var `AUTOMEMLIMIT` (`0.8`, ou `off` pour le désactiver). Pour plus de contrôle, `memlimit.Set(memlimit.WithRatio(0.9))` fait la même chose depuis `main()`.

Si l'env var `GOMEMLIMIT` existe, même vide, `automemlimit` ne fait rien et ignore `AUTOMEMLIMIT` : on retire un éventuel `resourceFieldRef` sur `limits.memory` avant d'ajouter l'import.

### Solution 2 - valeur fixe (sans toucher au code)

On calcule la marge à la main et on la pose en env var :

```yaml
env:
  - name: GOMEMLIMIT
    value: "120795955"  # 128Mi * 0.9
```

Go accepte aussi les suffixes (`115MiB`). L'inconvénient : la valeur est à mettre à jour à chaque changement de `limits.memory`.

!!! warning "resourceFieldRef sur limits.memory : zéro marge"
    Injecter `limits.memory` via `resourceFieldRef` donne `GOMEMLIMIT` = 100% de la limite, en bytes (`134217728` pour `128Mi`). Le runtime vise exactement le seuil de l'OOM killer, sans place pour le off-heap. À éviter, ou à réserver aux apps dont la mémoire hors heap est négligeable.

## Go 1.24 et moins : 2 solutions pour GOMAXPROCS

### Solution 1 - resourceFieldRef (sans toucher au code)

Kubernetes peut injecter les limites du conteneur comme variables d'environnement au démarrage. Aucune dépendance à ajouter dans le code Go.

Un pod de démo avec les deux variables injectées :

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

Kubernetes injecte les valeurs de `limits.memory` et `limits.cpu` directement dans les env vars. Pour `GOMEMLIMIT`, c'est la valeur sans marge (voir plus haut), on préfère une valeur fixe à 90% ou `automemlimit`.

Les fractions de CPU sont arrondies à l'entier supérieur : `limits.cpu: "1.5"` donne `GOMAXPROCS=2`, `250m` donne `1`. Sans `limits.cpu` sur le conteneur, Kubernetes injecte les limits du pod, ou à défaut le CPU allocatable du node, ce qui ramène au problème de départ.

### Solution 2 - uber-go/automaxprocs (dans le code)

`automaxprocs` lit les cgroups du conteneur au démarrage et appelle `runtime.GOMAXPROCS()` avec la limite CPU arrondie à l'inférieur, minimum 1 : `limits.cpu: "1.5"` donne `1`, là où `resourceFieldRef` donne `2`. Pas de variable d'environnement, pas de config K8S, et il ne fait rien si l'env var `GOMAXPROCS` existe.

Installation :

```bash
go get go.uber.org/automaxprocs
```

Une seule ligne dans `main.go` suffit :

```go
import _ "go.uber.org/automaxprocs"
```

L'import blank déclenche l'`init()` du package. Automaxprocs fonctionne hors K8S (Docker, systemd cgroups) et relit les limits à chaque démarrage. Préférer cette approche si l'app tourne sur plusieurs environnements.

## Vérifier que les variables sont bien prises en compte

Depuis kubectl, pour confirmer les valeurs injectées dans le pod :

```bash
kubectl exec -n demo go-limits -- env | grep -E 'GOMAXPROCS|GOMEMLIMIT'
```

Depuis le code Go, pour lire les valeurs effectives du runtime (sans les modifier), y compris celles calculées par Go 1.25+ ou `automemlimit` qui n'apparaissent pas dans `env` :

```go
fmt.Println(runtime.GOMAXPROCS(0))
fmt.Println(debug.SetMemoryLimit(-1))
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

Avec **VPA** : en Go 1.25+, une limite CPU modifiée en place est reprise par le runtime en quelques secondes. `GOMEMLIMIT`, `resourceFieldRef` et `automaxprocs` ne relisent les valeurs qu'au restart du pod.

Avec **HPA** sur des métriques CPU custom : un `GOMAXPROCS` trop élevé gonfle le travail parallèle du runtime (le GC vise 25% de `GOMAXPROCS` en workers dédiés, soit 8 sur un `GOMAXPROCS` à 32 pour un quota de 2 CPUs), ce qui fait monter le CPU mesuré jusqu'à la limit sans que l'app traite plus de requêtes. L'HPA interprète ça comme une surcharge et scale inutilement. Corriger `GOMAXPROCS` peut suffire à stabiliser le scaling.

## Ces variables fonctionnent hors Kubernetes

`GOMEMLIMIT` et `GOMAXPROCS` sont des variables d'environnement standard du runtime Go. On peut les injecter via `Dockerfile` (`ENV`), systemd (`Environment=`), ou directement depuis le code (`runtime.GOMAXPROCS(n)`, `debug.SetMemoryLimit(n)`). K8S n'est qu'un vecteur parmi d'autres.

## Voir aussi

- [Thanos at scale](../../monitoring/lgtm/thanos.md) - un cas réel où le `GOMEMLIMIT` de Receive évite l'OOM kill
- [GKE - Capacité réelle des nodes](../../cloud/gcloud/gke_node_capacity.md) - la capacité qui reste vraiment pour poser des limits
- [PDB et topology spread](pdb_topology_spread.md) - ce qui arrive à ces pods pendant un drain
- [CI Go sur GitHub Actions](../../ci-cd/github/go-ci.md) - tester et linter le binaire avant qu'il tourne en cluster
