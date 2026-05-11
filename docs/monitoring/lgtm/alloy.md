---
description: Grafana Alloy — le collecteur universel qui remplace Promtail et Grafana Agent. Config, pipelines logs/métriques/traces, migration depuis Promtail.
tags:
  - Alloy
  - Promtail
  - OpenTelemetry
---

# Grafana Alloy — remplacer Promtail (et tout le reste)

Promtail est en fin de vie. Grafana Agent aussi. Alloy est le successeur officiel depuis avril 2024 — un collecteur universel qui gère logs, métriques et traces dans un seul binaire avec un langage de config déclaratif. Alloy complète la [stack LGTM](simple_monitoring_stack.md) en unifiant la collecte des données.

La syntaxe change complètement, mais la migration est assistée.

## Concepts clés

Alloy fonctionne par **composants** connectés entre eux. Chaque composant a un type et un nom, accepte des arguments, expose des exports.

```alloy
// type.nom { ... }
loki.source.file "app_logs" {
  targets    = local.file_match.app.targets
  forward_to = [loki.write.default.receiver]
}
```

On connecte les composants en passant les exports d'un composant comme argument d'un autre — `loki.write.default.receiver` est l'export `receiver` du composant `loki.write` nommé `default`.

L'UI de debug est dispo sur `http://localhost:12345` — elle affiche le graphe des composants et leur état en temps réel.

## Installation

### Debian / Ubuntu

```bash
# Import GPG + repo
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor > /etc/apt/keyrings/grafana.gpg
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
  > /etc/apt/sources.list.d/grafana.list
apt-get update && apt-get install -y alloy
```

### Docker

```bash
docker run -d \
  -v /etc/alloy/config.alloy:/etc/alloy/config.alloy \
  -p 12345:12345 \
  grafana/alloy:latest \
  run /etc/alloy/config.alloy
```

### Kubernetes (Helm)

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm upgrade --install alloy grafana/alloy \
  --namespace monitoring \
  -f values.yaml
```

Le fichier de config par défaut : `/etc/alloy/config.alloy`

```bash
# Valider la config avant de reload
alloy fmt /etc/alloy/config.alloy
alloy validate /etc/alloy/config.alloy

# Reload à chaud
systemctl reload alloy
# ou via API
curl -X POST http://localhost:12345/-/reload
```

## Migration depuis Promtail

Alloy embarque un convertisseur automatique pour faciliter la transition. Pour configurer les alertes basées sur les logs collectés, voir [l'alerting avec Loki](loki_alerting.md).

```bash

alloy convert \
  --source-format=promtail \
  --output=config.alloy \
  promtail-config.yaml
```

Le résultat est fonctionnel mais souvent verbeux — ça vaut le coup de simplifier à la main ensuite. La commande supporte aussi `--source-format=static` (Grafana Agent static mode).

## Pipelines

### Logs → Loki

Pipeline classique : découverte de fichiers + envoi vers Loki.

```alloy
local.file_match "app" {
  path_targets = [{"__path__" = "/var/log/app/*.log", "job" = "app"}]
}

loki.source.file "app_logs" {
  targets    = local.file_match.app.targets
  forward_to = [loki.process.add_labels.receiver]
}

loki.process "add_labels" {
  forward_to = [loki.write.default.receiver]

  stage.static_labels {
    values = {
      env = "prod",
    }
  }
}

loki.write "default" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

### Logs Kubernetes

Pour collecter les logs des pods K8s, on passe par `loki.source.kubernetes` :

```alloy
discovery.kubernetes "pods" {
  role = "pod"
}

discovery.relabel "pods" {
  targets = discovery.kubernetes.pods.targets

  rule {
    source_labels = ["__meta_kubernetes_namespace"]
    target_label  = "namespace"
  }
  rule {
    source_labels = ["__meta_kubernetes_pod_name"]
    target_label  = "pod"
  }
  rule {
    source_labels = ["__meta_kubernetes_pod_container_name"]
    target_label  = "container"
  }
}

loki.source.kubernetes "pods" {
  targets    = discovery.relabel.pods.output
  forward_to = [loki.write.default.receiver]
}

loki.write "default" {
  endpoint {
    url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
  }
}
```

### Métriques → Prometheus / Mimir

