---
description: "Mutualiser les caches Thanos sur un backend partagé : index cache, caching bucket et cache de résultats, dimensionnement réel contre taille IN-MEMORY, Memcached ou Redis, et ce que ça change sur la facture."
variables:
  - name: namespace
    default: monitoring
  - name: master_name
    default: thanos-cache
tags:
  - Thanos
  - Cache
  - Redis
  - Observability
  - FinOps
series: "Thanos at scale"
series_order: 2
tested_with:
  - "Thanos 0.35+"
  - "Redis Sentinel 6.2+"
---

# Les caches Thanos : mutualisation, dimensionnement et facture

Thanos a 3 caches, dont un seul est actif par défaut, en mémoire du process. Les 2 autres
ne se réveillent que si on les configure, et on les configure presque toujours en mémoire
eux aussi. Sur une vingtaine de stacks ça fait une centaine de pods qui portent chacun le
sien, personne ne partage rien et tout est perdu au premier redémarrage. Cet article part de ce constat et
va jusqu'au backend partagé : pourquoi mutualiser, ce qui ne se mutualise pas, comment
dimensionner sans recopier une taille qui ne veut rien dire et ce que ça donne sur la
facture.

Le reste de la plateforme est décrit dans [Thanos at scale](thanos.md), dont cet article
était une section avant de devenir trop gros pour y rester.

Thanos a 3 caches et ils n'ont pas le même statut au démarrage :

- l'index cache de la store gateway (`--index-cache.config`), qui garde les postings, les séries et les expanded postings. **C'est le seul actif par défaut**, en `IN-MEMORY`, dimensionné par `--index-cache-size` à 250 Mo
- le caching bucket (`--store.caching-bucket.config`), qui garde les sous-plages de chunks et les métadonnées de blocks. Instancié seulement si la config est fournie
- le cache de résultats du query frontend (`--query-range.response-cache-config`), qui garde les réponses de requêtes. La doc est explicite : *if both `max_size` and `max_size_items` are not set, then the cache would not be created*

Une fois les 3 configurés en `IN-MEMORY`, chaque replica a le sien, personne ne partage rien et tout est perdu au premier redémarrage. À une stack par cluster ça se chiffre vite, puisque 3 shards et 2 replicas chacun sur une vingtaine de stacks font de l'ordre de la centaine de pods, chacun portant son 1 Gio d'index cache et ses 2 Gio de caching bucket, la configuration d'où on est parti. La store gateway finissait autour de 230 Gio de RAM pour moins d'un cœur de CPU, ce qui dit assez qu'on paye du cache et pas du calcul.

Et c'est là que ça rejoint le choix du spot. Une éviction ne coûte rien en compute, c'est tout l'intérêt, mais avec un cache en mémoire elle coûte le cache. Le pod revient froid et repart pour de longues minutes avant d'être utile. Le cache local est ce qui rend le spot cher.

Un backend partagé règle les 2 problèmes d'un coup. Un seul cache chaud pour tous les replicas, qui survit aux évictions, et une seule enveloppe mémoire au lieu de 100.

On ne l'a pas mutualisé partout. 6 stacks, celles qui sont réellement interrogées, tournent sur leur propre instance Dragonfly, qui porte à la fois le caching bucket et l'index cache. Les 17 autres ou à peu près restent en `IN-MEMORY`, avec un caching bucket plafonné à `512MB` (soit 512 Mio) et un index cache de `1GB` par pod. Leur working set cumulé tient sous 1 Gio, donc une instance dédiée coûterait plus de surcoût fixe qu'elle ne déduplique : pour elles le cache local reste le bon choix. Le cache de résultats du query frontend global a, lui, sa propre instance.

Quand les 2 replicas d'un shard sont déclarés au querier comme un seul endpoint `dns+` en groupe, chaque requête n'est servie que par l'un des deux et ne réchauffe que son cache, donc la requête suivante a une chance sur 2 de tomber sur le replica qui n'a jamais vu ces séries. Un cache partagé supprime ce demi-cache froid.

