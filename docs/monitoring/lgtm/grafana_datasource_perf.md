---
description: "Alléger la charge des dashboards Grafana sur une datasource Prometheus ou Thanos : incremental querying et son overlap window, query cache et resource cache Grafana, cacheLevel, provisioning Terraform en opt-in par datasource et cas où rien ne s'applique."
tags:
  - Grafana
  - Thanos
  - Prometheus
  - Terraform
  - Observability
  - Performance
tested_with:
  - "Provider Terraform Grafana 4.28.1"
---

# Datasource Grafana sur Thanos : incremental querying, cache et provisioning

Un dashboard laissé ouvert en auto-refresh sur `now-24h` redemande les 24h complètes à chaque rafraîchissement, alors que seules les dernières minutes ont changé. Les écrans partagés et les variables de template réévaluées à chaque chargement ajoutent des requêtes redondantes vers Thanos ou Prometheus.

Grafana a 3 réglages côté datasource pour réduire ça : l'incremental querying, le cache de requêtes et de ressources et le `cacheLevel`. Ils ne se situent pas au même endroit, n'évitent pas les mêmes requêtes et ne se provisionnent pas de la même façon. Cet article les sépare, dit quand chacun ne s'applique pas et montre comment les poser en Terraform datasource par datasource. Le cache côté Thanos est décrit dans [les caches Thanos](thanos-cache.md), la saturation des gates dans [la concurrence côté query](thanos-query-concurrency.md).

## 3 réglages à ne pas confondre

Le piège de départ est de croire que l'onglet **Cache** d'une datasource porte tout. Il ne porte que le cache serveur.

| Réglage | S'exécute | Évite | Disponibilité |
|---|---|---|---|
| `incrementalQuerying` | dans le navigateur, par panel | de redemander la partie déjà chargée d'un timerange glissant | Grafana OSS, marqué beta |
| Query et resource cache | sur le serveur Grafana | de rejouer une requête ou un appel de labels identique pendant un TTL | Grafana Enterprise et Grafana Cloud |
| `cacheLevel` | dans le navigateur | de relancer les appels de labels, de métadonnées et d'autocomplétion | Grafana OSS |

Le [cache de résultats du query frontend Thanos](thanos-cache.md) vient en plus, derrière ces 3 réglages. Il traite un autre cas : il découpe les range queries en tranches et resert celles déjà calculées. Les réglages Grafana réduisent ce qui arrive au query frontend, lui réduit ce qui arrive aux queriers.

## Incremental querying

L'option se pose sur une datasource de type Prometheus (Thanos compris) et se lit dans le code du plugin, `grafana-prometheus-datasource`. Grafana garde en mémoire, dans l'onglet du navigateur, les frames déjà reçues pour chaque panel et chaque `refId`. Au rafraîchissement suivant, il ne demande que la fin du timerange, plus une marge de recouvrement.

La requête partielle part de `max(prevTo - overlap, from)` arrondi vers le bas à l'`interval` de la requête, où `prevTo` est la fin du timerange de la requête précédente. L'overlap window vaut `10m` par défaut. Elle sert à recoller les derniers points, qui peuvent être incomplets si Thanos n'avait pas encore tout ingéré au moment de la première requête.

Sur un timerange `now-24h` rafraîchi toutes les 5 minutes, on passe donc de 24h de données demandées à un peu plus de 15 minutes (5 minutes de nouveauté plus 10 minutes de recouvrement).

### Quand il ne s'applique pas

Le plugin retombe sur une requête complète, sans le dire, dans ces cas :

- un target est une instant query (`instant: true`)
- une expression contient la chaîne `$__range`, qui matche aussi `$__range_s` et `$__range_ms`
- le dashboard est un public dashboard
- le timerange ne se termine pas sur `now` (timerange absolu, lien partagé avec `from` et `to` fixes)
- la requête, l'`interval`, le flag `exemplar`, le timerange brut (`now-24h`) ou une variable interpolée a changé depuis la requête précédente
- le nouveau timerange ne prolonge pas le précédent (`newFrom` après `prevTo` ou `newTo` qui ne dépasse pas `prevTo`)

Passer de `now-24h` à `now-48h` change le timerange brut, donc la signature du target. Les 48h entières sont alors redemandées. L'incremental querying ne remplit jamais le passé et ne prolonge que la fin d'une fenêtre glissante.

Les 2 premiers cas comptent pour les dashboards d'ops. Un stat panel en `instant` ou un `increase(metric[$__range])` ne gagne rien. Un seul target de ce type dans un panel désactive l'option pour tous les targets de ce panel, la condition portant sur `request.targets`.

### Ce qu'il coûte

Le cache est une `Map` en mémoire du navigateur. Il n'est donc pas partagé entre utilisateurs ni entre onglets. Il disparaît au rechargement de la page. Il n'aide que le panel qui reste ouvert et se rafraîchit.

Une donnée qui arrive plus tard que l'overlap window reste fausse à l'écran jusqu'à un rechargement complet, puisque les points anciens ne sont jamais redemandés. Remonter l'overlap coûte du volume, le descendre coûte de l'exactitude, mais la doc accepte même `0s`.

