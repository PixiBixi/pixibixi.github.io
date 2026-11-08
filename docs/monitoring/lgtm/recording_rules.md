---
description: "Recording rules Prometheus fiables : convention de nommage level:metric:operations, labels gardés ou retirés, joins group_left et group_right, erreurs many-to-many, label de federation, Thanos Ruler, tests promtool et dashboards plus rapides."
tags:
  - Prometheus
  - PromQL
  - Thanos
  - Recording rules
tested_with:
  - "promtool 3.15"
---

# Recording rules : nommage, joins, federation et tests

Une recording rule qui ment est pire qu'une requête lente. Les dashboards et les alertes lisent sa série bien nommée sans se poser de question, alors qu'un label a disparu en route ou qu'un join a silencieusement doublé les valeurs. Les sections suivantes reprennent les pièges rencontrés sur une flotte de clusters : le nom qui dit ce qu'il y a dans la série, les labels qu'on garde, les joins avec `group_left` et `group_right`, le label qui décide si une série remonte vers le Thanos global, l'endroit où évaluer la règle et le test promtool qui la verrouille.

Les règles complètes qui servent d'exemples sont sur [rules.jdelgado.fr](https://rules.jdelgado.fr/), dans les fichiers [k8s.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/k8s.records.yml), [basis.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/basis.records.yml) et [haproxy.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/haproxy.records.yml).

## Nommer : level:metric:operations