!!! warning "Les 3 caches IN-MEMORY n'expirent pas de la même façon"
    Attention à ne pas généraliser, les 3 implémentations diffèrent. `validity` n'existe que
    dans le cache de résultats du query frontend, et ce n'est pas une éviction mais un
    contrôle de péremption **à la lecture** : rien ne supprime les entrées, le cache grossit
    depuis le démarrage du pod jusqu'à buter sur son plafond, en accumulant des entrées trop
    vieilles pour être servies. On mesure 0 éviction pendant que le nombre d'entrées triple.
    L'index cache in-memory, lui, n'a aucune notion de TTL et évince en LRU dès le plafond
    atteint, ce que compte `thanos_store_index_cache_items_evicted_total`. Le caching bucket
    in-memory prend bien un TTL par entrée et la supprime à la lecture.

Ce qui fait qu'une taille de cache IN-MEMORY ne mesure pas un working set, elle mesure **depuis combien de temps le pod tourne**. En basculant sur un backend Redis avec un vrai TTL, on a vu le cache tomber à un dixième du nombre d'entrées et le hit ratio **monter** de 76 à 91 %. Les 90 % d'entrées en trop étaient du poids mort : périmées, incapables de servir un hit et occupant la RAM quand même.

Corollaire pratique : ne jamais dimensionner un cache partagé sur la taille observée du cache IN-MEMORY qu'il remplace. On surdimensionne d'un ordre de grandeur.

## Un block neuf est froid partout

Un cache partagé et persistant ne protège pas d'un cas, le block qui vient d'être compacté. Toutes les clés, index comme chunks, portent l'ULID du block et le compactor en crée un nouveau à chaque niveau de compaction. Le block de 48h qui remplace ses sources n'a donc aucune entrée nulle part, quel que soit le backend.

La première requête longue qui le couvre lit ses chunks depuis le stockage objet. Sur la flotte, ça donne des `get_range` de 6 à 8s au p99, un `Series` autour de 16s au p99 et le hit ratio de l'index cache qui passe de 0,95 à 0,8, alors que la même requête rejouée quelques minutes plus tard répond en 1s environ. La première lecture se paye une fois par block et par cache, il n'y a rien à optimiser côté requête.

## Le caching bucket ne se partage pas entre tenants

« Un seul cache pour toute la flotte » a une limite qui n'est pas dans la doc et qui se paye
comptant. Le caching bucket ne garde pas que des sous-plages de chunks, il garde aussi **le
résultat de l'itération des blocks**, avec son TTL propre `blocks_iter_ttl`, à côté de
`metafile_exists_ttl`, `metafile_doesnt_exist_ttl` et `metafile_content_ttl`.

Les clés de chunks portent l'ULID du block, unique globalement, donc 2 tenants ne peuvent
pas s'y marcher dessus. La clé du listing, elle, était le seul chemin du répertoire,
identique pour tout le monde puisque c'est la racine du bucket, alors que chaque tenant a
son propre bucket objet. **Corrigé en v0.35.0** : `BucketCacheKey.String()` ajoute
désormais un `ObjectStorageConfigHash` aux verbes d'itération, donc 2 configs de bucket
différentes ne partagent plus la clé. Le piège ci-dessous ne concerne que les versions
antérieures, et le champ `prefix` de la config Redis cloisonne les keyspaces
quelle que soit la version (Memcached n'a pas d'équivalent). Un tenant lit donc la liste de blocks d'un autre, part chercher ces ULID chez lui, ne
les trouve pas et classe l'intégralité en `partial` :

```text
successfully synchronized block metadata  duration=12ms  cached=0  returned=0  partial=73
```

73 blocks listés, aucun retourné. La store gateway reste `Ready`, ses probes sont vertes,
elle ne redémarre pas et elle ne sert plus une seule donnée historique, ce qui fait que les
requêtes longues renvoient du résultat partiel sans erreur - bien pire qu'une panne franche,
parce que rien n'alerte et que les chiffres affichés restent plausibles.

