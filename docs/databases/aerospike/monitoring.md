---
description: "Alerter sur Aerospike avant le stop-writes sur Kubernetes : ses déclencheurs, les règles Prometheus sur la marge au seuil, la prédiction, proto-fd-max et les alertes de backup, avec l'exporter Prometheus et l'Aerospike Kubernetes Operator."
tags:
  - Aerospike
  - Prometheus
  - Alerting
  - Kubernetes
tested_with:
  - "Aerospike Server 8.1"
  - "aerospike-prometheus-exporter 1.36"
  - "Aerospike Backup Service 3.4"
---

# Aerospike sur Kubernetes : stop-writes, prédiction, connexions et backups

Quand un namespace Aerospike passe en stop-writes, les clients reçoivent des rejets d'écriture et l'incident a déjà commencé. Une alerte sur `aerospike_namespace_stop_writes == 1` prévient une fois que c'est trop tard et ne dit même pas lequel des déclencheurs a joué.

Les règles qui suivent préviennent plusieurs heures avant le stop-writes, sur un cluster déployé par l'Aerospike Kubernetes Operator (AKO) avec l'exporter Prometheus en sidecar. Elles couvrent aussi la saturation de `proto-fd-max` et les backups ratés.

## Les déclencheurs du stop-writes

Un namespace passe en stop-writes quand l'un de ces seuils est franchi. Les écritures sont alors rejetées, sauf les deletes, les écritures de réplication et les écritures de migration (source : [référence de configuration Aerospike](https://aerospike.com/docs/database/reference/config)).

- `storage-engine.stop-writes-used-pct` (70 par défaut) : le ratio `data_used_bytes` / `data_total_bytes` du namespace. Le paramètre s'appelait `max-used-pct` avant la 7.0
- `storage-engine.stop-writes-avail-pct` (5 par défaut) : `data_avail_pct` tombe sous le seuil sur un device, un fichier pmem ou en mémoire. Plus de wblocks libres, donc plus rien à écrire. La doc déconseille de descendre sous 5, faute de place pour les écritures de réplication et de migration
- `stop-writes-sys-memory-pct` (90 par défaut) : la mémoire système totale utilisée, y compris celle qui n'est pas à Aerospike. Il protège de l'OOM kill. La doc le marque Enterprise mais le code de l'édition Community le lit et l'applique aussi
- `clock_skew_stop_writes` : une dérive d'horloge entre nœuds, qui a son propre indicateur

2 autres déclencheurs n'existent que si on les configure : `indexes-memory-budget` sur la mémoire des index (0 par défaut, donc désactivé) et les limites par set `stop-writes-count` et `stop-writes-size`.

Les 3 premiers de la liste sont dynamiques. Dans un conteneur, le 3e dépend de la mémoire prise comme référence. Par défaut, c'est la mémoire de l'hôte : un pod limité à une fraction du nœud voit son stop-writes évalué sur la RAM du nœud. L'option de service `cgroup-mem-tracking` calcule le pourcentage contre la limite du cgroup, mais elle vaut `false` par défaut et n'existe que depuis la 8.1.2 (rétroportée en 8.0.0.17 et 7.2.0.19). Elle change aussi la valeur de `system_free_mem_pct`, que lisent les alertes mémoire plus bas.

L'eviction est un mécanisme à part, qui doit se déclencher avant. `evict-used-pct` vaut 0 par défaut, valeur qui la désactive. Les records sans TTL ne sont jamais évictés. Si elle est activée, son seuil reste strictement sous `stop-writes-used-pct`, sinon elle ne sert à rien.

La gauge `aerospike_namespace_stop_writes` ne dit pas lequel des seuils a joué et ne couvre pas la dérive d'horloge, qui passe par son propre flag. Un diagnostic fait une fois ne vaut pas pour la suite : sur un incident, `data_avail_pct` était à 20 au premier relevé puis est tombé à 4 quand le remplissage du nœud a doublé. C'est lui qui a causé 90 minutes de rejets, pendant que `data_used_pct` restait sain.

