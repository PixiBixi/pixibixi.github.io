---
description: "Elasticsearch tuné, VictoriaLogs, Loki et ClickStack mesurés sur 10 millions de lignes de logs Kubernetes : disque, CPU d'ingestion, RAM, six requêtes de lecture, avec les pièges match_only_text, LogsDB et le timeout de Loki."
tags:
  - Elasticsearch
  - VictoriaLogs
  - Loki
  - ClickHouse
  - Fluent Bit
  - Vector
  - OpenTelemetry
  - Logging
series: "Logs self-hosted"
series_order: 1
---

# Choisir son backend de logs

Un Elasticsearch qui stocke des logs Kubernetes finit presque toujours par coûter plus en disque qu'en calcul. Le jour où il ne suit plus le débit, le collecteur en amont encaisse sans que personne ne le voie. Les benchmarks publiés par les éditeurs donnent un classement, rarement les réglages qui le font bouger ni ce qui casse en lecture. On compare ici 4 backends sur le même jeu de données, avec un Elasticsearch tuné au mieux, pour savoir ce qu'un changement de stack fait vraiment gagner. VictoriaLogs prend 6 fois moins de disque et 10 fois moins de CPU par ligne ingérée qu'un Elasticsearch laissé par défaut, et encore 4 fois moins de disque et 7 fois moins de CPU qu'un Elasticsearch tuné.

## Le banc de test

Le jeu de données reproduit la sortie d'un Fluent Bit de production devant Elasticsearch : 10 millions de lignes JSON réparties sur 24h, 11,8 Go au total, environ 1,2 Ko par ligne. Le mélange est celui d'une plateforme de streaming : un service d'access logs HTTP (pino-http) pour la moitié des lignes, un service applicatif JSON avec des warnings riches (objets imbriqués, erreur sérialisée), un mock en DEBUG et un service en texte brut. Le JSON applicatif est mergé à la racine (`Merge_Log On`, `Keep_Log Off`) et les métadonnées Kubernetes sont celles du filtre `kubernetes`. Identifiants, sessions et IPs sont aléatoires.

Chaque backend tourne en un seul nœud de 2 CPU et 4 Go de RAM, sur la même machine, avec une base vide à chaque run :

| Backend | Version | Schéma |
|---|---|---|
| Elasticsearch | 8.17.0 | 1 shard, 0 replica, 3 templates (voir plus bas) |
| VictoriaLogs | 1.53.0 | `_stream_fields` sur cluster, namespace et container |
| Loki | 3.7.9 | TSDB v13, labels cluster, namespace, container et level, le reste en structured metadata |
| ClickStack | ClickHouse 26.3 | schéma `otel_logs` de ClickStack, index bloom et tokenbf compris |

Vector charge les données en bulk avec 4 CPU. Un run ne compte que si toutes les lignes arrivent et que Vector ne logge aucune erreur. Le disque se mesure après flush, une fois les merges terminés : un `_cat/indices` lu 30 secondes après le flush annonçait 18 Go pour un index qui en pesait 11 quelques minutes plus tard.

## Le disque et le CPU d'ingestion

| Backend | Lignes/s | Disque / JSON brut | CPU·s par million de lignes | RAM max | RAM au repos |
|---|---|---|---|---|---|
| Elasticsearch, mapping dynamique | 10,6k | 0,94 | 183 | 4,0 GiB | 2,4 GiB |
| Elasticsearch tuné | 13,5k | 0,65 | 131 | 3,7 GiB | 2,4 GiB |
| Elasticsearch LogsDB | 14,6k | 0,40 | 132 | 3,6 GiB | 2,4 GiB |
| VictoriaLogs | 79k | **0,157** | **19** | 0,6 GiB | **55 MiB** |
| Loki | 84k | 0,29 | 13 | 3,9 GiB | 0,2 GiB |
| ClickStack | 37k | 0,149 | 52 | 2,0 GiB | 1,3 GiB |

Le CPU·s par million de lignes est le CPU moyen du conteneur multiplié par la durée du chargement, ramené au million. C'est la colonne qui se transpose en production, le débit brut dépend trop du nombre de cœurs. VictoriaLogs et Loki avalent les 10 millions de lignes en 2 minutes et sont probablement limités par le chargeur : leur débit réel est au moins celui affiché.