Le piège de validation est que le mécanisme marche parfaitement sur une instance **dédiée**.
Un canary sur un seul tenant valide le protocole, la NetworkPolicy, le TTL et le hit ratio,
puis ne dit rigoureusement rien du partage. Avant de mutualiser, la question à trancher est
de savoir si les clés portent le nom du bucket ou seulement le chemin de l'objet et ça se
lit dans le code du `CachingBucket` de sa version.

## Dimensionner le cache partagé

La taille à viser est le **working set sur la fenêtre du TTL**, pas la taille actuelle du cache, qui ne dit que le plafond qu'on lui a donné. Le proxy se calcule sur le volume d'admission : `increase(thanos_redis_operation_duration_seconds_count{operation="set"}[TTL])` (`thanos_memcached_operations_total{operation="set"}` sur Memcached) multiplié par la taille moyenne d'une entrée. Deux pièges.

Le premier est de lire ça sur un instantané. Un `increase` pris à un moment donné est un point au hasard et il sous-estime lourdement les stacks en dents de scie : sur l'un des nôtres, 0,24 Gio en snapshot contre 9 Gio au P95 du glissant sur 24h. Facteur 37. Il faut le **P95 de la fenêtre TTL glissante sur 24h au minimum**, donc une subquery avec un pas explicite - une subquery sans pas est un moyen fiable de faire tomber le querier.

Le second est le facteur de déduplication. Il est tentant de diviser par le nombre de pods, mais des store gateways shardées cachent des blocks **disjoints** : seuls les replicas d'un même shard cachent la même chose. Avec 3 shards et 2 replicas, on divise par 2 au maximum, pas par 6, et se tromper là sous-dimensionne d'un facteur 3. Le nombre de replicas par shard n'est qu'une borne haute : on a mesuré un facteur de 1,4 et pas 2, parce que les replicas chargent bien les mêmes blocks mais chacun ne cache que les chunks que ses propres requêtes ont touchés.

Pour l'index cache, les métriques des pods encore en `IN-MEMORY` donnent un encadrement. La borne basse est la somme, shard par shard, du pic de `thanos_store_index_cache_items_size_bytes` du replica le plus chargé, puisque l'union des 2 replicas vaut au moins le plus gros des deux. La borne haute est la somme sur tous les pods. Un pod qui évicte déjà est au plafond de son `max_size` et sa mesure n'est qu'un plancher, alors qu'un pod sans éviction garde tout depuis son démarrage et tire vers le haut, pour la raison vue plus haut.

Et le résultat reste une borne haute, parce qu'un cache qui évicte réadmet en boucle les mêmes clés et gonfle le compteur d'admissions. Le vrai working set se trouve en montant le plafond par paliers jusqu'à ce que le taux d'éviction s'effondre. Le plateau, c'est la réponse.

Sur le caching bucket, les sous-plages de chunks sont écrites avec `chunk_subrange_ttl`, à 24h par défaut, et le champ `expiration` de la config du client Redis ne les gouverne pas : avec `expiration: 2h`, les clés échantillonnées sur le backend portaient bien un TTL de 24h. Le working set à viser est donc celui de 24h. Si le cache plafonne avant, c'est sa mémoire qui borne la rétention et pas le TTL, ce que dit le rapport entre `evicted_keys` et `expired_keys` : quand les évictions dominent, c'est `maxmemory` qu'il faut monter.

Chez nous on dimensionne pourtant sur une fenêtre de 2h, alors que les sous-plages vivent 24h. C'est un arbitrage coût contre performance qu'on assume : la mémoire se paye 24h/24, et le prix d'un cache plus petit est qu'il est plus froid pour les requêtes qui remontent au-delà de 2h. Si le hit ratio compte plus que la facture, c'est la règle des 24h qui fait foi.

Enfin le `limits.memory` du conteneur se dimensionne sur le **RSS**, avec une marge absolue et pas un ratio. Les métadonnées et la fragmentation de l'allocateur vivent bien en dehors du `maxmemory`, mais elles ne suivent pas la taille du cache : sur une instance dont le keyspace oscille, on mesure 1,4 Gio de rétention d'allocateur pour un keyspace qui plafonne à 236 Mio et qui ne sont jamais rendus à l'OS, quand la même instance à plein remplissage n'a que 50 Mio de surcoût sur 3,2 Gio. Un ratio sous-dimensionne donc les petits plafonds et gonfle les gros, là où `maxmemory` plus une marge fixe de l'ordre de 2 Gio tient dans les 2 cas. Et le backend ne pré-alloue pas sur son plafond, ce qui se vérifie en comparant 2 instances : celle dont le `maxmemory` est 8 fois plus grand peut avoir le RSS le plus petit.