!!! warning "Un avail_pct bas se traite par le remplissage"
    Avant de toucher au defrag, on regarde `defrag_q` par device. À 0 partout, rien n'est éligible au recyclage : c'est un problème de remplissage et baisser `defrag-sleep` ne change rien.

## Brancher l'exporter avec AKO

L'exporter tourne en sidecar du pod Aerospike, dans la spec du cluster. Il écoute sur le port 9145 et un ServiceMonitor le scrape.

```yaml
podSpec:
  sidecars:
    - name: aerospike-prometheus-exporter
      image: "aerospike/aerospike-prometheus-exporter:1.36.0"
      ports:
        - containerPort: 9145
          name: exporter
```

Les métriques de seuil viennent des statistiques de configuration du namespace et portent chacune les labels `cluster_name`, `ns`, `service` et `storage_engine`. C'est ce dernier label qui permet de soustraire un seuil et une valeur sans réfléchir au type de storage (source : les données de test de l'exporter, tag `v1.36.0`). Les séries utiles :

- `aerospike_namespace_stop_writes` et `aerospike_namespace_clock_skew_stop_writes`
- `aerospike_namespace_data_used_pct` et `aerospike_namespace_storage_engine_stop_writes_used_pct`
- `aerospike_namespace_data_avail_pct` et `aerospike_namespace_storage_engine_stop_writes_avail_pct`
- `aerospike_namespace_stop_writes_sys_memory_pct` et `aerospike_node_stats_system_free_mem_pct`
- `aerospike_namespace_hwm_breached` et `aerospike_namespace_storage_engine_evict_used_pct`
- `aerospike_node_stats_client_connections` et `aerospike_node_stats_proto_fd_max`

## Alerter sur la marge, pas sur le niveau

Une alerte `data_used_pct > 60` casse dès qu'un namespace a un seuil différent ou dès qu'on le change avec `set-config`. On alerte donc sur l'écart entre le seuil que le serveur applique vraiment et la valeur courante. Comme la soustraction se fait 1 pour 1 sur tous les labels, une seule règle couvre tous les storage engines et elle suit un override.

Voici les paires warning et critical pour `used` et `avail`.

```yaml
groups:
  - name: aerospike-stop-writes-margin
    rules:
      - alert: AerospikeUsedCloseToStopWritesWarning
        expr: aerospike_namespace_storage_engine_stop_writes_used_pct - aerospike_namespace_data_used_pct <= 15
        for: 15m
        labels:
          severity: warning
      - alert: AerospikeUsedCloseToStopWritesCritical
        expr: aerospike_namespace_storage_engine_stop_writes_used_pct - aerospike_namespace_data_used_pct <= 4
        for: 5m
        labels:
          severity: critical
      - alert: AerospikeAvailCloseToStopWritesWarning
        expr: aerospike_namespace_data_avail_pct - aerospike_namespace_storage_engine_stop_writes_avail_pct <= 15
        for: 15m
        labels:
          severity: warning
      - alert: AerospikeAvailCloseToStopWritesCritical
        expr: aerospike_namespace_data_avail_pct - aerospike_namespace_storage_engine_stop_writes_avail_pct <= 4
        for: 5m
        labels:
          severity: critical
```

Le critical réveille l'oncall la nuit, son seuil se justifie donc par le temps qu'il laisse. On l'a d'abord mis à 8 points et il sonnait toutes les nuits sur le cycle quotidien du remplissage, d'une amplitude de l'ordre de 8 points. À 4 points, il reste environ 1h45 au pire de la rampe de l'après-midi (2,25 points par heure), un délai suffisant pour agir. Le warning à 15 points couvre la tendance.

Le même raisonnement vaut pour la mémoire système. La marge se calcule contre `stop-writes-sys-memory-pct`, avec la mémoire utilisée déduite de la mémoire libre du nœud.

```yaml
- alert: AerospikeFreeMemoryCloseToStopWrites
  expr: (aerospike_namespace_stop_writes_sys_memory_pct - on(pod) group_left() (100 - aerospike_node_stats_system_free_mem_pct)) <= 10
  for: 3m
  labels:
    severity: warning
```

