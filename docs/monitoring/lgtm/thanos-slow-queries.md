---
description: "Retrouver qui envoie les slow queries à Thanos et pourquoi elles sont lentes : slow query log du query frontend, headers Grafana, tracing OTLP vers Tempo, tail sampling pour ne garder que les traces lentes et lecture d'une trace de bout en bout."
tags:
  - Thanos
  - Tracing
  - Tempo
  - OpenTelemetry
  - Observability
series: "Thanos at scale"
series_order: 4
tested_with:
  - "Thanos 0.42"
---

# Les slow queries Thanos : slow log, tracing et tail sampling

Une store gateway saturée ou un querier qui monte en RAM disent que quelque chose est lent, pas qui l'a demandé ni pourquoi. Sur une plateforme partagée, la requête coupable est souvent un panel de dashboard sur un gros timerange que les métriques agrégées ne montrent pas. Le slow query log du query frontend la nomme avec son dashboard. Une trace distribuée montre où elle passe son temps entre le query frontend, le querier et les store gateways.

Cet article part du log pour arriver à la trace. Le tracing échantillonné à 0,1 % rate presque toutes les requêtes lentes, d'où la section sur le tail sampling. Le reste de la plateforme est décrit dans [Thanos at scale](thanos.md). La mécanique de saturation qui rend ces requêtes visibles est décrite dans [la concurrence de lecture](thanos-query-concurrency.md).

## Identifier le client avec le slow query log

Le query frontend loggue toute requête plus lente qu'un seuil, avec de quoi remonter jusqu'au panel Grafana. Le flag est désactivé par défaut (`0`) et une valeur négative loggue toutes les requêtes.

```yaml
args:
  - query-frontend
  - --query-frontend.log-queries-longer-than=10s
  - --query-frontend.slow-query-logs-user-header=X-Grafana-User
```

Le log est émis une fois la réponse terminée, y compris quand la requête échoue ou expire. Seuls les chemins en `/api/v1` sont concernés. Chaque ligne `slow query detected` porte ces champs (`internal/cortex/frontend/transport/handler.go`) :

- `method`, `host` et `path` : la requête HTTP reçue
- `time_taken_ms` : la durée mesurée par le query frontend, cache compris
- `grafana_dashboard_uid` et `grafana_panel_id` : lus dans les headers `X-Dashboard-Uid` et `X-Panel-Id`, `-` s'ils sont absents
- `remote_user` : le header donné à `--query-frontend.slow-query-logs-user-header`, sinon l'utilisateur du basic auth
- `remote_addr` : l'adresse qui a ouvert la connexion
- `trace_id` : lu dans le header de réponse `X-Thanos-Trace-Id`, `-` s'il est absent. Le header porte l'ID même quand la trace n'est pas échantillonnée, l'ID ne garantit donc pas que la trace existe dans Tempo
- `param_query`, `param_start`, `param_end`, `param_step` : tous les paramètres de la requête, préfixés par `param_`
- `query_range_hours` et `query_range_human` : l'étendue demandée, quand `start` et `end` sont présents
- `peak_samples` et `total_samples_loaded` : en plus, avec `--query-frontend.query-stats-enabled`

Les 2 headers `X-Dashboard-Uid` et `X-Panel-Id` sont ajoutés par Grafana aux requêtes qu'il envoie à ses datasources ([middleware de tracing du backend](https://github.com/grafana/grafana/blob/main/pkg/services/pluginsintegration/clientmiddleware/tracing_header_middleware.go)). Rien à activer côté Thanos, mais un proxy ou un ingress placé entre Grafana et le query frontend ne doit pas les retirer. `X-Grafana-User` est différent : Grafana ne l'envoie que si `send_user_header = true` dans la section `[dataproxy]`, désactivé par défaut.

!!! warning "Thanos ne loggue pas le User-Agent"
    Aucun champ `user_agent` dans le slow log : le handler ne lit que les headers listés plus haut. Pour un client qui n'est pas Grafana (un script, un ruler, un outil de BI), on recoupe `remote_addr` et `remote_user` avec le log d'accès de l'ingress, qui lui sait loguer le User-Agent.

On remonte ensuite de la ligne au dashboard avec l'UID (`/d/<uid>`), puis au panel avec son ID, puis on recoupe avec `param_query` pour confirmer qu'il s'agit bien de la bonne requête.

Les logs des query frontends doivent d'abord arriver quelque part où on peut les chercher. Sur la plateforme décrite ici, ils n'arrivaient pas dans Loki et on ne s'en est aperçu qu'en cherchant la première ligne `slow query detected`. Une requête LogQL de contrôle avant de se fier au log évite ce faux négatif.

