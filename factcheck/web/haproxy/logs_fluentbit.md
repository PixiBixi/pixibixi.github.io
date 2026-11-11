---
article: docs/web/haproxy/logs_fluentbit.md
checked: '2026-11-11'
commit: 91e296e5f354e3540afec6972e9ea9ebf13a7c47
sources:
- repo: fluent-fluent-bit
  path: plugins/filter_log_to_metrics/log_to_metrics.c
  lines: 349-372
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit
  path: plugins/filter_log_to_metrics/log_to_metrics.c
  lines: 249-270
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit
  path: plugins/filter_parser/filter_parser.c
  lines: 296-330
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit
  path: src/flb_parser.c
  lines: 606-638
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit
  path: src/flb_parser.c
  lines: 1003-1008
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit
  path: src/flb_time_tz.c
  lines: 221-222
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit
  path: src/flb_parser.c
  lines: 606-638
  ref: v5.0.7
  commit: 5880717dd881b8839850a4645996de1ac47b1a5d
- repo: fluent-fluent-bit
  path: conf/parsers.conf
  lines: 120-125
  ref: origin/master
  commit: d9464c001e4ab5a17b8dac566e4f7ab25c2bcb0b
- repo: fluent-fluent-bit-docs
  path: pipeline/filters/log_to_metrics.md
  lines: 32-44
  ref: origin/master
  commit: 75f6d7a27fa7b3b77cd67e2b42c5690562884bbb
- repo: fluent-fluent-bit-docs
  path: pipeline/parsers/regular-expression.md
  lines: 46-48
  ref: origin/master
  commit: 75f6d7a27fa7b3b77cd67e2b42c5690562884bbb
- repo: fluent-fluent-bit-docs
  path: pipeline/parsers/configuring-parser.md
  lines: 29-29
  ref: origin/master
  commit: 75f6d7a27fa7b3b77cd67e2b42c5690562884bbb
- repo: haproxy
  path: src/log.c
  lines: 5694-5741
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: src/session.c
  lines: 433-502
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: src/mux_h1.c
  lines: 4030-4037
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: src/check.c
  lines: 557-560
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: src/errors.c
  lines: 245-275
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: src/http_ana.c
  lines: 5095-5120
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: doc/configuration.txt
  lines: 30406-30445
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: doc/configuration.txt
  lines: 31224-31520
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
- repo: haproxy
  path: doc/configuration.txt
  lines: 10916-10932
  ref: origin/master
  commit: 63d25783f4346156c25d5a422eab7e12a2df966b
unpinned: 4
---

# docs/web/haproxy/logs_fluentbit.md

## Findings

- L229-231 ERROR corrigé : dans le 2e filtre `log_to_metrics`, `regex: error .` est écrit avant `exclude: error ^Success$`. Les règles sont évaluées dans l'ordre de la config et le premier `regex` qui matche retourne `KEEP` sans lire la suite : l'`exclude` n'est jamais atteint pour une ligne `Success`, qui est comptée dans `haproxy_log_conn_errors_total`. Rejoué sur Fluent Bit 5.0.9 avec les parsers de l'article : `haproxy_log_conn_errors_total{frontend="http-in"} 1` pour la ligne `http-in/-: Success (-)`. En mettant `exclude` avant `regex`, la série disparaît. Corriger l'ordre des clés (et la phrase du L122 qui présente l'`exclude` comme efficace). Preuve : plugins/filter_log_to_metrics/log_to_metrics.c:349-372 @ origin/master, plugins/filter_log_to_metrics/log_to_metrics.c:249-270 @ origin/master
- L122 IMPRECISE corrigé : « Le format par défaut ne le fait pas ». Les requêtes invalides sont journalisées aussi sans `error-log-format`, mais avec le `log-format` normal (forme httplog, `<BADREQ>`, status 400). `error-log-format` ne crée donc pas ces lignes, il les fait passer du format httplog au format d'erreur : elles quittent le compteur de 4xx (L241 compte les abandons en 400 parmi les 4xx) et arrivent en `error` à `Success`. À reformuler. Preuve : src/log.c:5727-5741 @ origin/master, src/mux_h1.c:4030-4037 @ origin/master
- L173 IMPRECISE corrigé : les changements d'état de serveur sont aussi envoyés aux loggers (ligne `Server api/api-01 is DOWN, reason: ...` sans préfixe `[WARNING]`), donc sur stdout avec `log stdout format raw`, en plus de stderr. Cette variante ne matche aucun des 3 parsers. Preuve : src/check.c:557-560 @ origin/master
- L97 IMPRECISE corrigé : `error` s'arrête au premier `(`. Le message `Stopped a TLSv1 heartbeat attack (CVE-2014-0160)` donnerait `ssl_error` = `CVE-2014-0160`. Cas marginal, à mentionner ou ignorer. Preuve : doc/configuration.txt:26145-26200 @ origin/master

Vérifié exact, entre autres : `time_zone` absent avant 5.0.7 et `UTC` refusé (`invalid or unavailable time_zone 'UTC'`, `Etc/UTC` accepté), `reserve_data` et `preserve_key` du filtre `parser`, record laissé intact sur échec, regex `cri` identique à `conf/parsers.conf`, `status` `-1` pour `CC`/`CQ`, `ta` et `retries` préfixés par `+`, `unix` à la place de l'IP, `dontlog-normal` qui masque les 4xx, tableau des termination states, `[sSRI].`, alias `fc_err_str` `Success`, `bind :443` IPv4 seul, `accept-proxy` et `set-src`, labels `code` de l'exporter Prometheus intégré, format `[WARNING]  (8) :`, règles Prometheus valides à `promtool check rules` (3 règles), métriques exposées conformes aux noms de l'article.

## Unpinned

- `Fluent Bit en DaemonSet` avec `tail` sur `/var/log/containers/haproxy-*.log` : hypothèse de déploiement, aucune source.
- Le `cri` de `parsers.conf` « n'est chargé que par la config par défaut » : non lu dans `conf/fluent-bit.conf` ni dans l'image.
- `CH` journalisé en 400 (L67, L241) : la doc HAProxy ne donne pas le code pour `CH`, seul le chemin `CR` est confirmé dans http_ana.c.
- Lien `docs.haproxy.org/3.4/configuration.html#8.2.3` : l'ancre n'a pas été ouverte, la section existe dans le texte de `doc/configuration.txt`.