!!! note "`max_size` est binaire"
    Thanos parse `2GB` comme 2 Gio, pas 2 GB. Un plafond de `1GB` par pod sur une centaine de
    pods fait donc 100 Gio et pas 100 GB. Les 7 % d'écart passent inaperçus dans un calcul de
    capacité et se voient sur une facture.

## Memcached ou Redis

Memcached est plus simple à poser, mais il n'est pas horizontalement scalable en l'état : c'est au client de faire le sharding et la haute dispo demande du travail. Redis coûte un peu plus cher en exploitation mais apporte Sentinel pour le failover et un vrai comportement en cluster.

Dragonfly est une troisième voie qui mérite d'être connue. Il parle le protocole Redis, donc c'est un remplacement transparent côté Thanos, mais il est multi-threadé : là où Redis sature un cœur et impose du sharding pour aller au-delà, Dragonfly scale verticalement, on lui ajoute des `--proactor_threads` et on reste sur une seule instance. Pour un cache, dont la perte est bénigne, exploiter une instance unique bien placée est plus simple qu'un cluster.

3 pièges rencontrés avec son opérateur Kubernetes :

- Les métriques Prometheus sortent sur un port `admin` séparé et l'opérateur crée par défaut une NetworkPolicy qui ne l'ouvre qu'à lui-même et aux pods pairs. Prometheus reste muet, silencieusement. Les NetworkPolicies étant purement additives, il suffit d'en **ajouter** une pour le namespace de Prometheus, sans désactiver celle de l'opérateur.
- Il n'y a pas de `/metrics` HTTP sur le port principal, qui ne parle que RESP. Se tromper de port donne un timeout qu'on met du temps à relier à une NetworkPolicy.
- `dragonfly_evicted_keys_total` et `dragonfly_expired_keys_total` sont **déclarés sans valeur** tant qu'ils valent zéro. Prometheus n'ingère donc aucune série et un panneau affiche « No data » là où on attend 0, ce qui rend « rien évicté » indiscernable de « métrique cassée ». En attendant, le signal d'éviction utilisable est la mémoire utilisée qui rejoint `maxmemory`.

2 montages se côtoient donc : Redis derrière Sentinel, qui est ce que la suite de la section détaille d'abord, puis une seule instance Dragonfly en direct, qui est ce qu'on fait tourner aujourd'hui.

### Redis derrière Sentinel

La configuration est la même forme pour les 3 caches. Pour la store gateway :

```yaml
# --index-cache.config
type: REDIS
config:
  addr: "redis-sentinel.<namespace>.svc.cluster.local:26379"
  master_name: "<master_name>"
  dial_timeout: 5s
  read_timeout: 3s
  write_timeout: 3s
  max_get_multi_concurrency: 100
  cache_size: 0
enabled_items: []
ttl: 24h
```

Quand le caching bucket tourne déjà sur le même backend, l'index cache prend une db à part (`db: 1` à côté du `db: 0` du caching bucket), ce qui permet de le vider seul avec un `FLUSHDB` sans perdre les chunks. Si la config `IN-MEMORY` de départ vient d'un fichier de values Helm partagé, l'override par stack s'écrit en chaîne YAML (`indexCacheConfig: |`) et pas en map : Helm fusionne les maps en profondeur, donc les clés `IN-MEMORY` comme `max_size` fuiraient dans la config REDIS.

Juste après la bascule, les logs sortent une rafale de plusieurs milliers de `failed to cache series in memcached err=the async buffer is full` en une seconde, puis plus rien. Le message garde le mot memcached même sur Redis, parce que le code est commun aux backends distants. La file d'écriture asynchrone déborde le temps que le cache vide se remplisse et les écritures en trop sont abandonnées sans toucher aux requêtes, donc `max_async_buffer_size` ne se règle que si ça dure.

