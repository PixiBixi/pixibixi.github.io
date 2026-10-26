---
description: "GitLab Runner executor Kubernetes sur GKE Spot : cold start des nodes, tags pour router les jobs, resources et ephemeral storage des job pods, alertes disque, suivi de migration et cleanup des anciens runners"
tags:
  - Kubernetes
  - GKE
  - Spot
  - FinOps
---

# GitLab Runner sur GKE Spot : cold start, tags, ephemeral storage et migration

Faire tourner les jobs CI sur des nodes Spot coûte nettement moins cher qu'un parc de VMs allumées en permanence, mais le premier job après une période creuse attend qu'un node soit créé. Un job de 10 secondes qui en passe plusieurs dizaines en `Pending` donne l'impression d'une CI cassée, alors que le runner et le cluster font exactement ce qu'on leur a demandé.

Ce qui rend ce setup supportable tient en 4 points :

- absorber le délai de scale from zero
- garder les jobs sensibles hors de Spot avec des tags
- dimensionner les job pods et leur ephemeral storage
- migrer les anciens runners et les nettoyer

## Absorber le cold start du scale from zero

Chaque job crée un pod. Quand aucun node n'a de place, le pod reste `Pending` le temps que l'autoscaler provisionne une VM, que le node rejoigne le cluster et que l'image soit tirée. Le cas vécu : un job de plan Terraform dont l'exécution a pris une dizaine de secondes est resté plusieurs dizaines de secondes en `Pending`, parce que le node avait disparu depuis la dernière vague de jobs. Le même délai frappe les classes on-demand : ce job-là tournait sur l'une d'elles, vidée elle aussi après la dernière vague.

Le runner attend le pod pendant `poll_timeout`, 180 secondes par défaut d'après la [doc du kubernetes executor](https://docs.gitlab.com/runner/executors/kubernetes/). Un node qui arrive en quelques dizaines de secondes passe, mais une file de jobs plus grosse que ce que le cluster peut créer d'un coup finit par dépasser. On monte alors `poll_timeout`, au prix d'un pod réellement bloqué qui attend plus longtemps avant l'échec.

```toml
[[runners]]
  [runners.kubernetes]
    poll_interval = 3
    poll_timeout = 300
```

Pour mesurer le délai sans lire des logs de job, on regarde combien de pods runner sont en `Pending` et pendant combien de temps. Les pods de job vivent dans le namespace du runner (`my-namespace` ici).

```promql
sum(kube_pod_status_phase{namespace="my-namespace", phase="Pending"})
```

Une série qui reste à 0 la journée puis monte à 1 ou 2 pendant 1 minute à chaque première vague est la signature du cold start.

### Retarder la consolidation

