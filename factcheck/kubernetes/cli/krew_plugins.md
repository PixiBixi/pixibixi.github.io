---
article: docs/kubernetes/cli/krew_plugins.md
checked: '2026-11-11'
commit: ceca4dc28d845c3d1a09604f2f098c385df2c9f7
sources:
- repo: Homebrew-brew
  path: README.md
  lines: 17-18
  ref: origin/main
  commit: bc63375ac3a4d6debb1ceb441ae6e22854f0909a
- repo: krew-index
  path: plugins/node-resource.yaml
  lines: '10'
  ref: origin/master
  commit: f41ed91f5fc0199dd342a326bd28e5b0a42ed892
unpinned: 1
---

# docs/kubernetes/cli/krew_plugins.md

## Findings

- L19 ERROR corrigé : "brew bundle v4.5" -> "Homebrew 5.1.2" (support krew de `brew bundle`). Preuve : Homebrew-brew, commit 54d855b691 "bundle: add krew (kubectl plugin manager) support", merge 68ee3fd683 de la PR #21802 le 2026-03-27 ; `git tag --contains` -> premier tag 5.1.2.
- L46 IMPRECISE corrigé : klock décrit comme un suivi en direct via le watch de l'API, pas un rafraîchissement toutes les secondes. Preuve : kubectl-klock README.md:17-18 @origin/main "instead of polling, it uses the regular watch feature to stream updates as soon as they occur".
- L61 IMPRECISE corrigé : précisé que view-utilization calcule à partir des requests et que le remplacement par node-resource est un avis ("Pour moi"), node-resource montrant requests et conso réelle. Preuve : krew-index plugins/view-utilization.yaml:24 et plugins/node-resource.yaml:10 @origin/master.

## En plus

- Aucun.

## Modernisation

- Rien de proposé.

## Tests

- Aucun outil exécuté, vérification sur les clones Homebrew-brew, kubectl-klock, krew-index.

## À signaler

- Rien.