## Query cache et resource cache

Le cache serveur de Grafana garde la réponse d'une requête de datasource pendant un TTL. La clé combine l'instance de datasource, la requête et le timerange. Pour une requête time series, le timerange est arrondi à l'`interval` du panel avant d'en faire une clé. Grafana ne réutilise jamais un sous-ensemble d'un résultat : après `t0` à `t1`, une requête `t0` à `t2` repart en entier.

Il couvre 2 flux distincts, chacun avec son TTL :

- les requêtes de panels (`ttl_queries_ms`)
- les appels de ressources, c'est-à-dire les labels et les valeurs de labels qui alimentent les variables de template (`ttl_resources_ms`)

La doc Grafana est explicite sur un point qui change la décision : certaines datasources, dont Prometheus et Loki, cachent déjà les requêtes elles-mêmes, donc le cache de requêtes n'y apporte pas grand-chose, mais le cache de ressources peut aider. Sur Thanos, le query frontend a déjà son cache de résultats. On a donc activé le cache Grafana surtout pour les variables, qui sont renvoyées à chaque stack interrogée à chaque chargement de dashboard et changent lentement.

### Choisir les TTL

On a posé ces valeurs sur une datasource Thanos de production, avec `use_default_ttl` à `false` pour ne pas dépendre du TTL par défaut de l'instance :

| Réglage | Valeur | Raison |
|---|---|---|
| `ttl_queries_ms` | `60000` | le cache sert à dédoublonner (plusieurs viewers, panels identiques), un TTL plus long n'apporte presque rien |
| `ttl_resources_ms` | `300000` | les labels bougent lentement, c'est le gain principal |

!!! warning "Un TTL de ressources long retarde les variables"
    Un nouveau pod ou un nouveau cluster peut mettre jusqu'à `ttl_resources_ms` avant d'apparaître dans une variable. Avec 5 minutes, un dashboard d'incident ouvert juste après un déploiement ne propose pas encore la cible.

Sur un panel qui doit être frais à la seconde, la section **Query options** du panel accepte un TTL propre en millisecondes, qui surcharge celui de la datasource.

### Vérifier qu'il sert

Le header de réponse `X-Cache` vaut `HIT`, `MISS` ou `BYPASS` (constantes du service `caching` de Grafana). On le lit dans le Query inspector d'un panel ou dans l'onglet Network des devtools, sur les appels `/api/ds/query`. Un second chargement du même dashboard doit répondre `HIT`.

Pour la vue d'ensemble, Grafana déclare `grafana_caching_query_caching_request_duration_seconds` et `grafana_caching_resource_caching_request_duration_seconds`, avec un label `cache` qui distingue hit et miss. Sur une instance OSS ces histogrammes restent vides, le service de cache y étant un stub. Sur Grafana Cloud, on n'a pas accès à l'endpoint `/metrics` de l'instance. Une recherche de `.*cach.*` dans la datasource d'usage ne renvoie aucune série. Côté Thanos, `rate(thanos_query_frontend_queries_total{op="query_range"}[5m])` montre l'effet global sur ce que le query frontend reçoit.

Pour contourner le cache en debug, un appel avec le header `X-Cache-Skip: true` saute le middleware.

Le `POST` ne gêne pas le cache du query frontend. `DecodeRequest` lit `start`, `end`, `query` et `step` avec `FormValue`, qui lit aussi bien l'URL d'un `GET` que le corps d'un `POST` en `application/x-www-form-urlencoded`. La clé se construit sur la requête décodée.

## cacheLevel : l'autocomplétion et les variables

Le `cacheLevel` ne touche pas les requêtes de panels. Il règle le cache navigateur des appels de labels, de métadonnées et d'autocomplétion. Il arrondit le timerange de ces appels pour que des appels successifs produisent les mêmes paramètres. Les variables `label_values()` passent par ces mêmes appels (`queryLabelValues`), donc il agit aussi sur elles.

Les valeurs sont lues dans `caching.ts` et `language_utils.ts` du plugin :

| Niveau | Timerange arrondi à | Cache des métadonnées | Debounce |
|---|---|---|---|
| `None` | pas d'arrondi | 1 jour | 350ms |
| `Low` (défaut) | 1 minute | 1 jour | 350ms |
| `Medium` | 10 minutes | 7 jours | 600ms |
| `High` | 60 minutes | 30 jours | 1200ms |

La doc recommande les niveaux hauts pour les datasources à forte cardinalité. Un niveau haut a un prix, puisqu'une métrique toute neuve peut manquer à l'autocomplétion tant que les métadonnées en cache n'ont pas expiré. Sur Thanos on est resté sur la valeur par défaut, car le gain venait déjà des TTL de ressources.