Le query frontend, lui, ne peut **pas** relire ce fichier : son parseur fait un
`yaml.UnmarshalStrict` sur un `{type, config}` qui ne connaît ni `enabled_items` ni `ttl`,
donc le composant refuse de démarrer. Son TTL s'appelle `expiration` et vit à l'intérieur
du bloc `config:`, en `yaml:",inline"` avec le client Redis. Il lui faut donc un second
fichier, celui-là partageable entre ses 2 endpoints :

```yaml title="/etc/thanos/redis-frontend.yml"
type: REDIS
config:
  addr: "redis-sentinel.<namespace>.svc.cluster.local:26379"
  master_name: "<master_name>"
  expiration: 2h
```

On est à 2h et pas à 24h pour `expiration`, soit l'ancien `validity` du cache en mémoire. C'est un arbitrage FinOps assumé : un résultat plus vieux que 2h est recalculé, en échange d'un cache bien plus petit à payer.

```yaml
args:
  - --query-range.response-cache-config-file=/etc/thanos/redis-frontend.yml
  - --labels.response-cache-config-file=/etc/thanos/redis-frontend.yml
```

!!! warning "Le piège du failover Sentinel"
    Après une bascule, les composants Thanos continuent de parler à l'ancien master, devenu
    replica et on récolte des `can't write against a read only replica`. Il faut pointer
    Thanos sur le service Sentinel et renseigner `master_name`, pour que le client demande
    à Sentinel qui est le master courant au lieu de le supposer.

Sur Sentinel 6.2 et plus, activer aussi `sentinel resolve-hostnames yes`, sinon les IP des
replicas s'accumulent dans la liste que Sentinel garde de ses replicas.

!!! warning "Redis devient une dépendance de démarrage"
    Le client Redis se connecte dès sa création : une store gateway dont le caching bucket ou l'index cache pointe sur un backend injoignable sort en erreur au boot et part en crashloop jusqu'au retour du cache. Redémarrer le cache pendant un rollout des store gateways suffit à le déclencher, d'où l'ordre de livraison : le redimensionnement du cache d'abord, le changement de config ensuite.

### Dragonfly en instance unique

Chez nous il n'y a pas de Sentinel. Chaque stack interrogée a sa propre instance Dragonfly en un seul replica, sur des nœuds on-demand (un replica unique sur spot repartirait à froid à chaque préemption), et les composants Thanos parlent directement au port `6379` : pas de `master_name`, pas de `sentinel`. Perdre le cache ne coûte qu'un cache froid, et la store gateway se reconnecte toute seule, donc la haute dispo d'un Redis avec failover n'achète rien ici. Le caching bucket est en `db: 0` et l'index cache en `db: 1` de la même instance :

```yaml
# caching bucket
type: REDIS
config:
  addr: "thanos-cache-<stack>.<namespace>.svc.cluster.local:6379"
  db: 0
  expiration: 2h
  cache_size: 0
---
# --index-cache.config
type: REDIS
ttl: 24h
config:
  addr: "thanos-cache-<stack>.<namespace>.svc.cluster.local:6379"
  db: 1
  cache_size: 0
```

Le query frontend global suit le même schéma sur une instance à part, avec le `config:` plus court vu plus haut (`addr` en direct, `db: 0`, `expiration: 2h`). La dépendance de démarrage existe aussi de son côté : il valide la connexion Redis au boot et sort en erreur si le cache est injoignable, puis se rétablit par CrashLoopBackOff. À un rollout, on livre le cache avant les composants qui s'en servent.

Un mot sur `cache_size` : à une valeur non nulle, il active un cache côté client par-dessus le cache Redis. Utile quand les mêmes clés reviennent en boucle, ce qui est exactement le cas d'un dashboard rafraîchi toutes les 30 secondes.

## Le gain côté facture

Le listing du bucket est un poste à part. Chaque replica de store gateway découvre les nouveaux blocks de son côté et 2 flags pilotent ce que ça coûte.

