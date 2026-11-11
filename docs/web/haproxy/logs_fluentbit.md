---
description: "Parser les logs HTTP de HAProxy avec Fluent Bit : regex haproxy_http compatible IPv6, lignes d'erreur de connexion, termination state, métriques log_to_metrics et alertes 4xx, vraie IP client derrière un load balancer."
tags:
  - HAProxy
  - Fluent Bit
  - Logging
  - Monitoring
---

# Logs HAProxy dans Fluent Bit : parsing IPv4 et IPv6, métriques et alertes

La regex de logs HAProxy qu'on trouve sur la plupart des blogs ne lit que les clients IPv4. Les lignes IPv6 restent du texte brut sans aucune erreur, ce qui fausse tout ce qu'on calcule dessus (ratio de 4xx, taux d'erreur). On construit ici 2 parsers Fluent Bit (`haproxy_http` et `haproxy_conn_error`) qui lisent les 2 familles d'adresses, on les branche dans un pipeline, on en tire des métriques et des alertes, puis on règle la question de la vraie IP client derrière un load balancer.

On suppose HAProxy dans un conteneur qui écrit ses logs sur stdout et Fluent Bit en DaemonSet qui les lit avec `tail`.

## Sortir les logs de HAProxy

HAProxy sait écrire sur stdout sans passer par syslog. Le format `raw` évite le préfixe syslog : la ligne arrive telle que la décrit la section 8.2.3 de la documentation.

```haproxy
global
    log stdout format raw local0 info

defaults
    mode http
    log global
    option httplog
```

`option httplog` active le format HTTP complet. C'est l'équivalent exact de ce `log-format` :

```haproxy
log-format "%ci:%cp [%tr] %ft %b/%s %TR/%Tw/%Tc/%Tr/%Ta %ST %B %CC %CS %tsc %ac/%fc/%bc/%sc/%rc %sq/%bq %hr %hs %{+Q}r"
```

Une ligne ressemble à ceci, avec la liste des champs de la [documentation HAProxy](https://docs.haproxy.org/3.4/configuration.html#8.2.3) :

```text
192.0.2.10:33317 [01/Nov/2026:12:14:14.655] http-in api/api-01 10/0/30/69/109 200 2750 - - ---- 1/1/1/1/0 0/0 {api.example.com} {} "GET /v1/health HTTP/1.1"
```

Les champs captés (`{api.example.com}`) n'existent que si le frontend déclare des `capture request header`. Le parser doit donc les traiter comme optionnels.

!!! note "Volume des logs"
    `option dontlog-normal` fait disparaître les 4xx des logs. Un parser de 4xx n'a rien à lire dans ce cas, voir [Réduire le volume de logs](performance_tuning.md#reduire-le-volume-de-logs).

## Parser les requêtes HTTP, IPv6 compris

Le parser `haproxy_http` colle à la liste de champs de HAProxy, avec un groupe nommé par champ. Fluent Bit utilise Onigmo en mode Ruby, avec la syntaxe `(?<nom>...)` et des noms limités aux caractères alphanumériques et au `_` ([doc regex parser](https://docs.fluentbit.io/manual/pipeline/parsers/regular-expression)).

```yaml title="parsers.yaml"
parsers:
  - name: haproxy_http
    format: regex
    regex: '^(?<client_ip>\S+):(?<client_port>\d+) \[(?<time>[^\]]+)\] (?<frontend>\S+) (?<backend>[^/ ]+)/(?<server>\S+) (?<tr>-?\d+)/(?<tw>-?\d+)/(?<tc>-?\d+)/(?<tr_resp>-?\d+)/(?<ta>\+?\d+) (?<status>-?\d+) (?<bytes>\+?\d+) (?<req_cookie>\S+) (?<res_cookie>\S+) (?<tstate>[A-Za-z-]{2})(?<cstate>[A-Za-z-]{2}) (?<actconn>\d+)/(?<feconn>\d+)/(?<beconn>\d+)/(?<srv_conn>\d+)/(?<retries>\+?\d+) (?<srv_queue>\d+)/(?<be_queue>\d+)(?: \{(?<req_headers>[^}]*)\})?(?: \{(?<res_headers>[^}]*)\})? "(?<request>.*)"$'
    time_key: time
    time_format: '%d/%b/%Y:%H:%M:%S.%L'
    time_zone: Etc/UTC
    types: tr:integer tw:integer tc:integer tr_resp:integer
```

Quelques choix qui comptent :

- `client_ip` vaut `\S+` suivi de `:` et du port : le premier quantificateur est gourmand, il avale tout puis recule jusqu'au dernier `:`, ce qui donne la bonne coupure pour `192.0.2.10:33317` comme pour `2001:db8::1:51234`. Pour une connexion sur socket Unix, HAProxy écrit `unix` à la place de l'IP et l'ID du socket à la place du port, ce que la regex accepte aussi.
- `ta` et `retries` acceptent un `+` en tête. HAProxy préfixe `Ta` d'un `+` avec `option logasap` et `retries` quand une redispatch a eu lieu après le nombre maximal de tentatives.
- `tr`, `tw`, `tc` et `tr_resp` acceptent `-1`, qui signale une requête interrompue avant l'événement mesuré.
- `status` accepte aussi `-1`. HAProxy l'écrit quand le client coupe pendant que HAProxy se connecte au serveur ou attend en file (termination state `CC--` ou `CQ--`). Avec `\d{3}`, ces lignes ne matchent pas et restent du texte brut, en IPv4 comme en IPv6. Un client qui coupe avant d'avoir envoyé sa requête (`CR`) ou pendant l'attente de la réponse (`CH`) est logué en 400, pas en `-1`.
- Le `time` de HAProxy n'a pas de fuseau. `time_zone` s'applique quand la date n'en contient pas, à régler sur le fuseau du conteneur HAProxy (UTC dans la plupart des images). Cette clé n'existe dans les parsers Fluent Bit que depuis la 5.0.7. Elle attend un nom IANA : `Etc/UTC` passe, `UTC` tout court est refusé et Fluent Bit s'arrête au démarrage (`invalid or unavailable time_zone 'UTC'`).
- `frontend` reprend `%ft`, qui ajoute un `~` au nom d'un frontend en SSL : `https-in~` dans les logs HTTP. La ligne d'erreur de connexion par défaut écrit `https-in` sans `~`. Le `error-log-format` plus bas reprend `%ft` et garde le `~`, ce qui aligne les labels `frontend` des 2 métriques.
- `types` ne convertit que les timers. `status` reste une chaîne : le filtre `log_to_metrics` n'applique sa regex qu'à des chaînes, donc un `status` converti en entier ne matcherait jamais et la série n'apparaîtrait pas du tout.

### Les clients IPv6 que la regex courante rate

La regex qu'on croise partout lit l'IP avec `[0-9.]+` ou `[^:]+`, ce qui suppose qu'il n'y a qu'un seul `:` dans `ip:port`.

```text
regex fragile : ^(?<client_ip>[0-9.]+):(?<client_port>\d+) \[
```

Sur `2001:db8:1::42:51234`, ce motif échoue dès le premier `:`. Il n'y a aucune erreur : quand le parser ne matche pas, le filtre `parser` laisse le record intact. La ligne continue vers Loki ou Elasticsearch comme un simple champ `message` et manque dans tout ce qui dépend de `status` ou de `frontend`. Plus la part d'IPv6 grandit dans le trafic, plus les compteurs et les ratios s'éloignent de la réalité.

Pour s'en rendre compte, on compte les records sans champ `status` après le filtre `parser`.

## Récupérer les erreurs de connexion

Quand une connexion échoue avant d'être une requête HTTP (handshake TLS raté, header PROXY protocol invalide), HAProxy écrit une ligne plus courte, au format d'erreur de la section 8.2.5 de la documentation :

```text
2001:db8::1:56059 [26/Oct/2026:10:00:00.380] https-in/1: SSL handshake failure (error:0A000102:SSL routines::unsupported protocol)
```

Cette ligne n'a ni statut ni timers, donc `haproxy_http` ne la matche pas. Le parser `haproxy_conn_error` la prend en charge :

```yaml title="parsers.yaml"
  - name: haproxy_conn_error
    format: regex
    regex: '^(?<client_ip>\S+):(?<client_port>\d+) \[(?<time>[^\]]+)\] (?<frontend>[^/ ]+)/(?<bind>[^:\s]+): (?<error>[^(]+?)(?: \((?:-|(?<ssl_error>[^)]+))\))?(?: sni="(?<ssl_sni>[^"]*)" proto=(?<ssl_protocol>\S*))?$'
    time_key: time
    time_format: '%d/%b/%Y:%H:%M:%S.%L'
    time_zone: Etc/UTC
```

`error` garde le message seul (`SSL handshake failure`) et `ssl_error` reçoit l'erreur OpenSSL entre parenthèses, quand HAProxy en a une. Les alertes se font sur `error`, qui prend peu de valeurs différentes, alors que `ssl_error` sert au diagnostic.

Les 2 formats ne se chevauchent pas : une ligne d'erreur n'a ni timers ni requête entre guillemets. `haproxy_http` ne la matche donc jamais.

Avec `option dontlognull`, les connexions qui n'ont échangé aucune donnée (sondes de load balancer) ne sont pas journalisées.

### Ajouter le SNI et la version TLS

La ligne par défaut ne dit pas quel nom de domaine le client demandait, ni en quelle version de TLS. `error-log-format` remplace ce format par défaut et permet de les ajouter :

```haproxy
defaults
    error-log-format "%ci:%cp [%tr] %ft/%[so_name]: %[fc_err_str] (%[ssl_fc_err_str]) sni=\"%[ssl_fc_sni]\" proto=%[ssl_fc_protocol]"
```

Un fetch sans valeur s'écrit `-` : une erreur sans cause OpenSSL donne `(-)`, que la regex ignore au lieu d'en faire un `ssl_error`. Les 2 groupes de fin sont optionnels, si bien que le même parser lit les lignes avant et après le changement de format pendant un déploiement progressif. Tout autre changement de `error-log-format` demande d'adapter la regex. Le message `Stopped a TLSv1 heartbeat attack (CVE-2014-0160)` fait exception : `error` s'arrête au premier `(` et `ssl_error` reçoit `CVE-2014-0160`.

Le format par défaut écrit le numéro du `bind` après le `/` (`https-in/1`). `%[so_name]` lit son nom et vaut `-` si le `bind` n'en a pas : on ajoute `name b1` sur la ligne `bind` pour le retrouver dans les logs.

Avec ce format, chaque requête invalide ou connexion coupée sans erreur réseau passe du format httplog (`<BADREQ>`, status 400) au format d'erreur, du type `http-in/-: Success (-) sni="-" proto=-`. Ces lignes parsent avec `error` à `Success`, quittent le compteur de 4xx et gonfleraient le compteur d'erreurs de connexion, d'où l'`exclude` sur le filtre plus bas, qui doit être écrit avant le `regex`.

## Brancher les parsers dans le pipeline

Les logs de conteneur passent d'abord par le parser `cri`, qui place la ligne HAProxy dans le champ `message`. Le filtre `parser` lit ensuite ce champ. Le `cri` du `parsers.conf` livré avec Fluent Bit n'est chargé que par la config par défaut : avec une config YAML maison, on le redéclare dans `parsers.yaml`, regex reprise telle quelle de `conf/parsers.conf` :

```yaml title="parsers.yaml"
  - name: cri
    format: regex
    regex: '^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<message>.*)$'
    time_key: time
    time_format: '%Y-%m-%dT%H:%M:%S.%L%z'
    time_keep: on
```

Le pipeline s'écrit alors ainsi :

```yaml title="fluent-bit.yaml"
service:
  parsers_file: parsers.yaml

pipeline:
  inputs:
    - name: tail
      path: /var/log/containers/haproxy-*.log
      tag: haproxy
      parser: cri

  filters:
    - name: parser
      match: haproxy
      key_name: message
      parser: haproxy_http
      reserve_data: true
```

`reserve_data: true` garde les autres champs du record (métadonnées Kubernetes ajoutées plus haut dans le pipeline, par exemple). Par défaut, le filtre ne conserve que les champs parsés.

Le parser des lignes d'erreur passe dans un second filtre, à la suite du premier. Quand `haproxy_http` réussit, le champ `message` disparaît (le filtre ne le garde que si `preserve_key` est activé) : le second filtre n'a plus rien à lire. Quand `haproxy_http` échoue, le record reste intact et `haproxy_conn_error` prend le relais.

```yaml title="fluent-bit.yaml"
  filters:
    - name: parser
      match: haproxy
      key_name: message
      parser: haproxy_conn_error
      reserve_data: true
```

Un record qui sort avec `status` est une requête HTTP et un record avec `error` est une erreur de connexion. Ce partage sert aux métriques plus bas.

HAProxy écrit aussi ses propres messages sur stderr : serveur passé `DOWN`, rechargement de config, alerte au démarrage. Ils ont la forme `[WARNING]  (8) : Server api/api-01 is DOWN` et ne matchent aucun des 2 parsers (les changements d'état de serveur partent aussi vers les loggers, donc sur stdout sans préfixe `[WARNING]`, où aucun parser ne les lit). Un troisième parser, branché dans un troisième filtre `parser` sur le même modèle, en extrait la sévérité :

```yaml title="parsers.yaml"
  - name: haproxy_system
    format: regex
    regex: '^\[(?<severity>[A-Z]+)\]\s+\((?<pid>\d+)\)\s+:\s+(?<message>.*)$'
```

`severity` vaut `NOTICE`, `WARNING`, `ALERT` ou `DIAG` et permet d'alerter sur les `ALERT` sans relire les logs d'accès.

## Lire le termination state

Le champ `tstate` (les 2 premiers caractères du `termination_state`) dit pourquoi et dans quelle phase le stream s'est terminé. La section 8.5 de la documentation HAProxy en donne le détail. La lecture se fait avec les 2 caractères ensemble :

| tstate | Sens |
|---|---|
| `--` | Fin normale |
| `cR` | `timeout http-request` : le client n'a pas envoyé une requête complète à temps (souvent un 408) |
| `CR` | Le client a coupé avant d'avoir envoyé une requête complète (souvent un 400) |
| `CD` | Le client a coupé pendant le transfert de données |
| `cD` | `timeout client` pendant le transfert, le client a disparu |
| `sH` | `timeout server` en attendant les headers de réponse, le backend est lent |
| `SC` | Le serveur a refusé ou coupé la connexion pendant l'établissement |
| `sQ` | Timeout pendant que la requête attendait en file d'un `maxconn` serveur |
| `LR` | HAProxy a répondu lui-même (`http-request return`, page de stats, exporter Prometheus) |

La majuscule indique qui a coupé (`C` client, `S` serveur, `P` proxy, `L` traitement local) et la minuscule un timeout de ce côté (`c`, `s`). Les 2 autres caractères (`cstate`) portent l'état du cookie de persistance, utile seulement si le frontend en pose.

Un 4xx avec `cR` est un client lent ou un préconnect de navigateur. Un 4xx avec `--` est une vraie réponse applicative. Les 2 ne se traitent pas de la même façon, d'où l'intérêt de garder `tstate` à côté de `status`. `option http-ignore-probes` supprime les connexions sans donnée et allège le bruit de `cR`, au prix de masquer les clients qui n'arrivent pas à envoyer une requête.

## Transformer les logs en métriques

Le filtre `log_to_metrics` lit les records, incrémente un compteur par record qui matche et laisse les logs passer intacts. Les métriques partent dans un pipeline séparé que `prometheus_exporter` expose ([doc du filtre](https://docs.fluentbit.io/manual/pipeline/filters/log_to_metrics)). Les filtres s'exécutent dans l'ordre de la config : ces blocs s'ajoutent après les 2 filtres `parser`, sinon `status` n'existe pas encore.

```yaml title="fluent-bit.yaml"
  filters:
    - name: log_to_metrics
      match: haproxy
      tag: haproxy_metrics
      metric_mode: counter
      metric_namespace: haproxy
      metric_subsystem: log
      metric_name: http_requests_total
      metric_description: HTTP requests logged by HAProxy
      regex: status ^\d{3}$
      label_field:
        - frontend
        - status

    - name: log_to_metrics
      match: haproxy
      tag: haproxy_metrics
      metric_mode: counter
      metric_namespace: haproxy
      metric_subsystem: log
      metric_name: conn_errors_total
      metric_description: Frontend connection errors logged by HAProxy
      exclude: error ^Success$
      regex: error .
      label_field: frontend

  outputs:
    - name: prometheus_exporter
      match: haproxy_metrics
      host: 0.0.0.0
      port: 2021
```

Le nom complet d'une série est `namespace_subsystem_name`, soit ici `haproxy_log_http_requests_total{frontend="https-in~",status="404"}`. Un `curl` sur le port 2021 le confirme avant d'écrire une règle. La regex `^\d{3}$` écarte les lignes en `status` `-1` (`CC`, `CQ`), qui restent consultables dans les logs. Les abandons `CR` et `CH` arrivent en 400 et comptent donc parmi les 4xx.

!!! warning "Cardinalité"
    Chaque combinaison de valeurs de labels crée une série pour la vie du processus. `frontend` et `status` sont bornés alors que `client_ip`, `request` ou le texte de `error` ne le sont pas. La documentation du filtre avertit qu'un label non borné peut remplir le buffer de l'émetteur jusqu'à l'arrêt des métriques. Un label `backend` est acceptable quand le nombre de backends reste raisonnable.

Les terminaisons anormales prennent un filtre de plus. Sa `regex` garde les `tstate` qui commencent par une lettre et écarte la fin normale `--`. Elle compte aussi les réponses que HAProxy produit lui-même, qui n'ont rien d'anormal : `LR` pour un `http-request return` ou la page de stats, `PR` pour un `deny`. L'alerte plus bas filtre sur la première lettre pour les laisser de côté.

```yaml title="fluent-bit.yaml"
    - name: log_to_metrics
      match: haproxy
      tag: haproxy_metrics
      metric_mode: counter
      metric_namespace: haproxy
      metric_subsystem: log
      metric_name: abnormal_terminations_total
      metric_description: Streams with a termination state other than --
      regex: tstate ^[A-Za-z]
      label_field:
        - frontend
        - tstate
```

`tstate` ne prend qu'une poignée de valeurs en pratique (`LR`, `CD`, `cD`, `sH`, `SC`...), ce qui reste raisonnable comme label.

HAProxy expose aussi ses propres compteurs, par exemple `haproxy_frontend_http_responses_total` avec un label `code` (`4xx`, `5xx`) quand l'exporter Prometheus est activé (`http-request use-service prometheus-exporter`). Cette voie est moins coûteuse que le parsing de logs et ne dépend pas de la regex. Les logs gardent un intérêt quand il faut le détail par requête ou le termination state, ce que les stats n'ont pas.

## Alerter sur les 4xx

Un 4xx est une réponse correcte du point de vue de HAProxy : le seul signal est un ratio qui bouge. On alerte donc sur la part de 4xx dans le trafic d'un frontend, pas sur leur nombre brut.

```yaml title="haproxy-logs.rules.yml"
groups:
  - name: haproxy-logs
    rules:
      - alert: HAProxyHigh4xxRatio
        expr: |
          sum by (frontend) (rate(haproxy_log_http_requests_total{status=~"4.."}[5m]))
            /
          sum by (frontend) (rate(haproxy_log_http_requests_total[5m]))
          > 0.2
          and
          sum by (frontend) (rate(haproxy_log_http_requests_total[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "More than 20% of requests on {{ $labels.frontend }} return a 4xx"

      - alert: HAProxyServerSideTerminations
        expr: sum by (frontend) (rate(haproxy_log_abnormal_terminations_total{tstate=~"[sSRI]."}[5m])) > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Streams ending on a server timeout, a server abort or a proxy resource issue on {{ $labels.frontend }}"

      - alert: HAProxyConnectionErrors
        expr: sum by (frontend) (rate(haproxy_log_conn_errors_total[5m])) > 1
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Frontend connection errors (TLS handshake, PROXY header) on {{ $labels.frontend }}"
```

Les seuils (20 %, 1 requête par seconde, `> 0`, `> 1`) sont des valeurs de départ à recaler sur le trafic de chaque frontend. La garde `> 1` sur le débit empêche qu'un frontend quasi inactif déclenche l'alerte avec 1 requête sur 4 en 404.

Le sélecteur `[sSRI].` couvre le timeout serveur (`s`), l'abandon serveur (`S`), l'épuisement de ressources du proxy (`R`) et l'erreur interne (`I`). Les abandons côté client (`CD`, `cD`, `CR`) sont du bruit normal sur Internet et ne méritent pas une alerte.

Le routage et le regroupement de ces alertes sont décrits dans [Alertmanager](../../monitoring/lgtm/alertmanager.md). [Tester avec promtool](../../monitoring/lgtm/workload_alerting.md#tester-avec-promtool) explique comment valider ces règles avant de les déployer.

## Retrouver la vraie IP client

Le champ `%ci` est l'adresse du pair TCP. Derrière un load balancer, c'est l'IP du load balancer, ce qui rend `client_ip` inutilisable pour du filtrage, du rate limiting ou de la géolocalisation. 3 cas se présentent.

- Connexion directe : `%ci` est le client, rien à faire.
- Load balancer L4 qui parle le PROXY protocol : on ajoute `accept-proxy` sur le `bind`. La documentation précise qu'avec un socket configuré ainsi et un PROXY protocol correct, les logs reflètent l'adresse de la connexion d'origine.
- Load balancer ou CDN L7 qui passe l'IP dans `X-Forwarded-For` : `%ci` reste l'IP du proxy et on capte le header pour le retrouver dans la ligne de log.

```haproxy
frontend https-in
    bind :::443 v4v6 ssl crt /etc/haproxy/certs/ accept-proxy
    capture request header X-Forwarded-For len 64
```

`bind :443` n'écoute qu'en IPv4 et un client IPv6 se voit refuser la connexion. `:::443 v4v6` prend les 2 familles. Un client IPv4 en connexion directe y apparaît alors sous la forme `::ffff:192.0.2.10`, que la regex lit sans problème mais que les outils de géolocalisation ou de rate limiting doivent savoir traiter.

Avec `accept-proxy`, une connexion qui arrive sans header PROXY valide est refusée et HAProxy la journalise. On la retrouve avec le parser `haproxy_conn_error`, ce qui signale un load balancer mal configuré. Le header capté atterrit dans le champ `req_headers` du parser `haproxy_http`, où on le lit tel quel (`203.0.113.9`).

On ne fait confiance à `X-Forwarded-For` que si la source est un proxy connu : le header vient du client, qui peut y mettre n'importe quelle valeur. HAProxy propose `http-request set-src hdr(x-forwarded-for)` pour que les `src` suivants (ACLs, stick-tables) utilisent cette IP. La même réserve s'applique : n'importe quel client peut forger le header.

## Vérifier avec des lignes réelles

Avant de déployer, on passe des lignes d'exemple dans un pipeline minimal avec l'input `dummy` : un cas IPv4, un cas IPv6 et une ligne d'erreur de connexion. Le pipeline ci-dessous teste le cas IPv6, les 2 autres s'obtiennent en changeant la valeur de `dummy`.

```yaml title="test.yaml"
service:
  parsers_file: parsers.yaml

pipeline:
  inputs:
    - name: dummy
      tag: haproxy
      dummy: '{"message":"2001:db8:1::42:51234 [26/Oct/2026:10:00:00.123] https-in~ app/web1 0/0/0/1/1 404 150 - - ---- 1/1/0/0/0 0/0 \"GET /nope HTTP/1.1\""}'

  filters:
    - name: parser
      match: haproxy
      key_name: message
      parser: haproxy_http
      reserve_data: true

  outputs:
    - name: stdout
      match: '*'
```

On lance le pipeline de test, puis on vérifie que `client_ip` vaut `2001:db8:1::42` et que `status` vaut `404`.

```bash
fluent-bit --config test.yaml
```

Un record qui garde son champ `message` d'origine sans champs parsés est la signature d'une ligne non matchée, donc d'une regex à reprendre.
