---
description: "Remplacer un Prometheus par cluster par VictoriaMetrics cluster : ce que la RAM, le disque et le CPU coûtent réellement en régime permanent, pourquoi le CPU part dans la lecture des règles plutôt que dans l'écriture, les 6 défauts qui bloquent le déploiement et les pièges de dimensionnement de vmselect et vmstorage."
tags:
  - VictoriaMetrics
  - Prometheus
  - Observability
  - PromQL
  - Kubernetes
---

# VictoriaMetrics cluster : RAM, disque, facture CPU et pièges de dimensionnement

L'argument qui fait regarder VictoriaMetrics est toujours le même : 2 à 4 fois moins de RAM qu'un Prometheus pour la même volumétrie. Sur un cluster de production il tient à moitié, et il ne dit ni ce qui se paye à la place ni ce qui casse avant la première mesure.

Le terrain de ce retour est un cluster de production à 302k samples/s, avec un Prometheus local que la stack VictoriaMetrics a doublé pendant 2 semaines, du 15 au 29 septembre, pour comparer les 2 moteurs sur exactement les mêmes cibles. Le convertisseur prometheus-operator de l'opérateur VictoriaMetrics reprend les ServiceMonitor et les PrometheusRule existants, donc vmagent scrape ce que scrape Prometheus, sans configuration dupliquée.

## Ce que la réplication achète vraiment

C'est la première chose à remettre droit, parce qu'elle décide de tout le dimensionnement. Sur un cloud où les disques sont déjà répliqués, le réflexe est de se dire que `replicationFactor` ne sert à rien. C'est faux, mais pas pour la raison qu'on croit.