## Rejouer ou tracer

Une ligne de log donne la requête, pas la raison de sa lenteur. 2 chemins existent pour obtenir la trace, selon que la requête se reproduit ou non.

| | Rejouer avec le header de force | Tail sampling |
|---|---|---|
| Principe | on relance la requête avec `X-Thanos-Force-Tracing` | on garde toutes les traces lentes, quoi qu'il arrive |
| Infra à ajouter | aucune | un Collector OpenTelemetry avec état |
| Voit une lenteur intermittente | non | oui |
| Coût | nul | CPU, RAM et réseau pour tous les spans |

Le header marche sur n'importe quel composant : une requête qui le porte est tracée quel que soit le sampler configuré ([docs/tracing.md](https://github.com/thanos-io/thanos/blob/main/docs/tracing.md)). Avec l'exporter OTLP, c'est le sampler enveloppé par `SamplerWithOverride` (`pkg/tracing/otlp/otlp.go`) qui force la décision. La commande rejoue une `query_range` relevée dans le slow log, avec une valeur ajoutée à la requête pour contourner le [cache de résultats](thanos-cache.md) du query frontend.

```console
$ curl -sG 'https://thanos-query.example.com/api/v1/query_range' \
    -H 'X-Thanos-Force-Tracing: true' \
    --data-urlencode 'query=sum(rate(http_requests_total[5m])) + 0' \
    --data-urlencode 'start=1760000000' \
    --data-urlencode 'end=1760604800' \
    --data-urlencode 'step=300' \
    -D - -o /dev/null | rg -i 'x-thanos-trace-id'
X-Thanos-Trace-Id: 4bf92f3577b34da6a3ce929d0e0e4736
```

Rejouer ne reproduit que les lenteurs déterministes. Une requête lente parce qu'une store gateway venait de redémarrer et rechargeait ses index-headers sort en quelques secondes sur un pod déjà chaud ([lazy load](thanos.md)). Pour ces cas, seul le tail sampling garde la trace de la vraie requête. Avant de monter quoi que ce soit, on rejoue donc 2 ou 3 slow queries récentes. Si elles restent lentes, le header suffit. Si elles sortent vite, la lenteur dépend de l'état de la plateforme à un instant donné.

## Envoyer les traces des composants vers Tempo

Chaque composant Thanos exporte ses spans avec `--tracing.config` (YAML en ligne) ou `--tracing.config-file`. Le client OTLP émet en `http` ou en `grpc`, vers un collector ou directement vers Tempo.

```yaml
args:
  - store
  - |
    --tracing.config=type: OTLP
    config:
      client_type: http
      service_name: thanos_storegateway_prod
      endpoint: otel-collector.example.com
      sampler_type: traceidratiobased
      sampler_param: "0.001"
      retry_config:
        retry_enabled: true
```

Le `service_name` est ce qui permet ensuite de filtrer par composant et par stack dans Tempo. Avec plusieurs stacks Thanos sur le même backend, on le suffixe pour ne pas mélanger leurs traces.

`sampler_type` accepte 6 valeurs, insensibles à la casse : `alwayssample`, `neversample`, `traceidratiobased`, `parentbasedalwayssample`, `parentbasedneversample` et `parentbasedtraceidratiobased`. Les variantes `parentbased` suivent la décision du composant en amont, les autres décident seules.

!!! warning "Un sampler mal orthographié échantillonne tout"
    Dans `getSampler`, un `sampler_type` inconnu (`always_on`, par exemple) ne produit aucune erreur et retombe sur un sampler à parent avec un ratio de 1,0, soit 100 % des traces qui n'ont pas de parent. Seul un `sampler_param` non numérique est signalé dans les logs. Le démarrage du pod ne prouve donc pas que la valeur est bonne.

Sur une requête, le query frontend est la racine : le querier et les store gateways reçoivent son contexte et, avec un sampler `parentbased*`, suivent sa décision.

## Tracer les slow queries sans tout échantillonner

À 0,001, le sampler garde 1 requête sur 1000 et décide **au premier span**, avant de savoir si la requête sera lente. C'est un head sampling. Il garde donc les requêtes lentes avec la même probabilité que les autres : un panel qui lance 1 requête lente par minute a peu de chances d'être tracé dans la journée.

Pour tracer toutes les slow queries, la décision doit passer à la fin de la trace, quand la durée est connue. C'est le rôle du processor `tail_sampling` d'un Collector OpenTelemetry, avec 3 changements :

