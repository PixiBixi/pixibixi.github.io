---
description: "Mutualiser les caches Thanos sur un backend partagé : index cache, caching bucket et cache de résultats, dimensionnement réel contre taille IN-MEMORY, Memcached ou Redis, et ce que ça change sur la facture."
tags:
  - Thanos
  - Cache
  - Redis
  - Observability
  - FinOps
---

# Les caches Thanos : mutualisation, dimensionnement et facture

Thanos a 3 caches et par défaut ils sont tous les 3 en mémoire du process. Sur une
vingtaine de stacks ça fait une centaine de pods qui portent chacun le sien, personne ne
partage rien et tout est perdu au premier redémarrage. Cet article part de ce constat et
va jusqu'au backend partagé : pourquoi mutualiser, ce qui ne se mutualise pas, comment
dimensionner sans recopier une taille qui ne veut rien dire et ce que ça donne sur la
facture.

Le reste de la plateforme est décrit dans [Thanos at scale](thanos.md), dont cet article
était une section avant de devenir trop gros pour y rester.

Thanos a 3 caches et par défaut ils sont tous les 3 en mémoire du process :

- l'index cache de la store gateway (`--index-cache.config`), qui garde les postings et les séries
- le caching bucket (`--store.caching-bucket.config`), qui garde les sous-plages de chunks et les métadonnées de blocks
- le cache de résultats du query frontend (`--query-range.response-cache-config`), qui garde les réponses de requêtes

En `IN-MEMORY`, chaque replica a le sien, personne ne partage rien et tout est perdu au premier redémarrage. À une stack par cluster ça se chiffre vite, puisque 3 shards et 2 replicas chacun sur une vingtaine de stacks font de l'ordre de la centaine de pods, chacun portant son 1 Gio d'index cache et ses 2 Gio de caching bucket. La store gateway finit autour de 230 Gio de RAM pour moins d'un cœur de CPU, ce qui dit assez qu'on paye du cache et pas du calcul.

Et c'est là que ça rejoint le choix du spot. Une éviction ne coûte rien en compute, c'est tout l'intérêt, mais avec un cache en mémoire elle coûte le cache. Le pod revient froid et repart pour de longues minutes avant d'être utile. Le cache local est ce qui rend le spot cher.

Un backend partagé règle les 2 problèmes d'un coup. Un seul cache chaud pour tous les replicas, qui survit aux évictions, et une seule enveloppe mémoire au lieu de 100.

!!! warning "Le cache IN-MEMORY n'expire jamais"
    `validity` n'est pas une éviction, c'est un contrôle de péremption **à la lecture**. Rien
    ne supprime les entrées : le cache grossit depuis le démarrage du pod jusqu'à buter sur
    son plafond, en accumulant des entrées trop vieilles pour être servies. On mesure 0
    éviction pendant que le nombre d'entrées triple.

Ce qui fait qu'une taille de cache IN-MEMORY ne mesure pas un working set, elle mesure **depuis combien de temps le pod tourne**. En basculant sur un backend Redis avec un vrai TTL, on a vu le cache tomber à un dixième du nombre d'entrées et le hit ratio **monter** de 76 à 91 %. Les 90 % d'entrées en trop étaient du poids mort : périmées, incapables de servir un hit et occupant la RAM quand même.

Corollaire pratique : ne jamais dimensionner un cache partagé sur la taille observée du cache IN-MEMORY qu'il remplace. On surdimensionne d'un ordre de grandeur.

## Le caching bucket ne se partage pas entre tenants

« Un seul cache pour toute la flotte » a une limite qui n'est pas dans la doc et qui se paye
comptant. Le caching bucket ne garde pas que des sous-plages de chunks, il garde aussi **le
résultat de l'itération des blocks**, avec son TTL propre `blocks_iter_ttl`, à côté de
`metafile_exists_ttl`, `metafile_doesnt_exist_ttl` et `metafile_content_ttl`.

Les clés de chunks portent l'ULID du block, unique globalement, donc 2 tenants ne peuvent
pas s'y marcher dessus. La clé du listing est le chemin du répertoire, identique pour tout
le monde puisque c'est la racine du bucket, alors que chaque tenant a son propre bucket
objet. Un tenant lit donc la liste de blocks d'un autre, part chercher ces ULID chez lui, ne
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

La taille à viser est le **working set sur la fenêtre du TTL**, pas la taille actuelle du cache, qui ne dit que le plafond qu'on lui a donné. Le proxy se calcule sur le volume d'admission : `increase(items_added_total[TTL])` multiplié par la taille moyenne d'une entrée. Deux pièges.

Le premier est de lire ça sur un instantané. Un `increase` pris à un moment donné est un point au hasard et il sous-estime lourdement les stacks en dents de scie : sur l'un des nôtres, 0,24 Gio en snapshot contre 9 Gio au P95 du glissant sur 24h. Facteur 37. Il faut le **P95 de la fenêtre TTL glissante sur 24h au minimum**, donc une subquery avec un pas explicite - une subquery sans pas est un moyen fiable de faire tomber le querier.

Le second est le facteur de déduplication. Il est tentant de diviser par le nombre de pods, mais des store gateways shardées cachent des blocks **disjoints** : seuls les replicas d'un même shard cachent la même chose. Avec 3 shards et 2 replicas, on divise par 2, pas par 6. Se tromper là sous-dimensionne d'un facteur 3.

