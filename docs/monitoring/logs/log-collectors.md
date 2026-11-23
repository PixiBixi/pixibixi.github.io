---
description: "Fluent Bit évicte des chunks de son buffer filesystem avec un simple warning quand le backend ralentit : la perte mesurée, storage.pause_on_chunks_overlimit qui la supprime, puis Fluent Bit, Vector, OTel Collector et vlagent comparés en débit, CPU et RAM."
tags:
  - Fluent Bit
  - Vector
  - OpenTelemetry
  - VictoriaLogs
  - Logging
series: "Logs self-hosted"
series_order: 2
---

# Choisir son collecteur de logs

Quand le backend de logs ne suit plus le débit, c'est le collecteur qui encaisse. Avec un buffer filesystem plafonné, Fluent Bit jette alors des chunks entiers et ne le signale que par un warning, qu'une alerte sur les erreurs ne voit pas. Les mesures viennent du même banc que le [comparatif des backends de logs](log-backends.md) : les mêmes logs Kubernetes JSON, réécrits au format CRI dans `/var/log/pods`, la même chaîne de traitement pour chaque collecteur et VictoriaLogs en sortie.

## Fluent Bit évicte des chunks en silence

En production, les logs se perdent surtout quand le backend ralentit. Fluent Bit continue alors à lire les fichiers et accumule des chunks dans son buffer filesystem. Quand le buffer atteint `storage.total_limit_size` côté output, il évicte les chunks les plus anciens et le signale par un simple warning :

```console
[ warn] [input chunk] chunk '1-1794532763.617059426.flb' evicted from output queue to make room under storage.total_limit_size: input=tail.0 > output=http.0 (out_id=0), bytes=2428928, limit=1000000000
```

Sur un backlog de 3 millions de lignes avec un buffer de 1 Go, 23 % des lignes ont été perdues sans aucune ligne `[error]`. Une alerte ou un test qui ne compte que les erreurs passe à côté. La métrique à suivre est `fluentbit_input_ingestion_paused`, ou à défaut l'écart entre `fluentbit_input_records_total` et `fluentbit_output_proc_records_total`.

Le réglage qui supprime la perte est côté input : `storage.pause_on_chunks_overlimit` met la lecture en pause quand le buffer est plein, au lieu de laisser l'output faire de la place. Les fichiers restent sur le nœud et Fluent Bit reprend là où il s'était arrêté.

```ini title="fluent-bit.conf (extrait)"
[INPUT]
    Name              tail
    storage.type      filesystem
    storage.pause_on_chunks_overlimit On

[OUTPUT]
    Name              http
    storage.total_limit_size  1G
```

Sur le même backlog, cette seule ligne fait passer la livraison de 77 % à 100 % et le débit de 15,6k à 36,3k lignes/s. Ajouter `threaded On` sur l'input et 2 `Workers` sur l'output sans la pause n'arrange rien : 64 % des lignes livrées.

!!! warning "La pause déplace le risque sur la rotation"
    Pendant la pause, les logs restent dans les fichiers du kubelet. Si la pause dure plus longtemps que la rotation (`containerLogMaxSize` et `containerLogMaxFiles`), les fichiers tournés sont perdus. Le compromis reste meilleur qu'une éviction silencieuse, sans rien garantir.

## Fluent Bit, Vector ou OTel Collector

Les 3 collecteurs reçoivent la même chaîne de traitement : lecture des fichiers CRI de `/var/log/pods`, jointure des lignes partielles, métadonnées tirées du chemin, merge du JSON sans garder `log`, allowlist de namespaces, filtre des access logs HAProxy en 2xx et 3xx et niveau pino converti en chaîne. Chacun dispose de 1 CPU, 1 Go de RAM et d'un buffer sur disque et envoie vers VictoriaLogs.

2 tests se complètent. Le test de backlog lit le plus vite possible 3 millions de lignes déjà écrites, comme après un redémarrage du collecteur, et mesure sa marge. Le débit fixe écrit 500 puis 5000 lignes/s pendant 3 minutes dans des fichiers qui grossissent, comme sur un nœud, et mesure ce que le collecteur coûte en régime permanent.

| Collecteur | Version | Débit max (lignes/s) | Lignes livrées | CPU à 500/s | RAM à 500/s | CPU à 5000/s | RAM à 5000/s |
|---|---|---|---|---|---|---|---|
| Fluent Bit, buffer qui évicte | 5.2.0 | 15,6k | 77 % | 6 % | 65 MiB | 23 % | 646 MiB |
| Fluent Bit avec pause | 5.2.0 | 36,3k | 100 % | 5 % | 97 MiB | 19 % | 696 MiB |
| Vector | 0.61.0 | 32,9k | 100 % | 9 % | 163 MiB | 21 % | 192 MiB |
| OTel Collector contrib | 0.165.0 | 43,1k | 100 % | 18 % | 387 MiB | 28 % | 413 MiB |

Le CPU est en pourcentage d'un cœur. Les colonnes à débit fixe de « Fluent Bit avec pause » ont été mesurées avec `threaded On` et 2 workers en plus, sans effet visible en régime permanent. La RAM de Fluent Bit grimpe vite avec le débit parce que les chunks du buffer filesystem sont mappés en mémoire et comptés dans le conteneur.

À un débit réaliste par nœud, les 3 collecteurs coûtent moins de 0,2 cœur. Changer de collecteur ne fait donc pas gagner de ressources. Fluent Bit reste le plus sobre en régime permanent et Vector le plus stable en RAM quand le débit monte. OTel Collector demande 4 fois la RAM de Fluent Bit, ce qui se justifie surtout si les traces passent par le même agent. Les écarts de livraison restent marginaux : Fluent Bit livre quelques lignes de trop sur 900 000, probablement des lignes partielles émises à part quand le morceau final arrive dans un flush suivant. Vector en perd 2 sur 900 000 et OTel Collector est exact sur tous les runs.

### vlagent n'est pas encore à iso-fonction

vlagent, le collecteur de VictoriaLogs, recolle les lignes CRI partielles, parse le JSON et le niveau de log. Il ne filtre en revanche que sur les métadonnées Kubernetes (`-kubernetesCollector.excludeFilter`) : pas d'allowlist par image, pas de filtre sur le contenu et pas de multiline applicatif. Une chaîne qui jette les access logs 2xx à la source ne se reproduit pas avec lui aujourd'hui.

## Voir aussi

- [Choisir son backend de logs](log-backends.md), le comparatif des backends mesuré sur le même jeu de données
- [Logs HAProxy dans Fluent Bit](../../web/haproxy/logs_fluentbit.md) pour les parsers HAProxy utilisés dans la chaîne