- le query frontend passe en `alwayssample` et produit un span racine pour chaque requête
- querier et store gateways passent en `parentbasedtraceidratiobased`, qui enregistre les spans d'une trace que la racine a décidé de garder
- un Collector reçoit tous les spans, décide trace par trace et n'exporte vers Tempo que ce qui passe ses policies

Le compactor et les composants sans requête racine restent sur leur échantillonnage de base. Côté Thanos, les 2 samplers existent depuis la v0.35.0 (PR #7231) et démarrent sans erreur en v0.42.4, la version qu'on fait tourner. Le query frontend garde son slow log et passe le sampler en `alwayssample` :

```yaml
args:
  - query-frontend
  - --query-frontend.log-queries-longer-than=10s
  - |
    --tracing.config=type: OTLP
    config:
      client_type: http
      service_name: thanos_query_frontend_prod
      endpoint: otel-collector-thanos.example.com
      sampler_type: alwayssample
      retry_config:
        retry_enabled: true
```

Côté Collector, 3 policies suffisent. Le processor retient une trace si **au moins une** policy la juge à garder ([README du tail sampling](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)).

```yaml
processors:
  tail_sampling:
    decision_wait: 120s
    num_traces: 50000
    policies:
      - name: slow-queries
        type: latency
        latency:
          threshold_ms: 10000
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 0.1

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp/tempo]
```

Le `threshold_ms` s'aligne sur `--query-frontend.log-queries-longer-than`, pour que chaque ligne du slow log ait sa trace. Les 3 réglages suivants font la différence entre un tail sampling qui marche et un qui ne garde rien.

### Régler decision_wait au-dessus de la durée de la requête

La policy `latency` calcule la durée de la trace à partir des spans **déjà reçus** quand la décision tombe : le plus ancien début contre la fin la plus tardive. Un span n'arrive qu'à sa fin, donc le span racine d'une requête de 10 secondes arrive 10 secondes après son début. Avec un `decision_wait` de 2s, la décision tombe avant, la durée mesurée est inférieure au seuil et la policy ne matche jamais.

On règle donc `decision_wait` au-dessus du seuil, idéalement au niveau du timeout de requête (`--query.timeout`). Le coût est de la mémoire : le Collector garde chaque trace en mémoire pendant ce délai et `num_traces` (50000 par défaut) borne le nombre de traces gardées.

!!! warning "Ne pas imposer ce délai à un Collector partagé"
    Passer `decision_wait` de 2s à 2 minutes sur un Collector qui reçoit aussi le trafic d'autres applications multiplie par 60 le temps de rétention en mémoire de toutes leurs traces. Un Collector dédié aux composants Thanos isole le coût.

### Envoyer toute la trace vers un seul Collector

Le processor est stateful : tous les spans d'une trace doivent arriver sur la même instance. Avec plusieurs replicas derrière un load balancer, chacun voit un morceau de la trace et décide sur un fragment dont la durée est fausse. La doc amont propose 2 couches : une avec le `loadbalancing` exporter, qui route par trace ID, puis une avec le tail sampling.

La contrainte est réelle ici, puisqu'une requête qui traverse une vingtaine de stacks produit des spans depuis autant de pods différents. Pour un volume modeste, 1 seul replica dédié évite la couche de routage, au prix de perdre le buffer en cours (la durée de `decision_wait`) à chaque redémarrage.

### Ne pas jeter les grosses traces avec rate_limiting

Si le Collector réutilisé a une policy `rate_limiting` en garde-fou, elle compte les spans de la trace entière. Sa capacité de burst vaut par défaut 2 fois `spans_per_second`. Une trace dont le nombre de spans dépasse cette capacité n'est jamais gardée (`rate_limiting.go` : « A single trace whose span count exceeds the burst capacity will not pass »). Une requête globale fait beaucoup de spans. Un Collector réglé pour des traces de 20 spans jette donc silencieusement les traces les plus intéressantes.

### Limites restantes

- les requêtes qui n'entrent pas par un query frontend (appel direct au querier, ruler) gardent leur échantillonnage de base, puisque la racine n'est pas en `alwayssample`
- Tempo rejette ce qui dépasse sa limite par trace (`max_bytes_per_trace`) : une slow query globale avec ses requêtes PromQL en attributs peut la dépasser et la trace est alors tronquée
- le SDK a une file d'export de taille fixe : un pod très chargé en `alwayssample` peut jeter des spans et la trace est alors gardée avec des trous
- une requête dont presque tous les spans arrivent plus de `decision_wait` après le premier peut passer à travers

Le volume se mesure avant de basculer. Sur une vingtaine de stacks, l'ordre de grandeur était de quelques centaines de spans par seconde en moyenne sur le chemin de requête, avec des pics 5 à 10 fois plus hauts, de quoi dimensionner un seul pod et pas un cluster de Collectors. Pour vérifier après coup que la policy fait son travail, on compare les traces gardées aux lignes du slow log sur la même période. La métrique du Collector donne le nombre de traces gardées par policy :

```promql
sum by (policy) (otelcol_processor_tail_sampling_count_traces_sampled{decision="sampled"})
```

## Lire une trace de bout en bout

Une trace de `query_range` lente se lit de haut en bas, en cherchant le span qui porte la durée. Le `trace_id` du slow log ouvre directement la trace dans Tempo, si elle a été gardée. Sans lui, une recherche TraceQL retrouve les traces lentes d'un composant sur la plage de temps du dashboard.

```text
{ resource.service.name =~ "thanos_query_frontend.*" && duration > 10s }
```

Sur le chemin d'une requête, les spans qui comptent sont :

- `/<nom> HTTP[server]`, par exemple pour `query_range` : la requête vue par le query frontend (nom construit dans `pkg/tracing/http.go`). Ses enfants montrent le découpage en sous-requêtes et leur parallélisme
- `querier_select` : la sélection de séries côté querier, qui contient le fan-out vers les store endpoints
- `store_query_gate_ismyturn` : l'attente de la gate de la store gateway. Un span long ici signale une saturation, pas un bucket lent. Le traitement relève de [la concurrence de lecture](thanos-query-concurrency.md)
- `bucket_store_preload_all` : le téléchargement des postings et des chunks depuis le cache ou le bucket
- `bucket_store_block_series` : le travail par block (span retiré de la branche principale de Thanos, pas encore dans une release : la v0.42.5 l'émet encore). Beaucoup de ces spans en parallèle indiquent une requête qui touche beaucoup de blocks, donc un timerange large ou un shard mal découpé ([un shard par timerange](thanos.md#un-shard-par-timerange))
- `bucket_store_merge_all` : la fusion des résultats de tous les blocks

Ces noms viennent de `pkg/store/bucket.go` et `pkg/query/querier.go` à la v0.42.4 et peuvent changer d'une version à l'autre.

Le diagnostic revient à chercher le plus gros span, puis à savoir si c'est du temps d'attente ou du temps de travail. Un gros `store_query_gate_ismyturn` pointe vers la concurrence. Un `bucket_store_preload_all` dominant pointe vers le [cache](thanos-cache.md) ou le débit du bucket. Un grand nombre de `bucket_store_block_series` pointe vers l'étendue de la requête, que le slow log donne déjà via `query_range_hours`.

## Relier slow log, dashboard et traces

Le slow log donne la requête et le panel, Tempo donne la cause. Pour que le lien soit direct plutôt qu'à reconstituer à la main, 2 éléments de dashboard sont utiles :

- un panel Tempo en table avec la requête TraceQL ci-dessus sur la plage de temps du dashboard : un clic sur une ligne ouvre la trace
- une annotation sur les panels de latence du query frontend qui marque les moments où des slow queries ont eu lieu

Le plugin Tempo ne sert pas d'annotations : son `plugin.json` déclare `"annotations": false`, dans le core Grafana comme dans le [plugin externe](https://github.com/grafana/grafana-tempo-datasource) qui le remplace depuis Grafana 13.2. L'annotation se calcule donc depuis des métriques. Un `spanmetrics` connector placé **avant** le processor de tail sampling dans le pipeline compte toutes les requêtes (échantillonnées ou non) et fournit la série de durée dont on déduit le nombre de requêtes au-dessus du seuil.

Cette annotation indique qu'il y a eu des slow queries à un moment donné. Elle ne donne pas leur nombre exact : si le connector agrège sans le nom du span, les spans enfants d'une requête lente qui dépassent aussi le seuil sont comptés en plus. Une annotation Prometheus ne peut pas porter de lien vers une trace.

## Voir aussi

- [Thanos at scale : archi, perf et FinOps](thanos.md) - l'architecture, le sharding par timerange et le lazy load des index-headers
- [Les caches Thanos](thanos-cache.md) - le cache de résultats que le replay doit contourner
- [La concurrence de lecture Thanos](thanos-query-concurrency.md) - la saturation des gates, que le slow log et les traces permettent de relier à un dashboard