Et le résultat reste une borne haute, parce qu'un cache qui évicte réadmet en boucle les mêmes clés et gonfle le compteur d'admissions. Le vrai working set se trouve en montant le plafond par paliers jusqu'à ce que le taux d'éviction s'effondre. Le plateau, c'est la réponse.

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
- `evicted_keys_total` et `expired_keys_total` sont **déclarés sans valeur** tant qu'ils valent zéro. Prometheus n'ingère donc aucune série et un panneau affiche « No data » là où on attend 0, ce qui rend « rien évicté » indiscernable de « métrique cassée ». En attendant, le signal d'éviction utilisable est la mémoire utilisée qui rejoint `maxmemory`.

La configuration est la même forme pour les 3 caches. Pour la store gateway :

```yaml
# --index-cache.config
type: REDIS
config:
  addr: "redis-sentinel.<namespace>.svc.cluster.local:26379"
  master_name: "thanos-cache"
  dial_timeout: 5s
  read_timeout: 3s
  write_timeout: 3s
  max_get_multi_concurrency: 100
  cache_size: 0
enabled_items: []
ttl: 24h
```

Et pour le query frontend, le même fichier se branche sur les 2 endpoints :

```yaml
args:
  - --query-range.response-cache-config-file=/etc/thanos/redis.yml
  - --labels.response-cache-config-file=/etc/thanos/redis.yml
```

!!! warning "Le piège du failover Sentinel"
    Après une bascule, les composants Thanos continuent de parler à l'ancien master, devenu
    replica et on récolte des `can't write against a read only replica`. Il faut pointer
    Thanos sur le service Sentinel et renseigner `master_name`, pour que le client demande
    à Sentinel qui est le master courant au lieu de le supposer.

Sur Sentinel 6.2 et plus, activer aussi `sentinel resolve-hostnames yes`, sinon les IP des
replicas s'accumulent dans la liste des slaves.

Un mot sur `cache_size` : à une valeur non nulle, il active un cache côté client par-dessus le cache Redis. Utile quand les mêmes clés reviennent en boucle, ce qui est exactement le cas d'un dashboard rafraîchi toutes les 30 secondes.

## Le gain côté facture

Le listing du bucket est un poste à part. Chaque replica de store gateway découvre les nouveaux blocks de son côté et 2 flags pilotent ce que ça coûte.

`--block-discovery-strategy` décide comment on liste. La stratégie `concurrent`, celle par défaut, lance un appel par répertoire et fait donc N+1 requêtes. La stratégie `recursive` itère sur tout le bucket : moins d'appels, mais une itération plus lente.

`--sync-block-duration` décide à quelle fréquence, 15 minutes par défaut. L'allonger divise mécaniquement le nombre d'appels, au prix d'un block qui devient interrogeable plus tard. C'est un compromis moins cher qu'il n'y paraît, parce que la donnée fraîche est servie par Receive et que le shard le plus récent de la store gateway ne démarre qu'à 3 heures.

Sur une centaine de pods qui listent chacun de leur côté, les 2 arbitrages valent d'être posés.

Les appels à l'object storage sont facturés à la requête et le trafic sortant l'est au volume. Un cache partagé et chaud coupe les 2 et un replica qui redémarre ne repaye pas ce que ses voisins ont déjà téléchargé.

Le `--query-range.split-interval` joue dans le même sens, puisque découper une requête longue en tranches de 12h rend chaque tranche réutilisable, alors que sans découpage une plage un peu différente rate le cache en entier. C'est aussi pour ça que `--query-range.align-range-with-step` compte : aligner les bornes sur le pas fait retomber les requêtes sur les mêmes clés.

!!! tip "Ce qui n'est jamais mis en cache"
    Le query frontend refuse de cacher les requêtes avec `dedup=false`, celles qui portent
    des store matchers, celles en partial response et toute réponse assortie d'un warning.
    Un dashboard qui coche une de ces cases ne bénéficiera jamais du cache, quelle que soit
    la taille qu'on lui donne.

!!! danger "Les requêtes instantanées ne sont pas cachables du tout"
    Le query frontend n'a de tripperware que pour 2 familles : `--query-range.response-cache-*`
    pour `/api/v1/query_range` et `--labels.response-cache-*` pour les endpoints de labels.
    Il n'existe **aucune** famille `query-instant` et aucun flag de cache pour `/api/v1/query`.
    Les requêtes instantanées ne sont ni découpées ni cachées : elles traversent directement
    vers le querier.

Ce n'est pas un détail. Sur notre flotte, les instantanées représentent **plus de 70 % du trafic** qui atteint le query frontend, l'essentiel venant des évaluations de règles d'alerte. Autrement dit, régler le `split-interval` ou le TTL du cache n'agit que sur moins d'un tiers des requêtes. Avant de tuner le cache, mesurer la part qu'il peut réellement servir.

La nuance à garder : « non caché » porte sur le *résultat*. En dessous, les lectures de blocks profitent toujours de l'index cache et du caching bucket. Et une instantanée sur des données fraîches est servie par Receive, sans jamais toucher une store gateway.

## Voir aussi

- [Thanos at scale : archi, perf et FinOps](thanos.md) - l'architecture, la rétention, le chemin de lecture et le reste de la facture
- [GKE Spot Nodes](../../cloud/gcloud/spot_nodes.md) - pourquoi un cache local rend le spot cher