vminsert **shard** les séries entre les vmstorage. Avec un facteur de réplication à 1, perdre un vmstorage rend un N-ième des données illisibles, alors que le disque est intact et se rattachera ailleurs dans quelques minutes. Le disque répliqué protège d'un disque mort, pas d'un nœud absent. La [doc amont](https://docs.victoriametrics.com/victoriametrics/cluster-victoriametrics/#replication-and-data-safety) recommande d'ailleurs de déléguer la durabilité au stockage et de faire des sauvegardes plutôt que de compter sur la réplication :

> increases resource usage ... by up to `-replicationFactor=N` times

La réplication achète donc de la **disponibilité pendant les minutes où un pod n'est pas là**, ce qui est exactement la fenêtre d'un upgrade GKE hebdomadaire. Si ce n'est pas le besoin, il ne faut pas la payer.

## Le disque gagne, la RAM se discute

2 mesures, à 6 jours puis à 10 jours, quand la rétention de 7 jours avait bouclé sur les 3 vmstorage. La seconde est celle qui compte : le régime permanent.

| | VictoriaMetrics, 21 septembre | VictoriaMetrics, 25 septembre | Prometheus, 25 septembre |
|---|---|---|---|
| RAM consommée, 2 copies complètes côté VM | 73,4 GiB | 98,4 GiB | 90,4 GiB |
| Octets par sample stocké, index compris | 2,04 | **2,76** | **3,74** |
| Cibles up | 2649 | 3634 | 3544 |

VictoriaMetrics est **1,36 fois plus compact par sample** en régime permanent, contre 1,76 à 6 jours : l'index grossit avec la rétention. La compacité ne compense donc qu'un tiers du doublement apporté par la réplication et la HA à 2 copies coûte environ 1,5 fois le disque du Prometheus unique qu'elle remplace. Le PVC de 350Gi était rempli à 86% le 25 septembre.

Côté RAM, **l'écart se resserre avec le temps** : 12% de moins en portant 2 copies à 6 jours, 9% de plus au total à 10 jours. Ramené à une copie (vmstorage divisé par 2, les autres composants comptés une fois), c'est environ 54 GiB contre 90,4, soit jusqu'à 40% de moins par copie. C'est une borne haute : vmstorage remplit la limite qu'on lui donne, une partie de cette RAM est du cache opportuniste et pas un besoin (voir plus bas). Une mesure à chaud sur un PoC de 2 jours surestime le gain.

!!! warning "La déduplication se fait à la lecture, pas à l'écriture"
    Deux vmagent qui scrapent les mêmes cibles ingèrent 2 fois les mêmes samples. `-dedup.minScrapeInterval` les élimine pendant les merges, donc le disque en régime permanent ne double pas, mais l'ingestion instantanée oui. Un `vm_rows_inserted_total` à 630k/s pour 302k samples/s réels n'est pas une anomalie.

## Le CPU : la contrepartie non chiffrée

| | VictoriaMetrics | Prometheus |
|---|---|---|
| CPU consommé, 25 septembre | **23,5 cœurs** | 3,2 cœurs |

7,3 fois plus. Le réflexe est de l'imputer à l'amplification d'écriture du schéma HA, qui existe bien : 2 vmagent scrapent les mêmes cibles puis `replicationFactor: 2` envoie chaque sample sur 2 nœuds, soit 1,12M de rows/s reçus par vmstorage pour ~300k samples uniques. Un profil CPU de vmstorage-0 (`/debug/pprof/profile`) pris le 25 septembre montre pourtant que ce n'est pas là que part le CPU.

| Chemin dans vmstorage | Part du CPU |
|---|---|
| Lecture, `vmselectapi.processSearch` | **77%** |
| Écriture, `Storage.AddRows` | 12% |

Toute cette lecture vient de vmalert : 2 replicas à 33,5 exécutions par seconde font exactement les 67 requêtes/s que reçoit vmselect, qui les diffuse en 291 RPC/s sur les 3 vmstorage. Les 2 replicas **évaluent chacun toutes les règles**, donc la moitié de la lecture est un doublon, là où Prometheus évalue une seule fois et en mémoire contre son head. Pendant un PoC où vmalert ne notifie personne, un seul replica divise cette charge par 2.

Chaque lecture coûte cher à cause du cache qui associe un sélecteur à ses séries, `indexdb/tagFiltersToMetricIDs` : il rate 44% des requêtes alors qu'il n'est rempli qu'à 18%. Ce n'est donc pas un manque de place, ses entrées sont invalidées, très probablement par le churn du cluster qui crée 1200 nouvelles séries par seconde, autant côté Prometheus. Chaque miss relance une recherche complète dans l'index, `mergeset.Seek` pesant à lui seul 44% du CPU du profil.

Le gain RAM se paye bien en CPU, mais pas où on l'attend : un chiffrage de flotte doit partir du volume de règles et du churn plutôt que du débit d'ingestion. L'écart s'est d'ailleurs creusé avec le temps, 4x à 24h puis 7,3x dès 6 jours, ce qui colle avec un coût dominé par un index qui grossit avec la rétention.

## Une évaluation des règles 8 fois plus lente

vmalert interroge vmselect en HTTP, qui diffuse sur les vmstorage et déduplique, là où Prometheus évalue en mémoire contre son head local. Ce plancher ne disparaît pas.

| Moyenne sur 24h | vmalert, 21 septembre | vmalert, 25 septembre | Prometheus, 25 septembre |
|---|---|---|---|
| Durée d'itération de groupe | 1,32 s | 5,4 s | 0,66 s |
| Itérations manquées par minute | 0,41 | 4,3 | 0 |

Le chiffre de départ était de 36 fois plus lent, ramené à 4 au 21 septembre par le dimensionnement décrit plus bas, puis remonté à 8 en moyenne : le déficit se concentre sur le pic du soir, environ 4h par jour, pendant lesquelles chaque itération manquée est une recording rule sans point et une alerte évaluée en retard. Comparer les moyennes reste trompeur cela dit : Prometheus a beaucoup de petits groupes qui tirent sa moyenne vers le bas, et le groupe le plus lent côté vmalert mettait 113 s pour un intervalle de 60 s.

!!! warning "Le chaînage de recording rules ne tient pas, même en séquentiel"
    vmalert évalue les règles d'un groupe dans l'ordre, mais l'écriture des résultats vers le stockage est asynchrone : la [doc](https://docs.victoriametrics.com/victoriametrics/vmalert/#limitations) prévient que « user shouldn't rely on chaining of recording rules when result of previous recording rule is reused in the next one ». Sur le jeu de règles converti, 4 règles consommaient une recording rule produite plus tôt dans leur propre groupe : là où Prometheus lit la valeur fraîche, ces règles peuvent lire celle de l'itération précédente, avant même de toucher au champ `concurrency` du groupe qui ne fait qu'aggraver le problème. La parade est de les sortir dans un groupe chaîné.

## 6 défauts avant la première mesure

Aucun de ces 6 n'est un bug de VictoriaMetrics. Ce sont des défauts de déploiement et ils ont tous la même forme : un défaut qui diffère de Prometheus sans le dire.

| Symptôme | Cause racine |
|---|---|
| Toutes les CR rejetées par l'API server | `$ARGOCD_APP_NAME` littéral dans un label |
| Ingress refusé, `pathType must be specified` | clé de values inconnue, defaults non mergés |
| `AttachVolume.Attach failed`, `pd-balanced disk type cannot be used` | PVC sans `storageClassName` |
| 21 recording rules muettes | réponse de scrape plafonnée à 16MB |
| 737 cibles en timeout | NetworkPolicy qui ne connaît que l'ancien namespace |
| 36 requêtes de règles jetées par minute | concurrence dérivée du limit CPU |

### Le `$ARGOCD_APP_NAME` qui ne se substitue pas

Le chart expose `argocdReleaseOverride` et la doc suggère de le mettre à `$ARGOCD_APP_NAME`. ArgoCD ne substitue les variables de build que dans `helm.parameters`, **jamais dans un fichier de values**. La chaîne part littéralement dans `app.kubernetes.io/instance`, qui n'est pas un label valide, et l'API server rejette l'Ingress, le VMAgent, le VMCluster et le VMAlert d'un coup. Quand `helm.releaseName` est déjà fixé dans l'ApplicationSet, ce paramètre ne sert de toute façon à rien.

### La clé de values qui n'existe pas

L'ingress de vmselect se configure sous `vmcluster.ingress.select`, pas `vmcluster.ingress.vmselect`. Une clé inconnue ne produit aucune erreur : Helm ne merge simplement pas les valeurs par défaut et l'objet sort sans `pathType`, qui est obligatoire. Le nom de l'Ingress reste correct parce que le template le reconstruit, ce qui masque la cause.

### La réponse de scrape plafonnée

`-promscrape.maxScrapeSize` vaut 16MB par défaut. Prometheus n'a pas d'équivalent actif. Un kube-state-metrics qui répond 70MB est donc **rejeté en entier**, pas tronqué et les séries `kube_*` n'arrivent jamais. En aval toutes les recording rules qui en dérivent sont muettes, ce qui se voit comme un trou de métriques et pas comme un problème de scrape.

```text
the response from "http://…/metrics" exceeds -promscrape.maxScrapeSize
or max_scrape_size in the scrape config (16777216 bytes)
```

Le contrôle à faire avant de conclure à un problème de conversion est le compte de noms de recording rules des 2 côtés :

```promql
count(count by(__name__) ({__name__=~"^:.*|.*:.*:.*"}))
```

## Dimensionner vmselect avec la formule de la doc

C'est le piège le plus coûteux, parce qu'il se referme 2 fois dans des sens opposés.

`-search.maxConcurrentRequests` n'a pas de valeur en dur : son défaut est `cgroup.AvailableCPUs() * 2`, donc il **suit le limit CPU du conteneur**. Avec un limit à 2 cœurs, vmselect accepte 4 requêtes concurrentes et un vmalert qui évalue 163 groupes toutes les 30 s en met beaucoup plus que ça en vol. Pire, `-search.maxQueueDuration` vaut 10 s, donc plus court que l'intervalle d'évaluation : une requête en file est jetée avant même son tick suivant.

Le dimensionnement se pose avec la loi de Little. À 69 requêtes par seconde et 0,418 s de latence moyenne, il faut 29 slots concurrents ; il y en avait 16, soit un facteur 1,8 de sur-souscription et 70% des requêtes attendaient en file avant de s'exécuter. Comme les règles d'un groupe sont évaluées en série, cette attente se multiplie par le nombre de règles.

Passer la concurrence de 8 à 24 par pod a réglé ça, puis a immédiatement ouvert l'autre piège. La doc donne l'enveloppe mémoire noir sur blanc :

> The total memory limit for concurrently executed queries can be estimated as `-search.maxMemoryPerQuery` multiplied by `-search.maxConcurrentRequests`

Or `-search.maxMemoryPerQuery` vaut **0 par défaut**, c'est-à-dire sans borne. 24 slots sans plafond unitaire sur un limit de 8 Gi et une requête sur un histogramme de 863k séries a tué le process, emportant les 23 autres requêtes en vol avec elle.

!!! tip "Le plafond par requête ne coûte rien et change le mode de défaillance"
    Sur 12h de mesure, `vm_memory_intensive_queries_total` est resté à 0 avec un plafond à 512MB : aucune requête ne l'a atteint. Il n'a donc rejeté rien de ce qui fonctionnait et il transforme un OOM du pod, qui coupe toutes les requêtes en vol et l'évaluation des règles, en échec d'une seule requête.

Le plafond ne règle pas tout pour autant : vmselect-1 a encore été OOMKilled 2 fois en 4 jours après coup, toujours le même pod.

## 3 vmstorage, pas 2

La règle est explicite dans la doc et facile à rater :

> The cluster must contain at least `2*N-1` vmstorage nodes, where `N` is replication factor, in order to maintain the given replication factor for newly ingested data when `N-1` of storage nodes are unavailable.

Avec un facteur 2, il faut donc 3 nœuds. À 2 nœuds, perdre l'un des 2 ramène le facteur des nouvelles données à 1, ce qui vide de son sens la propriété qu'on cherchait à acheter.

Le passage à 3 a un second effet, plus intéressant que la conformité : chaque nœud passe de 100% des données à 67%, donc l'empreinte par pod baisse d'un tiers. 3 pods de 24 Gi tiennent sur des formes de nœud où 2 pods de 32 Gi ne rentrent pas et c'est ce qui rend la contrainte d'étalement applicable.

!!! warning "VictoriaMetrics ne reshard pas au scale-out"
    Les nœuds déjà en place gardent la semaine qu'ils portent, seules les nouvelles données se répartissent sur 3. La convergence prend une rétention complète et pendant ce temps le PVC doit couvrir l'ancien volume et pas le nouveau. Réduire un PVC est de toute façon impossible sans détruire le StatefulSet.

La projection de mémoire, elle, s'est révélée fausse. Passer de 100% à 67% des données ne divise pas la RAM par la même proportion parce que l'overhead fixe ne se divise pas : 24 Gi projetés depuis une mesure de 24,5 GiB à 2 nœuds ont fini à 95% d'occupation. Remontés à 32 Gi, les vmstorage se sont stabilisés à 97,5% : ils remplissent ce qu'on leur donne, ce qui fait de toute mesure de RAM une borne haute tant que le cache n'est pas plafonné.

## Étaler des replicas que rien n'étale

Un `topologySpreadConstraints` sans `labelSelector` **ne matche aucun pod** en Kubernetes standard et l'opérateur VictoriaMetrics n'en injecte pas. La contrainte est donc syntaxiquement valide, acceptée et n'étale rien. Les 2 vmstorage ont passé plusieurs jours sur le même nœud avec `replicationFactor: 2` actif, c'est-à-dire en payant la réplication sans en avoir la propriété.

```yaml title="La contrainte qui étale vraiment"
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app.kubernetes.io/name: vmstorage
        app.kubernetes.io/instance: <release>-victoria-metrics-k8s-stack
```

Le `labelSelector` est nécessaire mais pas suffisant. `maxSkew: 1` compare les domaines éligibles entre eux : avec 3 pods et 2 nœuds disponibles, une répartition 2 et 1 donne un skew de 1, donc elle est autorisée. Il faut `DoNotSchedule` pour que le scheduler filtre au lieu de scorer et accepter qu'un pod reste Pending le temps que l'auto-provisioning de nœuds livre. Quand l'objectif est « jamais 2 replicas sur un nœud » et pas « équilibrer », un `podAntiAffinity` en `requiredDuringSchedulingIgnoredDuringExecution` dit la chose plus directement.

## Une file persistante plafonnée par son PVC

Dernier piège et le seul qui perd des données. vmagent tamponne sur disque ce qu'il n'arrive pas à pousser et l'opérateur cale `-remoteWrite.maxDiskUsagePerURL` sur la taille de `statefulStorage`, divisée par le nombre de destinations `remoteWrite`. Le plafond de la file **est** donc le disque.

Quand vmstorage sature son limit CPU, vminsert n'arrive plus à le drainer, la file de vmagent monte jusqu'au bord du PVC et jette. Sur une nuit, 18,4 GB jetés et 1,29 G de samples perdus, soit 2,9% de ce que vmagent avait envoyé. Ce n'est pas un export secondaire qui manque : quand la seule destination configurée est vminsert, ces samples manquent au TSDB lui-même.

Les 2 alertes qui se déclenchent, PVC au-dessus de 90% et file qui jette, sont un seul événement à 20 minutes d'écart. La métrique qui donne la cause en amont est la saturation de la connexion RPC, qui mesure le temps que vminsert passe bloqué à écrire :

```promql
max(rate(vm_rpc_send_duration_seconds_total[10m])) by (addr)
```

Un rate proche de 1 veut dire que la connexion est occupée en permanence, donc que le nœud en face ne suit pas. C'est le signal à surveiller, avant que la file ne parle.

!!! tip "Sur la même plateforme"
    La couche globale qui agrège ces clusters est décrite dans [Thanos at scale](lgtm/thanos.md) et le dimensionnement de la concurrence de lecture dans [La concurrence de lecture Thanos](lgtm/thanos-query-concurrency.md), qui applique la même loi de Little à un autre étage.
