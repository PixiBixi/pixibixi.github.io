---
article: docs/databases/elasticsearch/log_slow_queries.md
checked: '2026-11-11'
commit: 72acc5680d3328f198e0a86efff16fba22f9cd78
sources: []
unpinned: 3
---

# docs/databases/elasticsearch/log_slow_queries.md

## Findings

- L11 IMPRECISE rejeté : "Par défaut, rien n'est log" est exact, rien à changer. Preuve : ES 9.2.0, `GET test/_settings?include_defaults=true` renvoie `-1` pour les 8 seuils `index.search.slowlog.threshold.*` et les 4 `index.indexing.slowlog.threshold.index.*`.
- L30 IMPRECISE corrigé : seuils query passés à warn 10s / info 5s / debug 2s / trace 500ms (exemple officiel cité par le finding), avec une phrase expliquant pourquoi ils doivent décroître. Preuve : PUT accepté (`acknowledged: true`) sur ES 9.2.0. La règle "loggé au niveau le plus sévère dépassé" vient du finding et de la doc, pas lue dans le code ES (pas de clone local).
- L41 IMPRECISE corrigé : emplacement précisé (`path.logs`, /var/log/elasticsearch en deb/rpm, fichier `*_index_search_slowlog.json`, stdout en Docker) et rôle de log4j2.properties (appender et niveau, seuils en index settings). Preuve : dans l'image 9.2.0, `config/log4j2.properties` déclare `appender.index_search_slowlog_rolling.type = Console` (slowlog vu dans `docker logs`), `config/log4j2.file.properties` déclare un `RollingFile` sous `${sys:es.logs.base_path}`.

## En plus

- L27 : la commande curl ne marchait pas (`-H Content-Type: application/json` sans quotes, `-d` sans argument, JSON sur les lignes suivantes jamais envoyé). Corrigée avec `-H 'Content-Type: application/json' -d '...'`. Preuve : la commande corrigée, exécutée contre ES 9.2.0, renvoie `acknowledged: true`.
- `tested_with: Elasticsearch 9.2.0` ajouté.

## Modernisation

- Slowlog JSON : appliqué (nom de fichier `*_index_search_slowlog.json`).
- `index.search.slowlog.include.user` : appliqué en une phrase. Preuve : setting présent dans les defaults (false) et accepté à `true` sur 9.2.0.

## Tests

- Conteneur `docker.elastic.co/elasticsearch/elasticsearch:9.2.0` (single-node, sécurité désactivée), supprimé après test.

## À signaler

- Le préfixe exact du fichier (nom du cluster) n'a pas été lu en entier (ligne tronquée dans log4j2.file.properties), d'où le `*_` dans l'article.
