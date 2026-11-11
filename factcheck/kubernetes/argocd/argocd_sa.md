---
article: docs/kubernetes/argocd/argocd_sa.md
checked: '2026-11-11'
commit: 3a1a1e7b843633ad99667dc159cd2022827fe478
sources: []
unpinned: 1
---

# docs/kubernetes/argocd/argocd_sa.md

## Findings

- L25 IMPRECISE rejeté : `*/*` couvre aussi les objets `<projet>/<namespace>/<app>` car le matcher RBAC d'Argo CD appelle `glob.Match(pattern, val)` sans séparateur, donc `*` matche `/`. Preuve : argo-cd `util/rbac/rbac.go` globMatchFunc et `util/glob/glob.go` @ origin/master d9ccb538a (gobwas/glob v1.1.0 dans go.mod) ; test Go local avec gobwas/glob v1.1.0 : `*/*` matche `default/app` true et `proj/ns/app` true. La phrase est quand même précisée (format de l'objet `<projet>/<app>` et variante apps in any namespace, `docs/operator-manual/rbac.md` L99 et L111).

## En plus

- Rien.

## Modernisation

- Appliqué : `--expires-in 30d` sur `generate-token`, avec la mention "pas d'expiration par défaut". Preuve : `cmd/argocd/commands/account.go` (flag `expires-in`, défaut `0s` "No expiration") et argoproj/pkg v2.0.1 `time/time.go` (regex `^(\d+)([smhd])$`).
- Non appliqué : rôle de projet AppProject avec JWT, hors sujet d'un article sur les comptes locaux.

## Tests

- Go 1.27.3, gobwas/glob v0.2.3 puis v1.1.0 (scratchpad `fc/globtest`).

## À signaler

- `git fetch` du clone argo-cd a échoué (réseau), vérification faite sur origin/master local daté du 2026-11-09.
