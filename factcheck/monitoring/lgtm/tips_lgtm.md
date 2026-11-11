---
article: docs/monitoring/lgtm/tips_lgtm.md
checked: '2026-11-11'
commit: 06111696d53f4ba8b1fb59c6f5a563f4d8cccea2
sources: []
unpinned: 1
---

# docs/monitoring/lgtm/tips_lgtm.md

## Findings

- L71 IMPRECISE corrigé (complété) : la commande v1 est juste et conservée ; ajout de l'endpoint `/api/v2/search/tags` (tags groupés par scope) avec un `jq` adapté. Preuve : tempo `pkg/api/http.go:87` (`/api/search/tags`), `:89` (`/api/echo`), `:101` (`/api/v2/search/tags`) et `pkg/tempopb/tempo.proto:271-284` (`tagNames`, `scopes[].name/tags`) @ origin/main (clone créé dans ~/Documents/work/src/tempo). Test `grafana/tempo:2.9.0` : v1 renvoie `{"tagNames":[]...}`, v2 `{"scopes":[{"name":"intrinsic","tags":[...]}]}`, `/api/echo` renvoie `echo`.

## En plus

- Aucune.

## Modernisation

- Aucune suggestion.

## Tests

- Docker `grafana/tempo:2.9.0` monolithique, stockage local ; jq testé sur la forme de réponse v2.

## À signaler

- Loki et Grafana non revérifiés (hors findings).