Côté nœud, une alerte critical sur `system_free_mem_pct < 12` sonne avant le stop-writes, qui se déclenche sous 10 % de mémoire libre avec la valeur par défaut de 90. Le warning à 15 % flappait quand la métrique, un entier, restait posée sur 15. On lui a donné de l'hystérésis : une fois déclenchée, l'alerte ne se résout qu'au-dessus de 17 %, puis reste active 15 minutes.

```yaml
- alert: AerospikeLowSystemMemoryWarning
  expr: |
    aerospike_node_stats_system_free_mem_pct < 15
    or (aerospike_node_stats_system_free_mem_pct < 17 and on(namespace, pod) ALERTS{alertname="AerospikeLowSystemMemoryWarning", alertstate="firing"})
  for: 3m
  keep_firing_for: 15m
  labels:
    severity: warning
```

## Prédire le stop-writes

Un seuil fixe de 15 points flappe sur le cycle quotidien. On ajoute 2 prédictions, une lente et une rapide.

La première calcule les jours restants à partir du volume de données du cluster entier. Le max sur 1 jour écrase le cycle quotidien, puis on prend la pente sur 6 jours.

```yaml
groups:
  - name: aerospike-capacity-rules
    interval: 5m
    rules:
      - record: aerospike:namespace:data_used_bytes:sum
        expr: sum by (cluster_name, ns) (aerospike_namespace_data_used_bytes)
      - record: aerospike:namespace:data_used_bytes:max1d
        expr: max_over_time(aerospike:namespace:data_used_bytes:sum[1d])
      - record: aerospike:namespace:stop_writes_used_bytes
        expr: |
          sum by (cluster_name, ns) (aerospike_namespace_data_total_bytes)
          * on(cluster_name, ns)
          min by (cluster_name, ns) (aerospike_namespace_storage_engine_stop_writes_used_pct) / 100
      - record: aerospike:namespace:days_to_stop_writes_used
        expr: |
          (aerospike:namespace:stop_writes_used_bytes - aerospike:namespace:data_used_bytes:max1d)
          / (deriv(aerospike:namespace:data_used_bytes:max1d[6d]) * 86400 > 0)
          and on(cluster_name, ns) (count_over_time(aerospike:namespace:data_used_bytes:max1d[6d]) > 1584)
```

Le garde-fou `count_over_time > 1584` supprime la valeur tant qu'il manque 5,5 jours d'historique (1584 points à 5 minutes). Sans lui, la pente d'une fenêtre de quelques heures suit la rampe quotidienne et prédit n'importe quoi. Si l'intervalle du groupe change, il faut le recalculer : un intervalle plus long empêche d'atteindre 1584 points et la règle ne produit plus rien, un intervalle plus court rend le garde-fou trop laxiste.

L'alerte consomme cet enregistrement avec 3 filtres : moins de 14 jours, un namespace à moins de 25 points de son seuil (ça écarte les petits namespaces) et une coupure de 9 jours après un changement du nombre de nœuds, parce que les migrations font plonger puis remonter les octets utilisés et fabriquent une fausse pente.

```yaml
- alert: AerospikeUsedStopWritesPredictedWarning
  expr: |
    aerospike:namespace:days_to_stop_writes_used < 14
    and on(cluster_name, ns) (min by (cluster_name, ns) (aerospike_namespace_storage_engine_stop_writes_used_pct - aerospike_namespace_data_used_pct) <= 25)
    unless on(cluster_name) (time() - aerospike:cluster:expected_size_changed_at < 9 * 86400)
  for: 6h
  keep_firing_for: 1d
  labels:
    severity: warning
```

La série `aerospike:cluster:expected_size_changed_at` est un timestamp qu'on enregistre nous-mêmes à partir de la taille attendue du cluster (le nombre de replicas du StatefulSet). Elle n'existe pas dans l'exporter.

La seconde prédiction couvre la croissance rapide, celle que la fenêtre de 6 jours met des jours à voir. `predict_linear` projette l'utilisation à 12h sur les 6 dernières heures, par pod.