VictoriaLogs et ClickStack se tiennent sur le disque, avec 6 fois moins de place qu'un Elasticsearch en mapping dynamique. VictoriaLogs consomme 3 fois moins de CPU que ClickHouse par ligne et presque rien au repos. La RAM d'Elasticsearch est surtout son heap, fixé à 2 Go ici, dont 0,67 Go occupés au repos.

## Six requêtes de lecture

Les requêtes reprennent ce qu'un développeur fait dans Kibana. Chacune est lancée une fois à froid puis 5 fois à chaud. Le tableau donne la médiane à chaud en millisecondes. Les 6 backends renvoient les mêmes résultats.

| Requête | ES dynamique | ES tuné | ES LogsDB | VictoriaLogs | Loki | ClickStack |
|---|---|---|---|---|---|---|
| 100 dernières lignes d'un namespace sur 15 min | 21 | 15 | 17 | 24 | 15 | 7 |
| Un identifiant de session sur 24h | 5 | 3 | 7 | 4 | 9461 | 17 |
| Histogramme 5 min des warnings d'un service | 23 | 11 | 13 | 23 | 311 | 29 |
| Top 10 des messages warn et error | 19 | 7 | 7 | 67 | 544 | 105 |
| Nombre de réponses HTTP 500 | 6 | 3 | 4 | 17 | 5096 | 880 |
| Phrase exacte dans le message, 24h | 15 | 17 | 14874 | 35 | 5515 | 83 |

Elasticsearch, VictoriaLogs et ClickStack répondent sous 100 ms sur presque tout : la lecture ne départage pas ces 3 backends. ClickStack range les attributs dans une colonne `Map`, d'où les 880 ms sur le filtre `statusCode`, qu'une colonne matérialisée corrigerait.

Loki n'indexe que les labels. Chercher une valeur dans le contenu relit tous les chunks de la fenêtre. Chaque recherche sur 24h prend de 5 à 9 secondes alors que les requêtes filtrées par label restent rapides. Pour un usage de type Kibana, où l'on part d'un identifiant de session ou d'un message d'erreur, c'est rédhibitoire.

