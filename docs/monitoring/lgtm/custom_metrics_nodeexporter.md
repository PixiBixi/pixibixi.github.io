---
description: "Métriques custom node_exporter via le collector textfile, alerte sur un textfile périmé, coût des collectors tcpstat et ethtool et limite CPU en DaemonSet."
tags:
  - Prometheus
  - node_exporter
tested_with:
  - "node_exporter 1.12"
---

# node_exporter en production : métriques textfile, collectors tcpstat et ethtool, limite CPU

Grace au module textfile de node_exporter, nous pouvons introduire facilement des métriques dans ce dernier. Ces métriques seront ensuite collectées par [Prometheus](simple_monitoring_stack.md) et visualisées dans Grafana.

Voici un petit script bash qui va vous permettre d'avoir vos métriques customs

```bash
#!/usr/bin/env bash

# Adjust as needed.
TEXTFILE_COLLECTOR_DIR=/var/lib/node_exporter/textfile_collector/
# Note the start time of the script.
START="$(date +%s)"

# Your code goes here.
sleep 10

# Write out metrics to a temporary file.
END="$(date +%s)"
cat << EOF > "$TEXTFILE_COLLECTOR_DIR/myscript.prom.$$"
myscript_duration_seconds $(($END - $START))
myscript_last_run_seconds $END
EOF

# Rename the temporary file atomically.
# This avoids the node exporter seeing half a file.
mv "$TEXTFILE_COLLECTOR_DIR/myscript.prom.$$" \
  "$TEXTFILE_COLLECTOR_DIR/myscript.prom"

```

La chose importante ici est l'utilisation d'un fichier temporaire en .$$ (qui contient le PID du process bash) afin de garantir une atomicité des données pour ne pas avoir de données corrompues (node_exporter ne scrape que les fichiers en .prom)

Le collector textfile est actif par défaut mais ne lit rien tant qu'on ne lui donne pas de dossier : `--collector.textfile.directory` est vide par défaut. On lance donc node_exporter avec le même dossier que le script :

```sh
node_exporter --collector.textfile.directory=/var/lib/node_exporter/textfile_collector/
```

Il est évidemment possible d'écrire un script custom en n'importe quel language (python, bash...).

La communauté prometheus met en libre services [quelques scripts](https://github.com/prometheus-community/node-exporter-textfile-collector-scripts) qui peuvent être utiles (métriques NVMe, updates APT...)

## Alerter sur un textfile périmé

Quand le script cesse de tourner, node_exporter continue de servir le dernier contenu du fichier. La métrique reste plausible pendant des jours. Pour détecter ça, on regarde l'âge du fichier avec `node_textfile_mtime_seconds`, exposée pour chaque fichier lu avec succès.

```yaml
groups:
  - name: node-exporter-textfile
    rules:
      - alert: OldMetricsTextfile
        expr: time() - node_textfile_mtime_seconds > 3 * 3600
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Textfile {{ $labels.file }} not updated for more than 3h on {{ $labels.instance }}"
      - alert: TextfileScrapeError
        expr: node_textfile_scrape_error == 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "node_exporter fails to parse a textfile on {{ $labels.instance }}"
```

Le seuil de 3h est une valeur de départ, à caler sur la fréquence réelle du script le plus lent. Un fichier supprimé ou illisible n'émet plus de `node_textfile_mtime_seconds` : l'expression ci-dessus ne le voit donc pas. `node_textfile_scrape_error` couvre le cas du fichier mal formé. Un `absent()` ciblé sur le `file` attendu couvre celui du fichier disparu.

Sur un parc important, une panne de CronJob touche beaucoup de nodes en même temps. Une règle d'inhibition ou une agrégation par cluster évite des centaines de notifications pour une cause unique.

## tcpstat et ethtool : 2 collectors à activer avec prudence

Les collectors par défaut suffisent à la plupart des dashboards. 2 collectors désactivés par défaut sont tentants mais n'ont pas le même coût.

`tcpstat` expose une seule métrique, `node_tcp_connection_states{state}`. Peu de séries, mais le collector interroge le noyau par netlink (`NLM_F_DUMP`) et parcourt tous les sockets TCP à chaque scrape. Le README amont prévient de problèmes de performance sous forte charge, et sur des nodes à très fort trafic ce dump a fait OOMKill le pod chez nous. On l'active avec une limite mémoire réaliste, ou pas du tout sur les pools réseau intensifs.

`ethtool`, non filtré, expose chaque compteur de chaque interface, soit environ 630 séries par node chez nous. `--collector.ethtool.device-include` (vide par défaut) et `--collector.ethtool.metrics-include` (`.*` par défaut) limitent à ce qu'on lit vraiment :

```yaml
prometheus-node-exporter:
  extraArgs:
    - --collector.ethtool
    - --collector.ethtool.device-include=^(eth|ens)\d+$
    - --collector.ethtool.metrics-include=^(rx|tx)_(dropped|errors|missed|discards).*$
```

Ces regex sont un point de départ : les noms de compteurs varient d'un driver à l'autre, on les liste d'abord avec `ethtool -S <interface>` sur un node.

!!! warning "Une liste Helm remplace la liste du chart"
    `extraArgs` a des valeurs par défaut dans le chart `prometheus-node-exporter` (les exclusions de filesystems). Ajouter un flag dans nos values écrase toute la liste. Il faut donc recopier les 2 flags `--collector.filesystem.*` du chart en plus des nôtres.

En DaemonSet, on ne pose pas de limite CPU sur node_exporter : il lit `/proc` et `/sys` en rafale à chaque scrape, le quota CFS coupe ces rafales et le scrape dépasse son timeout sur les nodes chargés. Le mécanisme est détaillé dans [CPU throttling sur Kubernetes](../../kubernetes/deployment/cpu_throttling.md).

## Voir aussi

- [Netdata, Prometheus et Grafana : une stack de monitoring simple et puissante](simple_monitoring_stack.md) - architecture complète de collecte des métriques
- [Grafana Alloy](alloy.md) - alternative moderne pour collecter logs et métriques
- [CPU throttling sur Kubernetes](../../kubernetes/deployment/cpu_throttling.md) - pourquoi une limite CPU ralentit les scrapes