```yaml
- alert: AerospikeUsedStopWritesImminentWarning
  expr: |
    max by (cluster_name, ns, pod) (predict_linear(aerospike_namespace_data_used_pct[6h], 12 * 3600))
      >= on(cluster_name, ns, pod) max by (cluster_name, ns, pod) (aerospike_namespace_storage_engine_stop_writes_used_pct)
    and on(cluster_name, ns, pod) (max by (cluster_name, ns, pod) (aerospike_namespace_storage_engine_stop_writes_used_pct - aerospike_namespace_data_used_pct) <= 20)
  for: 2h
  keep_firing_for: 1h
  labels:
    severity: warning
```

Le garde-fou à 20 points écarte le remplissage brutal qui suit le redémarrage d'un pod. Le `for: 2h` écarte la rampe de l'après-midi. À 30 minutes, l'alerte s'est déclenchée 3 fois en 30 jours sur le cycle quotidien.

Aucun critical n'est associé à la prédiction. Elle prévient des jours à l'avance et l'oncall ne peut rien y faire à 3h du matin : on l'a essayé, il a sonné 6 jours de suite sur un cluster. L'alerte nocturne reste le critical à 4 points.

!!! warning "La prédiction demande de l'historique local"
    La fenêtre de 6 jours exige 5,5 jours de données là où la règle est évaluée. Un Prometheus à la rétention plafonnée en taille (33 heures de données sur un de nos clusters) ne la verra jamais. C'est pour ça que le warning à 15 points reste à côté, puisqu'il ne dépend pas de l'historique.

## Une seule alerte pendant le stop-writes

Quand le stop-writes est déjà là, on veut être prévenu une seule fois. Le flag oscille quand un nœud se tient sur un seuil : une alerte `== 1` brute a sonné 8 fois en rafales de 1 à 5 minutes pour une seule panne de 90 minutes. On regarde donc le max sur 15 minutes, qui recouvre les trous observés et fusionne les rafales.

```yaml
- alert: AerospikeNamespaceStopWrites
  expr: max_over_time(aerospike_namespace_stop_writes[15m]) == 1
  for: 3m
  labels:
    severity: disaster
- alert: AerospikeNamespaceClockSkewStopWrites
  expr: aerospike_namespace_clock_skew_stop_writes == 1
  for: 3m
  labels:
    severity: critical
```

Avec `keep_firing_for`, la fenêtre de 15 minutes serait inutile. Le chart de règles ne le supportait pas quand cette alerte a été écrite. Les autres règles de cet article l'utilisent depuis sa mise à jour et celle-ci pourrait être réécrite avec.

## Garder de la marge sur proto-fd-max

`proto-fd-max` plafonne les descripteurs de fichiers ouverts pour les connexions clients, à 15000 par défaut, dynamique, minimum 1024. À 100 %, le nœud refuse les nouvelles connexions, probes comprises. Chez nous, des clients ont été refusés au plafond avec de l'ordre d'un millier de pods applicatifs.

La valeur est passée à 100000 dans la spec AKO. Avec `enableDynamicConfigUpdate`, le changement s'applique par `set-config` sans redémarrage. La limite `nofile` du conteneur doit rester au-dessus.

```yaml
enableDynamicConfigUpdate: true
aerospikeConfig:
  service:
    proto-fd-max: 100000
```

Les 2 alertes se font par nœud, puisqu'un seul nœud peut saturer pendant que les autres restent calmes. Le warning à 80 % laisse le temps de réagir (monter la limite ou comprendre qui ouvre les connexions) et le critical à 95 % sonne vite parce qu'il reste peu de marge.

```yaml
- alert: AerospikeClientConnectionsWarning
  expr: 100 * aerospike_node_stats_client_connections / aerospike_node_stats_proto_fd_max > 80
  for: 10m
  labels:
    severity: warning
- alert: AerospikeClientConnectionsCritical
  expr: 100 * aerospike_node_stats_client_connections / aerospike_node_stats_proto_fd_max > 95
  for: 2m
  labels:
    severity: critical
```

## Alerter sur les backups