Alloy embarque [27+ exporters Prometheus intégrés](https://grafana.com/docs/alloy/latest/reference/components/prometheus/) — `unix` (node_exporter), `mysql`, `postgres`, `redis`, `kafka`, `elasticsearch`, `blackbox`... — pas besoin de binaire séparé.

Pour collecter les métriques système avec l'exporter Unix intégré :

```alloy
prometheus.exporter.unix "node" {
  include_exporter_metrics = true
}

prometheus.scrape "node" {
  targets    = prometheus.exporter.unix.node.targets
  forward_to = [prometheus.remote_write.mimir.receiver]
}

prometheus.remote_write "mimir" {
  endpoint {
    url = "http://mimir:9009/api/v1/push"
  }
}
```

Les métriques de l'exporter ne passent pas par `/metrics` mais par l'API composant — remplacer `node` par le label utilisé dans la config :

```bash
curl -s http://localhost:12345/api/v0/component/prometheus.exporter.unix.node/metrics | head -20
```

Pour scraper un node_exporter externe déjà existant sur `localhost:9100` :

```alloy
prometheus.scrape "node_external" {
  targets    = [{"__address__" = "localhost:9100"}]
  forward_to = [prometheus.remote_write.mimir.receiver]
}
```

Pour scraper la discovery K8s :

```alloy
discovery.kubernetes "services" {
  role = "service"
}

prometheus.scrape "k8s_services" {
  targets    = discovery.kubernetes.services.targets
  forward_to = [prometheus.remote_write.mimir.receiver]
}
```

### Prometheus Operator (ServiceMonitor / PodMonitor)

Si Prometheus Operator est déjà en place, les équipes définissent leurs targets via des CRDs `ServiceMonitor` et `PodMonitor` — Alloy peut les lire directement. L'intérêt : migrer de Prometheus vers Alloy + Mimir sans toucher aux configs des applications.

```alloy
prometheus.operator.servicemonitors "default" {
  forward_to = [prometheus.remote_write.mimir.receiver]
}

prometheus.operator.podmonitors "default" {
  forward_to = [prometheus.remote_write.mimir.receiver]
}

prometheus.remote_write "mimir" {
  endpoint {
    url = "http://mimir:9009/api/v1/push"
  }
}
```

Par défaut, Alloy scrute tous les namespaces. Pour limiter ou filtrer par label :

```alloy
prometheus.operator.servicemonitors "apps" {
  namespaces = ["production", "staging"]

  selector {
    match_labels = {
      "monitoring" = "enabled",
    }
  }

  forward_to = [prometheus.remote_write.mimir.receiver]
}
```

En mode clustered (plusieurs instances Alloy), le bloc `clustering` distribue les targets par consistent hashing — chaque instance scrape une partie des ServiceMonitors :

```alloy
prometheus.operator.servicemonitors "apps" {
  clustering {
    enabled = true
  }
  forward_to = [prometheus.remote_write.mimir.receiver]
}
```

### Traces → Tempo

```alloy
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
  http { endpoint = "0.0.0.0:4318" }

  output {
    traces = [otelcol.exporter.otlp.tempo.input]
  }
}

otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "http://tempo:4317"
    tls {
      insecure = true
    }
  }
}
```

## Alerting avec Mimir

Sans Prometheus local, l'évaluation des règles PromQL est assurée par le **Mimir Ruler**. Alloy synchronise les CRDs Prometheus Operator vers Mimir — les équipes continuent de déployer leurs `PrometheusRule` et `AlertmanagerConfig` sans rien changer.

### Règles (PrometheusRule → Mimir Ruler)

`mimir.rules.kubernetes` lit les `PrometheusRule` du cluster et les pousse dans le ruler Mimir (sync toutes les 5 minutes par défaut) :

```alloy
mimir.rules.kubernetes "default" {
  address = "http://mimir:9009"
}
```

Pour une migration partielle, n'activer que les namespaces labellisés `alloy: "yes"` :

```alloy
mimir.rules.kubernetes "default" {
  address = "http://mimir:9009"

  rule_namespace_selector {
    match_labels = {
      "alloy" = "yes",
    }
  }
}
```

En multi-tenant, `tenant_id` est obligatoire — Mimir renvoie un `401` sans le header `X-Scope-OrgID` :

```alloy
mimir.rules.kubernetes "default" {
  address   = "http://mimir:9009"
  tenant_id = "team-a"
}
```

### Config Alertmanager (AlertmanagerConfig → Mimir)

`mimir.alerts.kubernetes` synchronise les `AlertmanagerConfig` CRDs vers l'Alertmanager de Mimir. Composant expérimental — passer `--stability.level=experimental` au lancement d'Alloy.

```alloy
mimir.alerts.kubernetes "default" {
  address       = "http://mimir:9009"
  global_config = remote.kubernetes.configmap.alertmanager.data["global"]

  alertmanagerconfig_selector {
    match_labels = {
      "alloy" = "yes",
    }
  }
}
```

!!! warning "RBAC requis"
    Les deux composants accèdent à l'API Kubernetes — créer un `ClusterRole` avec accès en lecture sur les CRDs Prometheus Operator.

<!-- markdownlint-disable MD046 -->
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: alloy-rules
rules:
  - apiGroups: ["monitoring.coreos.com"]
    resources: ["prometheusrules", "alertmanagerconfigs"]
    verbs: ["get", "list", "watch"]
```
<!-- markdownlint-enable MD046 -->

## Multiline parsing

Par défaut, Alloy envoie une entrée Loki par ligne de log. Pour les stack traces et les exceptions, c'est la galère — chaque ligne arrive séparément, impossible de corréler.

`stage.multiline` agrège les lignes jusqu'à ce que `firstline` matche à nouveau (ou que `max_wait_time` expire).

```alloy
loki.process "multiline_app" {
  forward_to = [loki.write.default.receiver]

  stage.multiline {
    firstline     = "^\\d{4}-\\d{2}-\\d{2}"  // ligne qui commence par une date
    max_wait_time = "3s"
    max_lines     = 128
  }
}
```

- `firstline` : regex qui identifie le **début** d'un nouvel événement
- `max_wait_time` : flush forcé si aucune nouvelle ligne après ce délai (défaut : `5s`)
- `max_lines` : flush forcé au-delà de N lignes (garde-fou contre les dumps infinis)

### Java stack traces

```text
2024-01-15 10:23:45.123 ERROR [main] c.example.MyService - Something went wrong
java.lang.NullPointerException: Cannot invoke method foo()
    at com.example.MyService.doSomething(MyService.java:42)
    at com.example.MyController.handle(MyController.java:18)
```

Les lignes de continuation commencent par une tab ou `Caused by:` — le `firstline` matche le timestamp.

```alloy
loki.process "java_logs" {
  forward_to = [loki.write.default.receiver]

  stage.multiline {
    firstline     = "^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}:\\d{2}"
    max_wait_time = "3s"
    max_lines     = 256
  }

  // Extraire level et logger depuis la première ligne
  stage.regex {
    expression = "^\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}:\\d{2}\\.\\d+\\s(?P<level>\\w+)\\s\\[(?P<thread>[^\\]]+)\\]"
  }

  stage.labels {
    values = {
      level = "",
    }
  }
}
```

### Python tracebacks

```text
Traceback (most recent call last):
  File "/app/main.py", line 42, in handle
    result = process(data)
ValueError: invalid data
```

2 approches : matcher `^Traceback` comme firstline (on groupe à partir de l'exception), ou matcher les lignes qui ne commencent **pas** par un espace (plus générique).

```alloy
loki.process "python_logs" {
  forward_to = [loki.write.default.receiver]

  // Toute ligne qui ne commence pas par un espace = nouveau log
  stage.multiline {
    firstline     = "^[^\\s]"
    max_wait_time = "3s"
    max_lines     = 128
  }
}
```

### Go panics

```text
goroutine 1 [running]:
main.(*Server).handleRequest(...)
    /app/server.go:87 +0x1a4
panic: runtime error: index out of range [3] with length 3
```

Les panics Go commencent par `goroutine` ou `panic:` — on matche les deux.

```alloy
loki.process "go_logs" {
  forward_to = [loki.write.default.receiver]

  stage.multiline {
    firstline     = "^(goroutine|panic:|\\d{4}/\\d{2}/\\d{2})"
    max_wait_time = "3s"
    max_lines     = 64
  }
}
```

### JSON avec stack trace dans un champ

Pattern fréquent avec les frameworks modernes (Logback JSON, structlog...) — le log est une ligne JSON mais le champ `stack_trace` contient un multiline.

```json
{"time":"2024-01-15T10:23:45Z","level":"error","msg":"boom","stack_trace":"goroutine 1...\n\tat main.go:42"}
```

Dans ce cas, **pas besoin de multiline** — chaque ligne est déjà un événement complet. On parse le JSON directement :

```alloy
loki.process "json_logs" {
  forward_to = [loki.write.default.receiver]

  stage.json {
    expressions = {
      level       = "level",
      stack_trace = "stack_trace",
    }
  }

  stage.labels {
    values = {
      level = "",
    }
  }
}
```

## Logs systemd (journal)

Sur du bare metal ou des VMs, les logs applicatifs passent souvent par journald plutôt que des fichiers. `loki.source.journal` lit directement le journal systemd — pas besoin de `local.file_match`.

```alloy
loki.source.journal "systemd" {
  forward_to    = [loki.process.journal.receiver]
  relabel_rules = discovery.relabel.journal.rules
  labels        = {job = "systemd"}
}

discovery.relabel "journal" {
  targets = []

  // Unité systemd comme label (sshd, nginx, docker...)
  rule {
    source_labels = ["__journal__systemd_unit"]
    target_label  = "unit"
  }
  // Priorité syslog comme label (err, warning, info...)
  rule {
    source_labels = ["__journal_priority_keyword"]
    target_label  = "level"
  }
  // Hostname
  rule {
    source_labels = ["__journal__hostname"]
    target_label  = "host"
  }
}

loki.process "journal" {
  forward_to = [loki.write.default.receiver]

  // Ignorer les logs debug et info trop verbeux
  stage.drop {
    expression = ".*systemd.*Started.*"
  }
}

loki.write "default" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

Les labels disponibles depuis `__journal_*` correspondent aux champs journald standards — `_SYSTEMD_UNIT`, `_HOSTNAME`, `PRIORITY`, `_COMM`, etc. On les liste avec :

```bash
journalctl -o json | head -1 | jq 'keys'
```

Par défaut `loki.source.journal` démarre depuis la position courante. Pour rejouer depuis le début (migration initiale) :

```alloy
loki.source.journal "systemd" {
  forward_to = [loki.write.default.receiver]
  path       = "/var/log/journal"
  max_age    = "24h"           // ne pas remonter plus loin que 24h
}
```

!!! warning "Permissions"
    Alloy doit appartenir au groupe `systemd-journal` pour lire le journal :
    ```bash
    usermod -aG systemd-journal alloy
    systemctl restart alloy
    ```

### Alloy en Docker

Depuis un conteneur, `loki.source.journal` ne voit rien sans les bons montages. Il faut exposer le journal de l'hôte et le network host pour que la socket journald soit accessible :

```bash
docker run -d \
  --name alloy \
  --network host \
  -v /etc/alloy/config.alloy:/etc/alloy/config.alloy:ro \
  -v /run/log/journal:/run/log/journal:ro \
  -v /var/log/journal:/var/log/journal:ro \
  -v /etc/machine-id:/etc/machine-id:ro \
  grafana/alloy:latest \
  run /etc/alloy/config.alloy
```

`/etc/machine-id` est requis — Alloy s'en sert pour identifier le journal local. Sans `--network host`, journald n'est pas accessible depuis le conteneur.

Pour vérifier que les logs arrivent bien dans Loki après démarrage :

```bash
# Alloy n'a pas planté
docker logs alloy 2>&1 | grep -i error

# Loki a bien reçu des logs (les labels doivent apparaître)
curl -s http://loki:3100/loki/api/v1/labels | jq '.data'
```

## Helm values K8s (DaemonSet)

Configuration minimale pour déployer Alloy en DaemonSet sur K8s — collecte des logs de tous les pods :

```yaml
alloy:
  configMap:
    content: |
      discovery.kubernetes "pods" {
        role = "pod"
      }

      discovery.relabel "pods" {
        targets = discovery.kubernetes.pods.targets

        rule {
          source_labels = ["__meta_kubernetes_namespace"]
          target_label  = "namespace"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_name"]
          target_label  = "pod"
        }
        rule {
          source_labels = ["__meta_kubernetes_pod_container_name"]
          target_label  = "container"
        }
        // Exclure les namespaces système
        rule {
          source_labels = ["__meta_kubernetes_namespace"]
          regex         = "kube-system"
          action        = "drop"
        }
      }

      loki.source.kubernetes "pods" {
        targets    = discovery.relabel.pods.output
        forward_to = [loki.write.default.receiver]
      }

      loki.write "default" {
        endpoint {
          url = env("LOKI_URL")
        }
      }

controller:
  type: daemonset

rbac:
  create: true

serviceAccount:
  create: true
```

Les variables d'environnement sont injectables directement dans la config via `env("VAR")`.

## Troubleshooting

```bash
# Logs du service
journalctl -u alloy -f

# État des composants via API
curl -s http://localhost:12345/api/v0/web/components | jq '.[] | {name, health}'

# Métriques Alloy lui-même
curl http://localhost:12345/metrics | grep alloy_

# Debug d'un composant spécifique dans l'UI
open http://localhost:12345/component/loki.source.file.app_logs
```

Les erreurs courantes :

- `component evaluation failed` → vérifier que les exports référencés existent bien (typo dans le nom du composant)
- `failed to read targets` → permission sur les fichiers de log (Alloy tourne souvent en `alloy` user)
- `429 Too Many Requests` → rate limiting Loki, ajouter un `loki.process` avec `stage.limit`

## Voir aussi

- [Netdata, Prometheus et Grafana : une stack de monitoring simple et puissante](simple_monitoring_stack.md) — architecture et composants LGTM
- [Générer des alertes depuis Loki](loki_alerting.md) — alerting basé sur les logs collectés
- [Ecrire une métrique custom pour node_exporter](custom_metrics_nodeexporter.md) — métriques complémentaires via textfile
- [2-3 tips pour la stack LGTM](tips_lgtm.md) — API calls pratiques
- [Commandes utiles pour K8S](../../kubernetes/cli/useful_commands.md) — kubectl pour déboguer les pods Alloy en DaemonSet
