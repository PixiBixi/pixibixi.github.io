---
article: docs/monitoring/victoriametrics.md
checked: '2026-11-11'
commit: 8d50b41f65949334942a0f8fcc6e9f9e8a71e21c
sources: []
unpinned: 5
---

# docs/monitoring/victoriametrics.md

## Findings

- L13 IMPRECISE corrigé : "2 à 4 fois moins de RAM" (introuvable en amont) remplacé par "moins de RAM, jusqu'à 7 fois moins d'après le benchmark de l'éditeur", avec le lien du benchmark cité par l'amont. Preuve : VictoriaMetrics `README.md` @origin/master L80 et `docs/victoriametrics/README.md` L50-51 ("up to 7x less RAM than Prometheus, Thanos or Cortex", lien valyala.medium.com).
- L41 IMPRECISE corrigé : titre de l'admonition "La déduplication ne se fait pas à l'ingestion", corps précisé (merges en arrière-plan de vmstorage, et vmselect dédoublonne aussi à la lecture). Preuve : `app/vmstorage/main.go` @origin/cluster L62 et `app/vmselect/main.go` @origin/cluster L82, les deux déclarent `-dedup.minScrapeInterval` (défaut 0).
- L72 IMPRECISE non vérifié : 1,32 s / 0,66 s donne 2 et pas 4, mais la valeur Prometheus du 21 septembre n'est pas dans le tableau (donnée interne). Texte laissé tel quel, voir À signaler.
- L117 IMPRECISE corrigé : ajout "(plafonné à 16 avant la v1.150.0 du cluster)" et "le single-node garde le plafond à 16". Preuve : commit e529d9948 (2026-08-13, #11205) passe de `min(cgroup.AvailableCPUs()*2, 16)` à `cgroup.AvailableCPUs() * 2`, premier tag le contenant v1.150.0-cluster (2026-08-14) ; `app/vmselect/main.go` @origin/cluster L92 ; `app/victoria-metrics/main.go` @origin/master L40 ("2x CPU cores, capped at 16").
- L166 IMPRECISE corrigé : précisé que le calcul de l'opérateur ne s'applique que si `-remoteWrite.maxDiskUsagePerURL` n'est pas fixé, défaut 1 GiB sans `statefulStorage`. Preuve : VictoriaMetrics-operator `internal/controller/operator/factory/vmagent/vmagent.go` @origin/master L51 (`defaultMaxDiskUsage = "1073741824"`) et L1066-1072 ("user defined value must have priority").

## En plus

- Rien.

## Modernisation

- Aucune suggestion fournie.

## Tests

- Aucun test exécuté, vérifications sur les sources (clones VictoriaMetrics et VictoriaMetrics-operator, fetch du jour).

## À signaler

- L72 : vérifier le dénominateur du "ramené à 4 au 21 septembre". Avec le Prometheus du 25 septembre (0,66 s) le ratio du 21 est 2. Soit le Prometheus du 21 était à ~0,33 s (à ajouter au tableau), soit corriger en "2".
- La version VictoriaMetrics des mesures n'est pas indiquée dans l'article. Si elle est antérieure à la v1.150.0-cluster (14 août 2026), le défaut réel était `min(2*CPU, 16)`, identique tant que le limit CPU reste sous 8 coeurs. Ajouter un `tested_with` si la version est connue.