L'Aerospike Backup Service (ABS) expose son propre `/metrics`. Sans ServiceMonitor dessus, aucune règle de backup ne peut sonner. Dans notre déploiement, le sélecteur du ServiceMonitor doit correspondre aux labels du Service que crée AKO et pas à ceux du chart : renommer le Service coupe le scrape, donc les alertes, sans erreur visible.

3 règles suffisent.

```yaml
groups:
  - name: aerospike-backup
    rules:
      - alert: AerospikeBackupDidNotComplete
        expr: |
          time() - max by (namespace, routine) (
            aerospike_backup_service_last_successful_backup_timestamp{routine!~".+-data-full"}
          ) > 28 * 3600
        for: 15m
        labels:
          severity: warning
      - alert: AerospikeBackupRunFailed
        expr: increase(aerospike_backup_service_failure_total[1h]) > 0
        for: 5m
        labels:
          severity: warning
      - alert: AerospikeBackupServiceDown
        expr: absent(up{job="aerospike-backup-service"}) or up{job="aerospike-backup-service"} == 0
        for: 15m
        labels:
          severity: warning
```

- `Did Not Complete` est la vraie alerte. Les routines tournent 1 fois par jour et le seuil est de 28 heures plutôt que 24 car la plus longue dure plus de 3 heures et peut démarrer 40 minutes après le début de la fenêtre. Une nuit lente mais réussie ne sonne pas. Un run manqué sonne environ 4 heures après. Le `max by (namespace, routine)` écarte le label `pod`, pour qu'un remplacement du pod ABS ne double pas l'alerte. Les routines `data-full` sont exclues parce qu'on ne les lance qu'à la main
- `Run Failed` donne un signal plus rapide, mais ne dit pas quelle routine a échoué. Le compteur `failure_total` ne compte que les backups full (les incrémentaux ont leur `incremental_failure_total`), sans label de routine. Il est marqué déprécié dans ABS 3.4 au profit de `aerospike_backup_service_backup_events_total`, qui porte `routine`, `type` et `outcome`. Sur une version récente, c'est lui qu'on utilise. `increase()` gère la remise à zéro d'un redémarrage de pod
- `Service Down` couvre l'angle mort des 2 autres : si ABS tombe, ses séries disparaissent et la règle de péremption se tait. `absent()` ferme ce trou et couvre aussi le cas où le pod va bien mais où le scrape est cassé

Pour les silences, on ne s'appuie pas sur un `inhibit_rule` d'Alertmanager mais sur `unless` dans la règle, comme pour la coupure de 9 jours après un changement de taille du cluster. L'exclusion vit dans la règle qu'elle concerne et se relit avec elle.

## Pièges

- **Réduire le nombre de nœuds** fait monter `data_used_pct` par nœud de plusieurs points d'un coup. On vérifie la marge au stop-writes avant un scale-down.
- **`set-config` n'accepte pas la clé telle que `get-config` la renvoie.** `get-config` donne `storage-engine.stop-writes-used-pct`, `set-config` veut la forme nue et répond `ERROR:4` sinon.
- **Un override `set-config` est du runtime pur**. Il disparaît au remplacement du pod sans rien à nettoyer dans git. Il est légitime sur `used_pct`. Sur `avail_pct`, on échange un rejet maîtrisé contre l'impossibilité d'allouer un wblock, un compromis beaucoup moins défendable.
- **Un seuil absolu ignore l'override.** Alerter sur la marge au seuil exposé par l'exporter suit le changement tout seul.
- **Une métrique entière sur un seuil flappe.** `system_free_mem_pct` est un entier : sans hystérésis, une alerte posée sur 15 sonne toutes les quelques minutes.
- **Un critical trop large sonne toutes les nuits.** On dimensionne la marge sur la pente du pire moment de la journée, pas sur une intuition.

Cette commande pose un override en urgence puis le relit :

```console
$ asinfo -v "set-config:context=namespace;id=my-namespace;stop-writes-used-pct=98"
ok
$ asinfo -v "get-config:context=namespace;id=my-namespace" | tr ';' '\n' | grep stop-writes
storage-engine.stop-writes-avail-pct=5
storage-engine.stop-writes-used-pct=98
stop-writes-sys-memory-pct=90
```