Le premier levier est le délai avant qu'un node vide soit supprimé. Sur une ComputeClass GKE, `autoscalingPolicy.consolidationDelayMinutes` fixe ce délai, d'après la [doc des custom compute classes](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-custom-compute-classes) (la page n'indique pas de valeur par défaut). Dans le cas étudié il valait 10 minutes : un node disparaît 10 minutes après le dernier job, donc toute pause plus longue que ça rend le job suivant froid.

```yaml
apiVersion: cloud.google.com/v1
kind: ComputeClass
metadata:
  name: gitlab-runner-small-amd64-spot
spec:
  autoscalingPolicy:
    consolidationDelayMinutes: 30
  priorities:
    - machineFamily: n4
      spot: true
    - machineFamily: n4
      spot: false
```

Passer de 10 à 30 ou 60 minutes tient en une ligne par classe. Les nodes restent chauds entre deux vagues de jobs dans la journée, mais le premier job du matin attend toujours. Chaque minute de plus se paye en node allumé pour rien.

### Garder un node chaud avec les pause pods du runner

Le second levier réserve de la capacité d'avance. Depuis GitLab Runner 18.11, le kubernetes executor le fait seul avec des pause pods : un Deployment de pods `registry.k8s.io/pause:3.10` de priorité -1 (PriorityClass `gitlab-runner-idle-capacity`, créée par le runner) que n'importe quel job pod préempte. La doc annonce 18.10, mais le code n'apparaît que dans le tag `v18.11.0`.

Chaque pause pod reprend `cpu_request`, `memory_request`, `node_selector` et les tolerations du runner, donc il atterrit sur la même ComputeClass que les jobs et réserve la place d'un job. On le règle dans `[runners.kubernetes.autoscaler]` :

```toml title="config.toml"
[[runners]]
  executor = "kubernetes"
  [runners.kubernetes]
    cpu_request = "1"
    memory_request = "2Gi"
    [runners.kubernetes.node_selector]
      "cloud.google.com/compute-class" = "gitlab-runner-small-amd64-spot"
    [runners.kubernetes.autoscaler]
      max_pause_pods = 4
      [[runners.kubernetes.autoscaler.policy]]
        periods = ["* 8-19 * * mon-fri"]
        timezone = "Europe/Paris"
        idle_count = 2
        idle_time = "20m"
```

`periods` prend des expressions cron, la dernière policy active l'emporte et en dehors de toute période le runner retombe sur 0 pause pod. La capacité chaude ne coûte donc rien la nuit et le week-end, ce qu'un balloon fixe ne sait pas faire.

`idle_time` retarde seulement la baisse du nombre de pause pods, la hausse est immédiate. `scale_factor` peut garder `scale_factor × jobs actifs` pods d'avance aux heures de pointe.

Les labels et annotations des job pods ne sont pas recopiés sur les pause pods (`pause_pod_labels` et `pause_pod_annotations` existent pour ça). La PriorityClass est un objet cluster-wide : le runner a besoin d'un `ClusterRole` pour la créer.

### Avant 18.11 : des pods balloon à la main

Sur un runner plus ancien, on monte le même mécanisme à la main. D'après la [doc GKE sur le provisioning de capacité](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/capacity-provisioning), on déploie des pods placeholder de priorité basse qui occupent un node entier. Quand un vrai pod arrive, il évicte un placeholder, qui repasse en `Pending` et fait créer un nouveau node en arrière-plan. La PriorityClass de l'exemple GKE vaut -10 avec `preemptionPolicy: Never`, de sorte que le placeholder ne chasse jamais personne. D'après la doc, un pod de priorité -10 ou plus peut déclencher la création d'un node, alors qu'en dessous le balloon ne ferait pas de scale up.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: runner-balloon
value: -10
preemptionPolicy: Never
globalDefault: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: runner-balloon
  namespace: my-namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: runner-balloon
  template:
    metadata:
      labels:
        app: runner-balloon
    spec:
      priorityClassName: runner-balloon
      nodeSelector:
        cloud.google.com/compute-class: gitlab-runner-small-amd64-spot
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.10
          resources:
            requests:
              cpu: "6"
              memory: 20Gi
```

Les requests du balloon se calculent pour remplir un node, en tenant compte de ce que GKE réserve pour le système. 1 node chaud partout multiplie vite le coût : avec 4 classes sur 3 environnements, ça fait 12 nodes allumés en permanence. Le plus raisonnable est de poser des balloons sur les 1 ou 2 classes les plus utilisées en prod seulement, après avoir mesuré le nombre de jobs par classe. Cette partie reste une piste étudiée et pas un setup mesuré en production, donc le temps d'attente avec et sans balloon est à vérifier avant de généraliser.

!!! warning "Un balloon n'a de sens que sur Spot si on accepte l'éviction"
    Un node Spot gardé chaud peut être évicté comme les autres. Le balloon revient alors en `Pending` le temps qu'un nouveau node soit créé. Il réduit la fréquence des cold starts, il ne la ramène pas à zéro. Les évictions Spot sont détaillées dans [Spot sur GKE](../../cloud/gcloud/spot_nodes.md).

## Router les jobs avec des tags

Tous les jobs ne supportent pas d'être interrompus. Un `terraform apply` tué à mi-chemin laisse un state verrouillé et des ressources à moitié créées. Un déploiement coupé laisse un rollout partiel. Ces jobs vont sur des runners on-demand, le reste sur Spot.

Le routage passe par les tags du runner : un runner ne prend que les jobs dont tous les tags figurent dans sa liste. Avec `run_untagged` à `false` il ignore aussi les jobs sans tag. Sur les runners Spot, un job doit donc choisir explicitement où il tourne, ce qui évite qu'un job de deploy atterrisse sur Spot par oubli.

Avec un runner authentication token (`glrt-`), ces réglages se posent à la création du runner dans l'UI ou par l'API (`POST /user/runners`, scope `create_runner`), pas au `register`. D'après la [doc register](https://docs.gitlab.com/runner/register/), `--tag-list`, `--run-untagged` et `--locked` sont ignorés par le processus d'enregistrement compatible avec l'ancien mode. Pour un runner de groupe, la création ressemble à ceci.

```console
$ curl --fail --request POST "https://gitlab.example.com/api/v4/user/runners" \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    --data "runner_type=group_type" \
    --data "group_id=42" \
    --data "tag_list=small,amd64,spot" \
    --data "run_untagged=false" \
    --data "locked=false"
```

La réponse contient le token `glrt-` du runner, avec lequel on l'enregistre côté pod.

```console
$ gitlab-runner register \
    --non-interactive \
    --executor kubernetes \
    --url https://gitlab.example.com \
    --token "$RUNNER_TOKEN"
```

Côté pipeline, le job demande les tags du pool voulu. Le nom des tags suit la convention du parc, ici taille, architecture et type de capacité.

```yaml
terraform-apply:
  stage: deploy
  tags:
    - small
    - amd64
    - on-demand
  script:
    - terraform apply -auto-approve plan.tfplan

unit-tests:
  stage: test
  tags:
    - small
    - amd64
    - spot
  retry:
    max: 2
    when: runner_system_failure
  script:
    - make test
```

Un job Spot accepte un `retry` sur `runner_system_failure`. Qu'une éviction de node tombe dans cette catégorie dépend de la façon dont le runner constate la perte du pod, ce qui se vérifie en provoquant l'éviction d'un node de test avant de compter dessus.

Depuis 18.11, `pod_disruption_budget = true` dans `[runners.kubernetes]` crée une PodDisruptionBudget `minAvailable: 1` par job pod. Elle protège le job d'un drain ou d'un upgrade de node pool, pas d'une préemption Spot que la doc range dans les disruptions involontaires. En contrepartie, un drain attend la fin des jobs en cours.

## Dimensionner les job pods et l'ephemeral storage

Un job pod est composé du conteneur de build, d'un conteneur helper et éventuellement de services. Chacun a ses requests et ses limits dans `[runners.kubernetes]`, avec les préfixes `helper_` et `service_` pour les deux autres ([doc](https://docs.gitlab.com/runner/executors/kubernetes/)).

```toml
[[runners]]
  [runners.kubernetes]
    cpu_request = "500m"
    cpu_request_overwrite_max_allowed = "4"
    memory_request = "1Gi"
    memory_limit = "2Gi"
    memory_limit_overwrite_max_allowed = "8Gi"
    ephemeral_storage_request = "2Gi"
    ephemeral_storage_limit = "10Gi"
    ephemeral_storage_limit_overwrite_max_allowed = "30Gi"
    helper_ephemeral_storage_limit = "2Gi"
```

Chaque job peut ensuite demander plus via des variables, dans la limite du `*_overwrite_max_allowed` correspondant. Sans ce maximum, la variable est ignorée : le plafond est donc aussi ce qui autorise le job à modifier quoi que ce soit. Une valeur au-dessus du maximum fait échouer le job (`the resource ... is higher than limit allowed`).

```yaml
build-image:
  variables:
    KUBERNETES_CPU_REQUEST: "3"
    KUBERNETES_MEMORY_LIMIT: "6Gi"
    KUBERNETES_EPHEMERAL_STORAGE_LIMIT: "20Gi"
  script:
    - make image
```

Les requests décident du nombre de pods par node, donc du coût. Les limits décident de ce qui se passe quand un job dérape. Pour l'ephemeral storage, un job qui dépasse sa limite voit son pod évicté par le kubelet. Sans limite, un seul job qui remplit le disque du node peut faire évicter ses voisins, qui n'y sont pour rien.

Un node Spot a un boot disk de taille fixe, où les builds écrivent le checkout, le cache, les artifacts et les couches d'image. Les jobs qui construisent des images ou installent beaucoup de dépendances sont ceux qui consomment le plus. Pour les identifier, on compare la limite posée au pic réellement atteint plutôt que de la relever au hasard.

## Alerter sur le stockage

Deux alertes couvrent les deux échecs possibles : le node qui manque de disque et les pods de job évictés pour dépassement.

Les seuils ci-dessous sont des valeurs de départ à recaler sur la taille réelle des boot disks et le profil des jobs. Elles supposent que node-exporter tourne sur les nodes et que kube-state-metrics est scrapé.

```yaml
groups:
  - name: gitlab-runner-storage
    rules:
      - alert: RunnerNodeDiskFilling
        expr: |
          (
            node_filesystem_avail_bytes{mountpoint="/", fstype!="tmpfs"}
              / node_filesystem_size_bytes{mountpoint="/", fstype!="tmpfs"}
          ) < 0.15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Runner node {{ $labels.instance }} has less than 15% disk left"
      - alert: RunnerPodsEvicted
        expr: |
          sum(kube_pod_status_reason{namespace="my-namespace", reason="Evicted"}) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Runner job pods are being evicted, likely ephemeral storage"
```

Le runner supprime les pods de job à la fin du job. `cleanup_resources_timeout` (5 minutes par défaut) borne le temps laissé à ce nettoyage. Un pod évicté qui disparaît entre 2 scrapes n'apparaît jamais dans `kube_pod_status_reason`. L'alerte sur le disque du node est donc la plus fiable des deux, la seconde sert de confirmation quand des pods restent assez longtemps pour être vus.

Quand un runner est arrêté sans nettoyage, des pods de job peuvent rester orphelins. Le projet [GitLab Runner Pod Cleanup](https://gitlab.com/gitlab-org/ci-cd/gitlab-runner-pod-cleanup) est celui que la doc du runner cite pour planifier leur suppression.

## Suivre l'adoption pendant la migration

Migrer d'anciens runners (partagés ou sur VM) vers ce setup ne se fait pas d'un coup : les projets changent leurs tags à leur rythme. Pour savoir où en est la migration, on compte les jobs par runner. Le runner expose `gitlab_runner_jobs_total` avec le label `runner_name` (source : `commands/builds_helper.go` du dépôt gitlab-runner).

Pour la part des jobs traitée par les nouveaux runners, en supposant que leur nom commence par `k8s-` :

```promql
sum(increase(gitlab_runner_jobs_total{runner_name=~"k8s-.*"}[7d]))
/
sum(increase(gitlab_runner_jobs_total[7d]))
```

Ce ratio dit combien de jobs sont déjà migrés, pas combien de projets. Pour la liste des projets qui restent, l'API GitLab donne les jobs d'un runner donné (`GET /runners/:id/jobs`), à croiser avec le projet de chaque job. Quand les anciens runners sont des runners d'instance, `GET /runners/all` demande un accès administrateur ou auditeur. Sur un groupe, `GET /groups/:id/runners` demande le rôle Owner ou Auditor et un token avec le scope `manage_runner`.

```bash
glab api "groups/42/runners?type=group_type&per_page=100" --paginate > /tmp/runners.json
jq -r '.[] | [.id, .description, .status, .runner_type] | @tsv' /tmp/runners.json | head
```

## Nettoyer les anciens runners

Une fois le trafic parti, un ancien runner reste enregistré côté GitLab même éteint. Il pollue la liste, ses tags attirent encore des jobs si quelqu'un l'a gardé sans l'arrêter. Pour éviter les mauvaises surprises, on vérifie qu'il ne traite plus rien, on le met en pause, on attend, puis on le supprime.

L'API accepte le filtre `status=offline`, qui peut aussi renvoyer des runners `stale` d'après la [doc des runners](https://docs.gitlab.com/api/runners/). On liste d'abord, sans rien supprimer.

```bash
# Dry run: list offline group runners with their last contact, nothing is deleted
glab api "groups/42/runners?status=offline&per_page=100" --paginate > /tmp/offline-runners.json
test -s /tmp/offline-runners.json || { echo "empty read, stop" >&2; exit 1; }
jq -r '.[] | [.id, .description, .status] | @tsv' /tmp/offline-runners.json
```

Après relecture de la liste, la suppression se fait runner par runner avec `DELETE /runners/:id`. Le fichier intermédiaire évite de rejouer un `echo "$JSON" | jq` qui interprète les `\n` des chaînes JSON.

```bash
# Delete every runner listed in the reviewed file, one API call each
for id in $(jq -r '.[].id' /tmp/offline-runners.json); do
  glab api --method DELETE "runners/${id}"
done
```

Côté runner, `gitlab-runner unregister` supprime le runner via l'API ([doc des commandes](https://docs.gitlab.com/runner/commands/)). Avec `--all-runners` il retire tous ceux rattachés au `config.toml`.

## Voir aussi

- [Spot sur GKE](../../cloud/gcloud/spot_nodes.md) : node pools, PDB et évictions
- [Optimiser sa CI GitLab](ci/optimize.md) : `interruptible`, clone superficiel, cache
