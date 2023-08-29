# Ecrire une métrique custom pour node_exporter

Grace au module textfile de node_exporter, nous pouvons introduire facilement des métriques dans ce dernier.

Voici un petit script bash qui va vous permettre d'avoir vos métriques customs

```
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

Il est évidemment possible d'écrire un script custom en n'importe quel language (python, bash...).

La communauté prometheus met en libre services [quelques scripts](https://github.com/prometheus-community/node-exporter-textfile-collector-scripts) qui peuvent être utiles (métriques NVME, updates APT...)