La [doc Prometheus](https://prometheus.io/docs/practices/rules/) pose la forme `level:metric:operations` :

- `level` est le niveau d'agrégation, donc les labels qui restent dans la série
- `metric` est le nom de la métrique source, inchangé, sauf le `_total` qu'on retire quand on applique `rate()` ou `irate()`
- `operations` liste les opérations appliquées, la plus récente en premier et on omet `_sum` quand il y en a d'autres

Un `rate` sur 5 minutes agrégé par méthode donne `method:http_errors:rate5m` et le même taux sommé par `job` donne `job:http_errors:rate5m`. Le nom doit permettre de reconstruire l'expression sans ouvrir la règle.

Pour une division, la doc sépare les 2 métriques par `_per_` et nomme l'opération `ratio`. [basis.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/basis.records.yml) garde le suffixe `ratio` sans `_per_`, par exemple `instance:node_memory_available:ratio`. La doc déconseille aussi de moyenner un ratio ou une moyenne, car ce n'est pas statistiquement valide : on agrège le numérateur et le dénominateur séparément, puis on divise.

Garder le nom de la métrique source a un intérêt très concret. Quand un dashboard lit `cluster:apiserver_request:rate5m`, on retrouve la source en 2 secondes. Un nom du genre `app_latency_by_team` ne dit ni le niveau ni l'opération et finit recréé sous un autre nom par quelqu'un qui ne l'a pas trouvé.

## Garder ou retirer des labels

Pour l'agrégation, la doc recommande `without` plutôt que `by` : on liste les labels qu'on retire, tous les autres restent. `sum without (instance) (rate(...))` conserve `job`, `namespace` et tout label ajouté plus tard, alors que `sum by (job)` jette silencieusement tous les autres.

Les 2 formes se défendent, mais pas pour les mêmes séries. Sur une série à cardinalité maîtrisée, `without` est plus sûr. Sur une métrique qui porte des centaines de séries par backend (les labels `server` d'un HAProxy, `container` de cAdvisor), `by` avec une liste explicite est le bon outil : on veut justement borner le résultat. Le commentaire de tête de [haproxy.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/haproxy.records.yml) explique ce choix. Les règles agrègent vers `(namespace, proxy, instance, job)`, avec `code` en plus pour l'une d'elles. Le gain de cardinalité vient de la disparition de `server`, pas d'`instance`. Garder `instance` et `job` rend les records utilisables par les alertes dont les annotations lisent `{{ $labels.instance }}`.

Un record retire donc des labels et chaque label retiré est une question qu'un consommateur ne pourra plus poser. Avant de supprimer un label, on cherche qui le lit :

```bash
# lists every expression that aggregates by pod, to find who reads the label
rg -n 'by \(.*pod' rules/ dashboards/
```

Un record sans consommateur dans le repo des alertes n'est pas forcément mort. Il peut nourrir un dashboard, ce que les commentaires de [k8s.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/k8s.records.yml) rappellent en tête de groupe pour éviter qu'on les supprime sur la foi d'un grep vide.

## Joins : on, ignoring, group_left et group_right

Sans modificateur, une opération binaire associe les séries qui ont exactement les mêmes labels des 2 côtés (le nom de métrique est ignoré). Si les 2 opérandes sont déjà agrégés vers la même clé, c'est tout ce qu'il faut. C'est le cas des divisions de [haproxy.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/haproxy.records.yml), où ajouter `group_left()` serait pire qu'inutile : il masquerait de vraies erreurs de matching.

Quand les labels diffèrent, on les restreint avec `on(...)` (seuls ces labels comptent) ou `ignoring(...)` (tous sauf ceux-là). Quand un côté a plusieurs séries pour une série de l'autre, il faut en plus un modificateur de groupe, selon la [doc des opérateurs](https://github.com/prometheus/prometheus/blob/main/docs/querying/operators.md) :

- `group_left` : le vecteur de gauche a la plus grande cardinalité (le côté « many » est à gauche)
- `group_right` : le vecteur de droite a la plus grande cardinalité

Dans les 2 cas la liste entre parenthèses indique les labels du côté « one » qu'on copie dans le résultat. La doc précise que `ignoring` suffit souvent et que `group_*` est un cas avancé à manier avec précaution.

### La syntaxe qui casse

Quand l'opérande de droite commence par une parenthèse, `group_right` doit être suivi de `()`, même vide. Sans lui, la parenthèse est lue comme la liste des labels à copier et le filtre qui suit est une erreur de parse :

```promql
kube_pod_container_resource_requests{resource="cpu"}
  * on (namespace, pod, container) group_right (kube_pod_container_status_running == 1)
```

promtool répond `parse error: unexpected <op:==> in grouping opts, expected "," or ")"`. La forme correcte porte `()` avant l'opérande :

```promql
kube_pod_container_resource_requests{resource="cpu"}
  * on (namespace, pod, container) group_right ()
  (kube_pod_container_status_running == 1)
```

Ici la gauche (`requests`) est le côté « one » et la droite (`status_running`) est le côté « many » de la doc. On l'a utilisé pour ne garder que les containers qui tournent, avec le filtre `== 1` plutôt qu'une multiplication. `status_running` vaut 0 sur un container en restart, il n'est pas absent. Multiplier par 0 donnait un ratio usage / 0 égal à `+Inf` sur tout un namespace.

### Many-to-many : la clé de match n'est pas unique

Le message à connaître est `found duplicate series for the match group ... many-to-many matching not allowed`. Il tombe quand le côté « one » n'est pas unique sur les labels du `on(...)`. Un cas réel : un `on (pod, container)` sans `namespace`. Un nom de pod est unique dans un namespace, pas dans un cluster. Dès que 2 namespaces avaient un `redis-0`, la règle échouait et avec elle les 4 records du join et les 6 qui en étaient dérivés.

Le problème ne se voit pas en dev, où chaque nom est unique. Il se reproduit en 2 séries dans un test :

```yaml
rule_files:
  - pod.rules.yml

evaluation_interval: 1m

tests:
  - interval: 1m
    name: same pod name in two namespaces
    input_series:
      - series: 'kube_pod_container_resource_requests{resource="cpu",namespace="ns-a",pod="redis-0",container="redis"}'
        values: '2x5'
      - series: 'kube_pod_container_resource_requests{resource="cpu",namespace="ns-b",pod="redis-0",container="redis"}'
        values: '4x5'
      - series: 'kube_pod_container_status_running{namespace="ns-a",pod="redis-0",container="redis"}'
        values: '1x5'
      - series: 'kube_pod_container_status_running{namespace="ns-b",pod="redis-0",container="redis"}'
        values: '0x5'
    promql_expr_test:
      - expr: namespace_pod:kube_pod_container_resource_requests_cpu:sum
        eval_time: 3m
        exp_samples:
          - labels: 'namespace_pod:kube_pod_container_resource_requests_cpu:sum{namespace="ns-a",pod="redis-0"}'
            value: 2
```

Avec `namespace` dans le `on(...)` le test passe. Sans, `promtool test rules` échoue avec le message de duplicate series et la liste des 2 séries en conflit. Le test de la règle réelle, qui couvre aussi le cas du container en restart, est dans [k8s-records.test.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/tests/k8s-records.test.yml).

Les labels qu'une série perd en route comptent aussi. Le `on(...)` doit contenir **tous** les labels qui identifient la série dans le contexte où la règle tourne, y compris le cluster quand plusieurs clusters écrivent dans le même backend (voir la section suivante).

## Le label qui décide ce qui remonte

Sur une flotte, chaque cluster a son Prometheus, qui fait du remote write vers un Thanos ou un store global. Envoyer toutes les séries coûterait trop cher. Une façon de filtrer est de marquer les séries à remonter avec un label, puis de ne garder que celles-là à l'envoi :

```yaml
remote_write:
  - url: https://thanos-receive.example.com/api/v1/receive
    write_relabel_configs:
      - source_labels: [federate]
        regex: "yes"
        action: keep
```

Une recording rule qui doit être visible globalement porte alors `federate: "yes"` dans ses `labels:`. Si le label n'est pas mis, la série existe et se lit très bien sur le Prometheus du cluster, mais n'arrive jamais au global. Le dashboard global affiche « no data » pour un cluster pourtant sain et on cherche un problème de scrape ou de remote write qui n'existe pas.

Il y a 2 dérives symétriques :

- le label manque sur une règle neuve, qui reste locale sans que rien ne le signale
- le label est recopié partout, y compris sur des règles qui n'ont pas besoin d'être globales et le volume remote write monte

Répéter `federate: "yes"` sur chaque règle d'un fichier est un signe de design à revoir. Un `labels:` posé au niveau du groupe s'applique à toutes ses règles. Celui de la règle l'écrase en cas de collision, selon la [doc des règles](https://github.com/prometheus/prometheus/blob/main/docs/configuration/recording_rules.md). Il évite la répétition et un chart Helm peut le déduire du nom du groupe. On regroupe alors les règles par destination (un groupe pour le local, un pour le global) plutôt que par thème.

Le même raisonnement vaut pour les labels de cluster. Évaluée dans un Prometheus de cluster, une règle ne voit que ses séries locales : un `sum` sans `by (k8s_cluster_name)` ne mélange rien. Évaluée sur un backend global, la même règle additionne tous les clusters et le résultat est faux sans que rien n'échoue. Une règle destinée au global garde donc le label de cluster, sauf si elle agrège les clusters exprès.

## Choisir entre Prometheus et Thanos Ruler

Une recording rule s'évalue à 2 endroits possibles, avec 2 vues des données :

- Prometheus évalue les règles sur son propre TSDB. Il ne voit que les séries qu'il scrape, c'est local, rapide et sans dépendance réseau. Un record évalué ici est dans le TSDB du cluster et part au global seulement s'il passe le filtre de remote write
- Thanos Ruler évalue les règles contre un endpoint de requête (`--query`, avec un round robin quand il y en a plusieurs). Il voit tout ce que le Querier voit, donc plusieurs clusters à la fois, ce qui en fait l'endroit où écrire un record qui agrège d'un cluster à l'autre

La [doc de Thanos Ruler](https://thanos.io/tip/components/rule.md/) liste ce qu'il faut savoir avant de lui confier des records :

- les nouvelles séries doivent être lisibles : le Ruler s'expose comme un store du Querier (`--endpoint`), sinon le record est écrit mais introuvable
- les external labels du Ruler (`--label`) sont obligatoires pour distinguer les replicas et ils **remplacent** les labels de même nom de la série source. Un Ruler qui porte `cluster="mon1"` écrase le `cluster="eu1"` d'une série évaluée et on ne sait plus d'où vient la donnée
- en mode stateless, les résultats partent en remote write et le Ruler n'expose plus de StoreAPI

Une règle de ratio par cluster appartient à Prometheus. Une règle qui compare 2 clusters ou calcule un total de flotte appartient au Ruler. Mettre la première au Ruler la rend dépendante du Querier : si celui-ci est lent ou partiellement en panne, le record a des trous. Le `partial_response_strategy` du groupe décide alors si l'évaluation échoue (`abort`, la valeur par défaut, recommandée pour les alertes) ou continue avec un résultat partiel (`warn`). Ce dernier cas est le pire pour un record qu'on croit exact.

La métrique `prometheus_rule_evaluation_failures_total` signale les évaluations qui échouent. Une évaluation en échec laisse un trou dans la série, comme le décrit la doc du Ruler. Le dashboard n'affiche pas d'erreur.

## Accélérer les dashboards

Une recording rule paie quand la même expression coûteuse est lue souvent. La doc précise que c'est surtout utile pour les dashboards, qui relancent la même requête à chaque rafraîchissement. On en écrit une quand :

- l'expression traverse beaucoup de séries (cAdvisor, `container_cpu_usage_seconds_total` agrégé par pod)
- plusieurs panels ou alertes la réutilisent
- l'agrégation retire un label à forte cardinalité

Elle ne paie pas quand l'expression est déjà bon marché ou lue une fois par semaine. Chaque record s'évalue à chaque intervalle du groupe et occupe du stockage. Dans [k8s.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/k8s.records.yml), le groupe tourne en `interval: 1m` sur 2 métriques cAdvisor à forte cardinalité : le coût d'évaluation est réel et assumé parce que des dashboards et des alertes de sous-utilisation en dépendent.

Un dashboard qui lit un record ne peut pas descendre sous l'intervalle d'évaluation ni voir un label retiré. Un panel qui doit détailler par `container` ne peut pas s'appuyer sur un record agrégé par pod. Dans ces cas on garde la requête brute ou on écrit un second record plus fin.

## Tester avec promtool

Valider la syntaxe avec `promtool check rules` est un minimum. Il ne dit rien du résultat. Les erreurs de cet article (many-to-many, `+Inf`, label perdu) passent toutes `check rules` et ne se voient qu'à l'évaluation. `promtool test rules` évalue les règles sur des séries fournies, ce qu'on a vu plus haut avec le cas des 2 namespaces :

```bash
# syntax only: does not catch many-to-many or +Inf, they only show at evaluation
promtool check rules rules/k8s.records.yml
# evaluates the rules on the input series and compares with exp_samples
promtool test rules tests/k8s-records.test.yml
```

Le format des séries d'entrée utilise la notation `valeur+pasxn` : `2x5` donne 6 points à 2 et `_` représente un échantillon manquant. Ce format est décrit dans la [doc des tests de règles](https://github.com/prometheus/prometheus/blob/main/docs/configuration/unit_testing_rules.md). Chaque correction de règle gagne son test, qu'on lance aussi sur l'ancienne version de la règle pour vérifier qu'il échouait bien avant.

Quelques cas qui valent un test :

- 2 séries qui ne diffèrent que par un label qu'un `on(...)` oublie (le cas du namespace)
- une série à 0 plutôt qu'absente, qui change un résultat de division
- une série qui disparaît (`1x2 _x5`), pour voir si le record disparaît avec ou reste figé à la dernière valeur
- le seuil d'un `clamp_min` : un plancher à 1 req/s sous-estime le taux d'erreur de tout backend sous 1 rps (divisé par 2 à 0,5 rps), c'est pourquoi [haproxy.records.yml](https://github.com/PixiBixi/prometheus-rules/blob/main/rules/haproxy.records.yml) met le plancher à 0,01

Les tests se lancent aussi en pre-commit. Prometheus ne recharge ses règles sur `SIGHUP` que si tous les fichiers sont bien formés, donc une seule règle invalide bloque aussi les corrections des autres.