Le `timeInterval` (Scrape interval dans l'UI, `15s` par défaut) est le dernier réglage de la section. La doc demande de le faire correspondre à l'intervalle de scrape et d'évaluation de Prometheus : une valeur plus haute que la réalité réduit en principe le nombre de points.

## Provisionner en Terraform

Sur une datasource gérée par Terraform, un réglage coché dans l'UI sort du code et le prochain apply peut le réécrire. Il faut donc le poser dans le code. Les 2 réglages vivent dans 2 ressources différentes, d'où 2 blocs.

L'incremental querying est une clé de `json_data_encoded` de la datasource, comme dans l'exemple de la doc Grafana.

```hcl
resource "grafana_data_source" "thanos" {
  type = "prometheus"
  name = "Thanos"
  uid  = "thanos-prod"
  url  = "https://thanos.example.com"

  json_data_encoded = jsonencode({
    httpMethod                    = "POST"
    prometheusType                = "Thanos"
    customQueryParameters         = "dedup=1&max_source_resolution=auto"
    incrementalQuerying           = true
    incrementalQueryOverlapWindow = "10m"
  })
}
```

Le cache serveur est une ressource à part, `grafana_data_source_cache_config`, présente dans le provider 4.28.1 et réservée à Grafana Enterprise et Grafana Cloud. Elle accepte `datasource_uid`, `enabled`, `use_default_ttl` (vrai par défaut), `ttl_queries_ms` et `ttl_resources_ms`, ces 2 derniers étant ignorés si `use_default_ttl` est vrai. La supprimer désactive le cache de la datasource.

```hcl
resource "grafana_data_source_cache_config" "thanos" {
  datasource_uid   = grafana_data_source.thanos.uid
  enabled          = true
  use_default_ttl  = false
  ttl_queries_ms   = 60000
  ttl_resources_ms = 300000
}
```

### Un opt-in par datasource

Pour que seules les datasources listées aient un cache, le module prend une map indexée par `uid` et crée une ressource par entrée. Une datasource absente de la map n'est pas touchée. Le rollback est un revert de l'entrée.

```hcl
variable "cache_configs" {
  type = map(object({
    ttl_queries_ms   = number
    ttl_resources_ms = number
  }))
  default = {}
}

resource "grafana_data_source_cache_config" "this" {
  for_each = var.cache_configs

  datasource_uid   = each.key
  enabled          = true
  use_default_ttl  = false
  ttl_queries_ms   = each.value.ttl_queries_ms
  ttl_resources_ms = each.value.ttl_resources_ms
}
```

L'incremental querying suit le même principe, avec 2 champs optionnels dans l'objet de la datasource (`incremental_querying` et `incremental_query_overlap_window`), filtrés quand ils valent `null` pour que les autres datasources ne changent pas. On a commencé par une seule datasource de production.

### Pièges rencontrés

- Un apply finit à `0 changed` après le merge. Un champ optionnel ajouté au module a été posé sur la datasource dans `inputs.hcl`, mais une boucle locale reconstruisait chaque datasource avec une liste fixe de clés et jetait le nouveau champ avant le module. Aucune erreur n'a été levée et il a fallu une 2e MR pour corriger. Le plan doit afficher le changement avant le merge. Le rendu des inputs montre ce que le module reçoit vraiment. Le correctif lui-même avait oublié `incremental_query_overlap_window`, qui aurait été ignoré de la même façon.
- Un plan semble retirer le proxy de connexion privée. Sur une datasource avec `private_data_source_connect_network_id`, le provider déduit `enableSecureSocksProxy` et `secureSocksProxyUsername` et les réinjecte dans le `DiffSuppressFunc` et dans la requête. Dès qu'une vraie clé change, la suppression ne joue plus et le plan affiche le JSON brut sans ces 2 lignes, ce qui se lit comme un retrait. À l'apply elles sont renvoyées à l'API, comme l'a confirmé la lecture de `jsonData` après coup.
- Le réglage n'est pas dans l'onglet attendu. L'incremental querying se lit dans l'onglet Settings de la datasource, section Performance, jamais dans l'onglet Cache. Comme l'API de cache renvoie `enabled: false` tant que personne n'a cliqué, on croit à tort que rien n'a été appliqué.
- Lire `jsonData` avec le bon outil. Une sortie filtrée de la CLI qui renvoie `null` partout ne prouve rien. L'API `/api/datasources/uid/<uid>` donne le `jsonData` réel.

Un `uid` régénéré casse les panels qui référencent la datasource, c'est le sujet de [la migration vers Grafana Cloud](grafana-cloud-migration.md). Tout recréer pour poser une option est donc exclu et on modifie en place.

## Mesurer l'effet

L'effet de ces réglages sur la charge d'un Thanos n'est pas mesuré à ce jour. Les seuls chiffres solides décrivent des mécanismes et pas des gains, par exemple un timerange `now-24h` à 5 minutes de refresh qui passe de 24h à environ 15 minutes demandées (voir plus haut). Un TTL de ressources de 5 minutes évite le rechargement des labels pour tous les chargements de dashboard dans cet intervalle.

Pour mesurer l'effet, on compare la même fenêtre avant et après, sur une semaine pour absorber le rythme jour et nuit : le débit de `thanos_query_frontend_queries_total` par `op` (`query_range` pour les panels, `label_values` pour les variables), le nombre de sous-requêtes `thanos_frontend_split_queries_total` et la latence côté querier. Un instant donné ou une moyenne ne suffisent pas, car un dashboard ouvert en salle de crise fausse tout.