!!! note "Le benchmark de ClickHouse contre Elasticsearch"
    ClickHouse a publié en mai 2026 [son propre comparatif](https://clickhouse.com/blog/elasticsearch-log-analytics-clickhouse) sur 1 à 50 milliards de logs OpenTelemetry, avec un nœud de 32 vCPU par système. Il mesure 4,95 fois moins de disque que chez un Elasticsearch tuné (mapping explicite, `best_compression`, index sort, force merge), proche des 4,4 fois trouvés sur ce banc. Il ne teste ni LogsDB ni le `_source` synthétique, réservés à la licence Enterprise, alors que ce sont eux qui ramènent l'écart à 2,7 fois. En lecture, il annonce un ClickHouse 2 à 6 fois plus rapide, quand Elasticsearch passe devant ici sur 5 requêtes sur 6 à chaud. Son avantage vient surtout des runs à froid, cache disque vidé, que ce banc ne mesure pas. À chaud, il descend à 1,7 fois sur 50 milliards de lignes, et nos 10 millions de lignes tiennent entières en cache. Le billet ne publie aucun chiffre de débit ni de CPU à l'ingestion, seulement la durée du chargement de 50 milliards de lignes : moins de 4 heures pour ClickHouse, environ 5 jours pour Elasticsearch.

!!! warning "Loki coupe les requêtes à 30 secondes"
    Avec la configuration par défaut, `server.http_server_write_timeout` vaut 30s et Loki ferme la connexion d'une requête plus longue sans réponse d'erreur, `curl` affiche alors un code `000`. Une recherche à froid sur 24h dépasse vite cette limite.

Il faut relever les 2 timeouts HTTP du serveur et `limits_config.query_timeout` :

```yaml title="loki.yaml"
server:
  http_server_write_timeout: 5m
  http_server_read_timeout: 5m
limits_config:
  query_timeout: 5m
```

## Tuner Elasticsearch sans casser la recherche

Le template tuné garde un index par jour et un mapping que Kibana sait lire :

```json title="index template (extrait)"
{
  "settings": {
    "index.codec": "best_compression",
    "index.refresh_interval": "30s",
    "index.translog.durability": "async",
    "index.sort.field": ["@timestamp"],
    "index.sort.order": ["desc"],
    "index.mapping.ignore_malformed": true
  },
  "mappings": {
    "dynamic_templates": [
      {"logline": {"match": "log", "match_mapping_type": "string", "mapping": {"type": "text"}}},
      {"longtext": {"match": ["error", "url"], "match_mapping_type": "string", "mapping": {"type": "match_only_text"}}},
      {"strings": {"match_mapping_type": "string", "mapping": {"type": "keyword", "ignore_above": 1024}}}
    ],
    "properties": {
      "msg": {"type": "text", "fields": {"keyword": {"type": "keyword", "ignore_above": 512}}},
      "labels": {"type": "flattened"},
      "annotations": {"type": "object", "enabled": false}
    }
  }
}
```

Le gain vient surtout des chaînes indexées une seule fois en `keyword`, au lieu du doublon `text` plus `.keyword` du mapping dynamique. Les labels Kubernetes en `flattened` évitent en plus un champ par clé de label. Le disque passe de 0,94 à 0,65 fois le JSON brut et l'ingestion gagne 27 %.

### Le piège de `match_only_text`

`match_only_text` ne stocke ni fréquences ni positions. Sur `msg`, il descend encore le disque à 0,51. En contrepartie, une recherche de phrase doit relire le `_source` de chaque document candidat pour vérifier l'ordre des mots, et elle passe de 17 ms à 6,6 secondes sur 24h. Il se réserve aux champs longs où personne ne cherche de phrase, ici `error` et `url`.

### LogsDB demande une licence Enterprise

Le mode `index.mode: logsdb` descend à 0,40 grâce au synthetic source, qui reconstruit le document au lieu de le stocker. Le synthetic source est une fonctionnalité de la licence Enterprise : en licence Basic, l'index reste en source stockée et le gain disparaît en grande partie. Les chiffres ci-dessus ont été mesurés avec une licence d'essai. LogsDB hérite en plus du coût de `match_only_text` sur les phrases, qui montent à 15 secondes.

Même tuné, Elasticsearch reste 4 fois plus gros sur disque que VictoriaLogs et consomme 7 fois plus de CPU par ligne ingérée.

## Les collecteurs

Fluent Bit, Vector et OTel Collector sont passés sur la même chaîne de traitement. À un débit réaliste par nœud, ils coûtent tous moins de 0,2 cœur, donc changer de collecteur ne fait pas gagner de ressources. Quand le backend ralentit, en revanche, un Fluent Bit à buffer plafonné évicte des chunks et ne le signale que par un warning. Sur notre test, il a perdu 23 % des lignes. La perte, l'option qui la supprime et le cas de vlagent ont [leur propre page](log-collectors.md).

## Ce qui ne se mesure pas sur un nœud

Le banc compare des moteurs sur un seul nœud. Le choix final se joue aussi sur l'architecture de chaque stack, qu'il ne mesure pas :

| | Elasticsearch | VictoriaLogs | Loki | ClickStack |
|---|---|---|---|---|
| Haute disponibilité | replicas natifs | pas de réplication, 2 instances alimentées en double | réplication des ingesters | ClickHouse Keeper et replicas |
| Stockage objet | snapshots | non | natif | en tiering |
| Interface | Kibana | vmui, plugin Grafana, LogsQL | Grafana Explore, LogQL | HyperDX, SQL |
| Licence | Elastic, LogsDB en Enterprise | Apache 2.0 | AGPL | Apache 2.0, MIT pour HyperDX |

VictoriaLogs gagne sur le disque, le CPU et la RAM, avec des lectures au niveau d'Elasticsearch. Il demande d'organiser soi-même la haute disponibilité et de garder les données sur des disques bloc. Ses utilisateurs doivent en plus apprendre LogsQL. ClickStack est l'alternative quand on veut du SQL et les traces au même endroit, au prix de plus de RAM et de plus de composants à opérer.

## Voir aussi

- [Choisir son collecteur de logs](log-collectors.md), l'éviction silencieuse et les 3 collecteurs comparés sur le même banc
- [VictoriaMetrics cluster](../victoriametrics.md), le pendant métriques de ce comparatif
- [Logs HAProxy dans Fluent Bit](../../web/haproxy/logs_fluentbit.md) pour les parsers HAProxy utilisés dans la chaîne
- [Alerting Loki](../lgtm/loki_alerting.md)
- [Structured log ingestion benchmark](https://victoriametrics.com/blog/structured-log-ingestion-benchmark/), le benchmark de VictoriaMetrics, qui donne le même classement disque et RAM avec des requêtes limitées à 1h