`--block-discovery-strategy` décide comment on liste. La stratégie `concurrent`, celle par défaut, lance un appel par répertoire et fait donc N+1 requêtes. La stratégie `recursive` itère sur tout le bucket : moins d'appels, mais une itération plus lente.

`--sync-block-duration` décide à quelle fréquence, 15 minutes par défaut. Le caching bucket absorbe l'essentiel des appels d'un sync (hits mesurés : `exists` 97 %, `get` de meta 88 %, `iter` 51 %), et seul `iter` dépend de l'intervalle, le reste suit les TTL du caching bucket (5 minutes pour `iter`, 2h pour `exists`, 15 minutes pour les fichiers absents, par défaut). Passer de 5 à 15 minutes ne divise donc pas les appels par 3 : seuls les `iter` baissent, d'un facteur 1,5 à 1,9. Sur une flotte de store gateways, ça représente de l'ordre de 1 USD par mois sur 8 à 11 USD de coût d'opérations GCS (tarifs publics de mémoire, à prendre comme des ordres de grandeur).

Côté fraîcheur, aucune donnée n'est ratée à 15 minutes : Receive garde 12h en local et les blocks sources d'une compaction restent servis 24h avant suppression. Revenir à 15 minutes est donc juste, mais ça ne vaut pas un rollout dédié, qui redémarre toutes les store gateways spot avec des caches froids et des index-headers à recharger : on le fait au prochain redémarrage prévu.

Sur une centaine de pods qui listent chacun de leur côté, les 2 arbitrages valent d'être posés.

Les appels à l'object storage sont facturés à la requête et le trafic sortant l'est au volume. Un cache partagé et chaud coupe les 2 et un replica qui redémarre ne repaye pas ce que ses voisins ont déjà téléchargé.

Le `--query-range.split-interval` joue dans le même sens, puisque découper une requête longue en tranches de 12h rend chaque tranche réutilisable, alors que sans découpage une plage un peu différente rate le cache en entier. C'est aussi pour ça que `--query-range.align-range-with-step` compte : aligner les bornes sur le pas fait retomber les requêtes sur les mêmes clés.

!!! tip "Ce qui n'est jamais mis en cache"
    Le query frontend refuse de cacher les requêtes avec `dedup=false`, celles qui portent
    des store matchers, celles en partial response et toute réponse assortie d'un warning.
    Un dashboard qui coche une de ces cases ne bénéficiera jamais du cache, quelle que soit
    la taille qu'on lui donne.

!!! danger "Les requêtes instantanées ne sont pas cachables"
    Il n'existe **aucun** flag de cache pour `/api/v1/query` : les 2 seules familles sont
    `--query-range.response-cache-*` pour `/api/v1/query_range` et `--labels.response-cache-*`
    pour les endpoints de labels. Une instantanée n'est donc ni découpée dans le temps ni
    mise en cache. Elle ne traverse pas le query frontend sans rien subir pour autant :
    `roundtrip.go` définit bien un `newInstantQueryTripperware`, qui fait du sharding
    vertical (`--query-frontend.vertical-shards`) et du retry. La doc upstream, qui dit
    encore *currently only range queries are actually processed through Query Frontend*,
    est en retard sur le code depuis la v0.35.0.

Ce n'est pas un détail. Sur notre flotte, les instantanées représentent **plus de 70 % du trafic** qui atteint le query frontend, l'essentiel venant des évaluations de règles d'alerte. Autrement dit, régler le `split-interval` ou le TTL du cache n'agit que sur moins d'un tiers des requêtes. Avant de tuner le cache, mesurer la part qu'il peut réellement servir.

La nuance à garder : « non caché » porte sur le *résultat*. En dessous, les lectures de blocks profitent toujours de l'index cache et du caching bucket. Et une instantanée sur des données fraîches est servie par Receive, sans jamais toucher une store gateway.

## Voir aussi

- [Thanos at scale : archi, perf et FinOps](thanos.md) - l'architecture, la rétention, le chemin de lecture et le reste de la facture
- [GKE Spot Nodes](../../cloud/gcloud/spot_nodes.md) - pourquoi un cache local rend le spot cher
