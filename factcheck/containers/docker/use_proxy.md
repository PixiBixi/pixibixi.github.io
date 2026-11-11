---
article: docs/containers/docker/use_proxy.md
checked: '2026-11-10'
commit: cf264904244d6fd5d8e8fedf892e68cc0fd3dfd5
sources:
- repo: moby-moby
  path: cmd/dockerd/daemon.go
  lines: 1021-1030
  ref: v28.5.2
  commit: 89c5e8fd66634b6128fc4c0e6f1236e2540e46e0
- repo: go
  path: src/vendor/golang.org/x/net/http/httpproxy/proxy.go
  lines: 261-264
  ref: origin/master
  commit: be57ebb0f3c3ec056ccf39107a5d1380a51ff1c2
- repo: moby-moby
  path: daemon/config/config.go
  lines: '580'
  ref: v23.0.0
  commit: d7573ab8672555762688f4c7ab8cc69ae8ec1a47
unpinned: 1
---

# docs/containers/docker/use_proxy.md

## Findings

- L63 ERROR corrigé : le daemon ne refuse pas de démarrer ; la valeur de `daemon.json` écrase la variable systemd avec un warning `overriding existing proxy variable with value from configuration` (visible dans `journalctl -u docker`). Preuve : moby cmd/dockerd/daemon.go:1021-1030 @v28.5.2 (`overrideProxyEnv` : Warn puis `os.Setenv`) ; `git grep -i 'conflicting proxy'` @v28.5.2 : aucun résultat.
- L81 IMPRECISE corrigé : réécrit : le client lit `$HOME/.docker/config.json` (ou `$DOCKER_CONFIG`) ; avec `sudo docker`, celui de root si sudo réinitialise `$HOME`, sinon celui de l'utilisateur, selon `env_reset`/`always_set_home`. Preuve : docker/cli cli/config/config.go:23 (`DOCKER_CONFIG`) et :60-68 (`os.UserHomeDir()`, donc `$HOME`) @origin/master. Comportement par défaut de sudo par distribution non vérifié, d'où la formulation conditionnelle.
- L103 IMPRECISE corrigé : `*.example.com` est compris par Go (donc Docker) mais ignoré par curl. Preuve : golang/go src/vendor/golang.org/x/net/http/httpproxy/proxy.go:261-264 @origin/master (`*.` réduit à `.`) ; test : `no_proxy='*.example.com' curl -x http://127.0.0.1:9 http://www.example.com/` tente le proxy (erreur 7) avec curl 8.22.0 macOS et curlimages/curl:8.11.1, alors que `.example.com` donne 200 en direct.

## En plus

- L27 : `no-proxy` du `daemon.json` passé de `*.internal.example.com` à `.internal.example.com`, cohérent avec la recommandation de la section NO_PROXY (les deux marchent côté daemon).
- L32 : phrase ajoutée avant le bloc `systemctl restart docker` (règle « une phrase avant chaque bloc »).
- Vérifié sans changement : clés `proxies` de `daemon.json` apparues en 23.0 (moby daemon/config/config.go:580 @v23.0.0, absentes @v20.10.24).

## Modernisation

- Aucune suggestion.

## Tests

- curl 8.22.0 (macOS) et Docker curlimages/curl:8.11.1 pour le joker NO_PROXY. Pas de daemon Docker redémarré avec double config (vérifié par la source uniquement).

## À signaler

- Rien.
