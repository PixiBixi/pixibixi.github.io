---
description: "Synthetic monitoring avec Cloudprober : probes HTTP, DNS et ping, checks IPv4 et IPv6, déploiement dans Kubernetes, export Prometheus, traces vers un collector OTel, alertes sur le taux de succès et la latence, targets pilotées par Git et GitLab CI."
tags:
  - Cloudprober
  - Prometheus
  - OpenTelemetry
  - Alerting
  - SRE
tested_with:
  - "Cloudprober 0.14.7"
---

# Cloudprober : probes HTTP, DNS et ping, traces OTel et alerting

Les métriques d'un service disent comment il se voit lui-même, pas comment un client le voit. Pendant un incident réseau, tous les pods peuvent être verts alors que la moitié des connexions n'arrive jamais jusqu'au load balancer. Le synthetic monitoring prend le problème par l'autre bout : depuis l'extérieur, il envoie des requêtes réelles toutes les quelques secondes et répond d'abord à la seule question utile, est-ce que ça marche vu d'ailleurs ?

On obtient ici des checks HTTP, DNS et ping en IPv4 et IPv6, des métriques Prometheus, des traces vers un collector OTel, des alertes sur le taux de succès et la latence ou encore des targets gérées en GitOps. Tout tient dans [Cloudprober](https://github.com/cloudprober/cloudprober), un binaire Go unique qui lit une liste de probes et de targets et exécute les checks. Dans la suite, le prober désigne une instance de Cloudprober et une probe un check qu'elle exécute.

## Cloudprober, Blackbox exporter ou Grafana Synthetic Monitoring

Les 3 outils qu'on croise le plus pour du synthetic monitoring ne fonctionnent pas du tout pareil :

| | Cloudprober | Blackbox exporter | Grafana Synthetic Monitoring |
| --- | --- | --- | --- |
| **Hébergement** | self-hosted | self-hosted | SaaS Grafana Cloud, probes publiques ou privées (agent chez soi) |
| **Qui déclenche la probe** | Cloudprober, à son propre `interval` | Prometheus, une probe par scrape de `/probe?target=...&module=...` | Grafana, à la fréquence du check |
| **Protocoles** | HTTP, DNS, ping, TCP, UDP, gRPC, browser, SQL, external | HTTP, TCP, ICMP, DNS, gRPC, socket Unix, WebSocket | HTTP, multi-HTTP, DNS, ping, TCP, gRPC, traceroute, scripts k6, browser |
| **Famille IP par défaut** | IPv4 préféré | IPv6 préféré, repli silencieux sur IPv4 | IPv4 |
| **Alerting intégré** | ✅ (PagerDuty, Slack, Opsgenie, Teams, Grafana IRM via le webhook `http_notify`) | ❌, tout passe par Prometheus | ✅ Grafana Alerting |
| **Targets** | fichier, Kubernetes, discovery | `static_configs` ou service discovery de Prometheus | UI, API ou Terraform |

Le repli IPv6 vers IPv4 du Blackbox exporter (`ip_protocol_fallback: true` par défaut) est le piège à connaître : un module qui devait tester IPv6 passe au vert en IPv4 sans rien dire, il faut le désactiver pour un vrai check IPv6. Les 2 outils self-hosted découpent la latence HTTP par étage (`latency_breakdown` d'un côté, `probe_http_duration_seconds{phase}` de l'autre), mais seul Cloudprober envoie des traces OTel.

En pratique, le Blackbox exporter suffit quand Prometheus est déjà là et qu'on veut quelques checks HTTP et TCP. Cloudprober prend le relais quand on veut des cadences fines indépendantes du scrape, des traces ou des probes depuis plusieurs régions. Grafana Synthetic Monitoring évite d'opérer des probers et donne des points de vue publics tout faits, en échange d'un service facturé à l'usage.

## Une config, des probes, des targets

La config décrit des `probe`, chacune avec un `type`, des `targets` et une cadence. Elle se lit en textpb, en YAML ou en jsonnet selon l'extension du fichier passé à `--config_file`. Par défaut une probe tourne toutes les 2s avec un timeout de 1s. Les résultats sont exposés sur le port 9313.

Avant tout déploiement, `--configtest` valide la config sans rien lancer. Jusqu'à la 0.14.6, il ne fait que parser le fichier et vérifier les options de chaque probe (durées, conflits de champs). Depuis la 0.14.7, il valide aussi les targets, les regex, les surfacers et les noms de probes en double. `--dumpconfig` affiche la config telle qu'elle est comprise une fois les formats résolus.

```bash
cloudprober --config_file /etc/cloudprober/cloudprober.yaml --configtest
cloudprober --config_file /etc/cloudprober/cloudprober.yaml --dumpconfig --dumpconfig_fmt yaml
```

Les targets peuvent être statiques (`host_names`), lues dans un fichier relu périodiquement (`file_targets`, `re_eval_sec`), découvertes dans Kubernetes (`k8s`, marqué expérimental dans le proto) ou via un service de discovery (`rds_targets`). Un `regex` filtre le résultat et un `endpoint` ajoute des cibles statiques par-dessus, avec leurs propres labels.

## Les 3 probes de base

Un seul fichier YAML suffit pour les 3 checks qu'on pose partout, une URL, un résolveur et une IP. On choisit le type et on remplit le bloc `*_probe` qui correspond.

```yaml title="cloudprober.yaml"
probe:
  - name: web-health
    type: HTTP
    targets:
      host_names: "www.example.com"
    interval: 10s
    timeout: 3s
    http_probe:
      scheme: HTTPS
      relative_url: /healthz
      latency_breakdown: [ALL_STAGES]
    validator:
      - name: status_2xx
        http_validator:
          success_status_codes: "200-299"

  - name: resolver-a
    type: DNS
    targets:
      host_names: "ns1.example.com"
    interval: 10s
    timeout: 3s
    dns_probe:
      resolved_domain: "www.example.com."
      query_type: A
      min_answers: 1
      recursion_desired: false

  - name: edge-ping
    type: PING
    targets:
      host_names: "edge-1.example.com,edge-2.example.com"
    interval: 5s
    timeout: 2s
    ping_probe:
      packets_per_probe: 3
```

Une probe HTTP compte comme réussie si la requête aboutit et si tous les validators passent. Sans validator, n'importe quel code de réponse est un succès. Un validator qui échoue incrémente `validation_failure` et laisse `success` et la latence inchangés, ce qui garde la moyenne de latence propre quand un backend répond 500 en 5ms. `latency_breakdown` ajoute les métriques `dns_latency`, `connect_latency`, `tls_handshake_latency`, `req_write_latency` et `first_byte_latency`, utiles pour savoir à quel étage de la connexion le temps part.

Pour une probe DNS, la cible est le serveur interrogé. `recursion_desired: false` convient pour sonder un serveur autoritatif, qui ne doit pas résoudre à la place d'un autre. Par défaut, la probe demande un `MX` sur `www.google.com.` et elle est réussie dès que la réponse est `NOERROR`, d'où `min_answers` pour exiger une vraie réponse.

Pour le ping, `use_datagram_socket` vaut `true` par défaut : les pings non privilégiés passent par un socket datagram, que la plupart des distributions Linux interdisent tant que `net.ipv4.ping_group_range` ne couvre pas le groupe du process.

```bash
sudo sysctl -w net.ipv4.ping_group_range="0 2147483647"
```

## Tester IPv4 et IPv6 séparément

Un service dual-stack qui marche en IPv4 et casse en IPv6 est l'une des pannes les plus silencieuses : les clients IPv4 ne voient rien et les clients IPv6 tombent sur un timeout ou un fallback lent. Quand Cloudprober résout lui-même un nom qui a un A et un AAAA, sans `ip_version` fixé, il préfère IPv4 : une seule probe ne teste jamais les 2 chemins.

On déclare le même target 2 fois, une probe par famille d'adresses. Pour une probe HTTP sur `host_names`, il faut `resolve_first: true` : sans lui, Cloudprober laisse le client HTTP de Go résoudre le nom et `ip_version` n'a aucun effet. Le champ `ip_version` s'applique à la résolution du nom, au choix de l'adresse source et à la forme du paquet pour le ping. Si `source_ip` est donné sans `ip_version`, la version est déduite de l'adresse, mais un conflit entre les 2 est une erreur de config.

```yaml title="cloudprober.yaml"
probe:
  - name: web-health-v4
    type: HTTP
    ip_version: IPV4
    targets:
      host_names: "www.example.com"
    http_probe:
      scheme: HTTPS
      resolve_first: true
      relative_url: /healthz

  - name: web-health-v6
    type: HTTP
    ip_version: IPV6
    targets:
      host_names: "www.example.com"
    http_probe:
      scheme: HTTPS
      resolve_first: true
      relative_url: /healthz
```

La probe IPv6 ne marche que si le prober a lui-même une route IPv6 : sur un cluster Kubernetes en IPv4 seul, il échoue en permanence et ne prouve rien sur la cible. On le place donc sur un réseau qui sort réellement en IPv6 et on garde le nom de la probe suffixé (`-v4`, `-v6`) pour qu'une alerte dise tout de suite quelle famille est en cause.

Pour retrouver l'adresse réellement sondée, par exemple quand un nom résout vers plusieurs IP, `additional_label` copie la valeur du target dans un label de métrique. Côté HTTP, `@target.ip@` n'est rempli qu'avec `resolve_first: true`. Les tokens disponibles sont `@target.name@`, `@target.ip@`, `@target.port@` et `@target.label.<clé>@`.

```yaml title="cloudprober.yaml"
probe:
  - name: web-health-v6
    type: HTTP
    ip_version: IPV6
    targets:
      host_names: "www.example.com"
    additional_label:
      - key: ip
        value: "@target.ip@"
    http_probe:
      scheme: HTTPS
      resolve_first: true
```

## Exporter vers Prometheus

Le surfacer `PROMETHEUS` publie les résultats sur `/metrics`. Son préfixe de métrique est vide par défaut : on le fixe dans la config pour que toutes les séries commencent par `cloudprober_`.

```yaml title="cloudprober.yaml"
surfacer:
  - type: PROMETHEUS
    prometheus_surfacer:
      metrics_prefix: "cloudprober_"
```

Les séries qui comptent pour une probe HTTP, avec les labels `ptype`, `probe` et `dst` posés par Cloudprober :

- `cloudprober_total` et `cloudprober_success` : requêtes envoyées et réussies
- `cloudprober_latency` : somme cumulée de la latence des requêtes réussies, en microsecondes par défaut (`latency_unit`). Avec `latency_distribution`, elle devient un histogramme (`_sum`, `_count`, `_bucket`) et les requêtes qui suivent changent
- `cloudprober_timeouts` : requêtes en timeout
- `cloudprober_resp_code` : compteur par `code`
- `cloudprober_ssl_earliest_cert_expiry_sec` : secondes restantes avant l'expiration du certificat le plus proche de la chaîne, en gauge

Ces compteurs sont exportés sans le suffixe `_total` que Prometheus attend par convention. Un `metric_relabel_configs` sur le `__name__` peut le rajouter, au prix de renommer toutes les séries des requêtes de cet article. On garde ici les noms bruts, sur lesquels `rate()` marche tel quel.

La disponibilité d'une probe sur 5 minutes, puis sa latence moyenne en millisecondes :

```promql
sum by (probe, dst) (rate(cloudprober_success[5m]))
  / sum by (probe, dst) (rate(cloudprober_total[5m]))

sum by (probe, dst) (rate(cloudprober_latency[5m]))
  / sum by (probe, dst) (rate(cloudprober_success[5m])) / 1000
```

Le surfacer cesse d'exposer un compteur non mis à jour depuis 4h par défaut (`stale_metrics_expiration_sec`). Les gauges, comme l'expiration du certificat, disparaissent après 10 minutes. Un target supprimé de la config reste donc visible quelques heures dans les compteurs, ce qui compte pour les alertes d'absence plus bas.

Seuls `ptype`, `probe` et `dst` viennent de Cloudprober. Le reste se pose à 2 endroits :

- ce qui décrit le prober (`region`, `env`) va dans les `external_labels` du Prometheus qui le scrape ou du Prometheus agent qui fait le remote write
- ce qui décrit la cible (`dc`, `team`, `severity`, `runbook_url`) va en label du target et passe dans les métriques par `additional_label` (`@target.label.dc@`). Les alertes routent alors sur `team` et pointent leur runbook avec `{{ $labels.runbook_url }}` sans une règle par probe

La rétention du TSDB ne suffit pas toujours, par exemple pour un rapport de SLA à refaire plusieurs mois plus tard. Un 2e surfacer, filtré avec `allow_metrics_with_label` sur les seules probes concernées, envoie les résultats bruts vers un stockage longue durée (BigQuery, par exemple) sans y déverser tout le reste.

## Faire tourner un prober dans Kubernetes

Un prober hors du cluster mesure ce que voit un client. Un prober dans le cluster mesure ce que voit un pod, un autre signal et souvent le seul à pouvoir joindre les services internes. On garde les 2, avec des noms de métriques qui ne se mélangent pas.

L'image officielle a `/cloudprober` comme entrypoint. La doc amont montre le montage le plus simple, une ConfigMap pour la config et un Deployment avec les probes de liveness et de readiness sur `/health`, port 9313.

```yaml title="deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudprober
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudprober
  template:
    metadata:
      labels:
        app: cloudprober
    spec:
      volumes:
        - name: cloudprober-config
          configMap:
            name: cloudprober-config
      containers:
        - name: cloudprober
          image: cloudprober/cloudprober:v0.14.7
          args: ["--config_file", "/cfg/cloudprober.yaml"]
          volumeMounts:
            - name: cloudprober-config
              mountPath: /cfg
          ports:
            - name: http
              containerPort: 9313
          livenessProbe:
            httpGet:
              path: /health
              port: 9313
          readinessProbe:
            httpGet:
              path: /health
              port: 9313
```

Un changement de ConfigMap ne redémarre pas le pod : le `configMapGenerator` de Kustomize, plus bas, règle ça. Il existe aussi un [chart Helm officiel](https://github.com/cloudprober/helm-charts) qui évite d'écrire ce manifest à la main.

Pour que Prometheus scrape le prober, on ajoute un Service qui expose le port `http` et un `ServiceMonitor` qui le sélectionne. Le prober expose aussi une page de statut sur le même port.

Quand les probers tournent dans plusieurs régions ou hors du cluster, aller les scraper demande un chemin réseau (souvent un load balancer interne) par région. L'autre option est de mettre un Prometheus en mode agent dans le même pod : il scrape `127.0.0.1:9313` et pousse en remote write vers Thanos Receive ou Mimir. Une nouvelle région ne demande alors que de déployer le pod.

Le piège est le WAL de l'agent. Si le remote write est injoignable, il garde les échantillons jusqu'à `--storage.agent.retention.max-time` (4h par défaut) et le prober finit en OOM.

**Baisser ce plafond ne suffit pas** : Prometheus le relève à la valeur de `--storage.agent.wal-truncate-frequency` (2h par défaut) quand il est plus bas. On fixe donc les 2 :

```bash
prometheus --agent \
  --config.file=/etc/prometheus/agent.yml \
  --storage.agent.wal-truncate-frequency=30m \
  --storage.agent.retention.max-time=30m
```

Par défaut, on garde un replica par prober : plusieurs replicas du même prober envoient plusieurs fois les requêtes aux targets et multiplient les séries à dédupliquer en aval. Pour de la redondance, on lance des probers dans des régions différentes.

Si une région doit survivre à la perte de son prober, plusieurs replicas tournent mais un seul écrit. Chaque replica sonde, un verrou (lease sur un objet de bucket, `Lease` Kubernetes) désigne le leader et seul celui-ci laisse sortir ses métriques, les autres les jettent. 3 points font marcher le montage :

- **3 replicas plutôt que 2**. À 2, c'est du best effort sans quorum : dès qu'un replica redémarre ou tombe, il n'y a plus de relève.
- **Fail closed** : en cas de doute sur le leader, on n'écrit rien. Quelques secondes de trou passent inaperçues sur des règles à 5 minutes, 2 écrivains faussent tous les `rate()`.
- **Redémarrer Cloudprober à la promotion**. Les compteurs de 2 replicas ne sont pas interchangeables : sans remise à zéro, la bascule crée un saut que `increase()` lit comme des milliers de requêtes. Le standby ne doit pas non plus exporter de traces, sinon Tempo reçoit chaque trace en double : `OTEL_SDK_DISABLED=true` le coupe, et on le repasse à `false` au moment de la promotion.

Sur GKE, Cloudprober détecte le serveur de metadata et active Cloud Logging tout seul. Sans la permission `logging.logEntries.create` sur le service account, les logs partent dans le vide. `--disable_cloud_logging` (ou la variable `CLOUDPROBER_DISABLE_CLOUD_LOGGING`) coupe cette détection.

## Envoyer les traces à un collector OTel

Une métrique dit qu'une requête a échoué, une trace dit où. Avec le tracing activé, chaque requête HTTP d'une probe démarre un span racine, propage le contexte W3C `traceparent` vers la cible et ajoute des événements de connexion (DNS, connect, TLS) sur le span. Quand l'application sondée est instrumentée, sa trace s'accroche à celle du prober. L'absence de span côté serveur montre qu'une requête n'a jamais atteint le backend.

Dans les sources de la v0.14.7, seule la probe HTTP est instrumentée. Le tracing est global : il se configure au niveau de la config racine et pas par probe.

```yaml title="cloudprober.yaml"
tracing:
  otlp_http_exporter:
    endpoint_url: "https://otel-collector.example.com/v1/traces"
  sampling_fraction: 0.1
  service_name: cloudprober
  resource_attribute:
    - key: k8s.cluster.name
      value: my-cluster
    - key: service.instance.id
      value: cloudprober-internal
```

4 points ressortent en production :

- **Sampling** : `sampling_fraction` vaut 1.0 par défaut : dès qu'un bloc `tracing` existe, chaque requête est tracée. 0.1 est une valeur de départ qui garde le volume raisonnable, mais une requête en échec qui tombe dans les 90 % non tracés n'a pas de trace. Si c'est le volume qui gêne, baisser la fréquence des probes évite ce trou.
- **Propagation** : le prober est la racine et les propagators par défaut sont `tracecontext` et `baggage`. Une application qui suit la décision de son parent (parent-based) ne trace pas non plus les requêtes que le prober n'a pas échantillonnées, ce qui explique des traces de healthcheck qui apparaissent ou disparaissent côté équipe applicative.
- **Identité de l'instance** : plusieurs instances d'un même prober dans un cluster portent toutes `service.name=cloudprober`. Cloudprober ajoute `host.name` (le nom du pod), mais un `service.instance.id` explicite (`my-cluster`, `internal`) se filtre bien plus facilement dans Tempo qu'un nom de pod qui change à chaque rollout.
- **Chemin réseau** : un export en échec ne casse pas les probes, il apparaît seulement en timeout intermittent dans les logs du pod. Le test direct est un `POST` sur `/v1/traces` depuis le pod. Sur un environnement de preprod, il échouait parce que le peering VPC n'est pas transitif : le collector était joignable depuis dev mais pas depuis preprod. Un collector placé dans le VPC peeré avec les 2 règle le problème.

## Alerter sur le succès et la latence

Les règles qui suivent partent des noms de métriques de la section Prometheus. On alerte sur 4 choses : le taux d'échec d'une probe, sa latence, l'expiration du certificat et le silence du prober lui-même. Le dernier est le plus facile à oublier, car sans lui un prober mort ressemble à un service en bonne santé.

Les seuils sont des valeurs de départ à recaler sur la distribution réelle de chaque probe, pas des mesures.

```yaml title="cloudprober-rules.yaml"
groups:
  - name: cloudprober
    rules:
      - alert: ProbeFailureRatioHigh
        expr: |
          (
            1 - sum by (probe, dst) (rate(cloudprober_success[5m]))
              / sum by (probe, dst) (rate(cloudprober_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Probe {{ $labels.probe }} fails on {{ $labels.dst }}"
          description: "More than 5% of requests failed over the last 5 minutes."

      - alert: ProbeLatencyHigh
        expr: |
          (
            sum by (probe, dst) (rate(cloudprober_latency[5m]))
              / sum by (probe, dst) (rate(cloudprober_success[5m]))
          ) > 500000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Probe {{ $labels.probe }} is slow on {{ $labels.dst }}"
          description: "Average latency above 500ms (latency_unit is microseconds)."

      - alert: ProbeCertificateExpiresSoon
        expr: cloudprober_ssl_earliest_cert_expiry_sec < 14 * 86400
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Certificate of {{ $labels.probe }} on {{ $labels.dst }} expires in under 14 days"

      - alert: ProberSilent
        expr: |
          absent_over_time(cloudprober_total{probe="web-health"}[15m])
            or sum(rate(cloudprober_total{probe="web-health"}[5m])) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No result from probe web-health for 15 minutes"
```

`ProbeLatencyHigh` divise par le taux de succès : si toutes les requêtes échouent, la division donne `NaN`, la comparaison est fausse et seule `ProbeFailureRatioHigh` parle, ce qui est le comportement voulu. `ProberSilent` vise une probe nommée : un `absent` sans filtre ne se déclencherait que si plus aucun probe n'exporte rien. La 2e branche attrape un process vivant dont les probes sont bloquées : ses compteurs restent exposés mais n'avancent plus. La rétention de 4h des séries d'un target supprimé s'applique ici aussi, d'où l'intérêt de vérifier une suppression par la config et pas par l'alerte.

Les règles de [workload_alerting](workload_alerting.md) s'appliquent telles quelles. Cloudprober sait aussi alerter lui-même (`alert` par probe, avec `condition { failures: 3 total: 5 }` et des notifiers PagerDuty, Slack, Opsgenie, Teams, email ou HTTP), mais passer par Prometheus garde un seul endroit pour les règles, les silences et les inhibitions.

## Piloter les targets avec Git, Terraform et Argo CD

Ajouter une URL à surveiller est un changement trivial : c'est le pipeline autour qui compte. On sépare 2 choses.

- **Les probers, c'est de l'infra** : Terraform décrit les instances par région (CPU, mémoire, replicas) et les secrets. Un prober sous-dimensionné fausse la latence mesurée, parce que le throttling du CPU s'ajoute au temps de la requête.
- **Les probes et les targets, c'est de la donnée** : un fichier YAML par protocole dans un repo, une MR pour chaque ajout.

Les 2 n'ont pas le même risque. Une modif d'image (version, script de probe externe) demande un build et un redéploiement. Une modif de config (fichier poussé dans une ConfigMap ou un bucket et relu au démarrage) ne demande qu'un restart. Avec un overlay par région, seule la ConfigMap de la région touchée change, donc seul son prober redémarre, sauf quand c'est la config commune qui bouge.

La règle est simple : la MR valide et le merge déploie. La CI ne touche jamais au cluster, elle rend la config puis lance `--configtest` avec la même version de l'image que la prod :

```yaml title=".gitlab-ci.yml"
validate:
  stage: test
  image:
    name: cloudprober/cloudprober:v0.14.7
    entrypoint: [""]
  script:
    - /cloudprober --config_file config/cloudprober.yaml --configtest
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

Le déploiement revient à Argo CD ou Flux, qui suit la branche par défaut. La ConfigMap sort d'un `configMapGenerator` : Kustomize suffixe son nom par un hash du contenu et réécrit la référence dans le Deployment, donc chaque changement de config déclenche un rollout sans `rollout restart` :

```yaml title="kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: monitoring
resources:
  - deployment.yaml
configMapGenerator:
  - name: cloudprober-config
    files:
      - cloudprober.yaml=config/cloudprober.yaml
```

Si l'image de validation reste sur une version plus ancienne que celle déployée, un bloc de config récent échoue au `--configtest` alors qu'il aurait marché en prod, et une erreur que seule la version récente détecte passe la CI pour casser au démarrage. On bumpe les 2 ensemble.

Le job de build d'image doit aussi viser une architecture explicite. Un build sans tag de runner peut tomber sur un runner arm64 et produire une image qui ne démarre pas sur une plateforme amd64 only : on tague le job ou on build en multi-arch.

Après le merge, les métriques d'une nouvelle probe n'apparaissent qu'une fois la synchro Argo CD terminée et un scrape passé, soit quelques minutes. Une requête de présence évite de croire à une probe active alors que le nom diffère :

```promql
sum by (probe, dst) (rate(cloudprober_total{probe="web-health"}[5m]))
```

Une série vide après ce délai veut dire soit une config valide pas encore scrapée, soit un nom de probe différent de celui attendu, mais pas un échec du déploiement.

## Lire les probes pendant un incident

Un matin, toutes les probes d'un datacenter sont tombées en même temps et la première hypothèse dans le canal d'incident était un souci de Cloudprober lui-même. Une comparaison de quelques minutes a écarté cette piste, avec une méthode réutilisable telle quelle.

On pose les mêmes questions dans l'ordre, chacune avec une requête qui tranche. Le label `dc` des requêtes ne vient pas de Cloudprober : on le pose avec les `external_labels` de chaque Prometheus ou un `additional_label` par probe.

- **Le prober ou la cible ?** Le débit de requêtes du prober (`rate(cloudprober_total[5m])`) doit rester stable. S'il l'est, le prober a tourné pendant toute la panne. S'il chute ou se met à zéro, c'est un redémarrage ou un problème du prober.
- **Un datacenter ou tous ?** Le même ratio d'échec, découpé par datacenter. Ici le même prober sondait un autre datacenter à 0 % d'échec pendant la panne, ce qui disculpe le prober sans autre preuve.
- **Toute la cible ou une partie ?** Le ratio par IP. Une panne du prober aurait fait tomber toutes les IP à la fois, alors que les taux d'échec étaient très inégaux d'une IP à l'autre.
- **Quel type d'erreur ?** Seules les probes HTTP étaient touchées, avec une latence de connexion et de handshake TLS en hausse, mais pas de 5xx côté backend : les requêtes n'atteignaient pas le serveur. La latence découpée tranche : une hausse sur `connect_latency` seule pointe le réseau, une hausse sur `first_byte_latency` pointe le backend.
- **Un changement avant ?** Aucun déploiement du prober dans les 7 derniers jours, ce qui ferme la question côté Cloudprober.

```promql
sum by (dc) (rate(cloudprober_total[2m]))

1 - sum by (dc) (rate(cloudprober_success[2m]))
  / sum by (dc) (rate(cloudprober_total[2m]))
```

Les métriques des load balancers du datacenter ont confirmé : retransmissions TCP multipliées par 8 environ sur tous les nœuds à la fois, contre rien sur les autres datacenters. La cause se trouvait donc en amont des load balancers, sur le réseau. Le prober a joué son rôle : il a vu la panne et il en a donné l'étendue.

## Voir aussi

- [Alertes de workload Kubernetes](workload_alerting.md) pour le même style de règles côté pods
- [Cloudprober, doc officielle](https://cloudprober.org/docs/) et [le dépôt amont](https://github.com/cloudprober/cloudprober), dont les fichiers `.proto` font référence pour chaque champ
