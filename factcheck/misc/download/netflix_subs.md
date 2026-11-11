---
article: docs/misc/download/netflix_subs.md
checked: '2026-11-11'
commit: 4c6661b9bf2876ba35cafb6098997673a4be4c36
sources: []
unpinned: 1
---

# docs/misc/download/netflix_subs.md

## Findings

- L12 OUTDATED non vérifié : le filtre `&v=3` dans les DevTools n'a pas pu être reproduit (pas de compte Netflix utilisable dans cette passe, aucune source publique ou code local qui décrive l'endpoint actuel). Texte laissé tel quel.

## En plus

- Aucun.

## Modernisation

- Aucune suggestion.

## Tests

- Aucun.

## À signaler

- L'article tient en 2 phrases et repose sur un endpoint Netflix non documenté, très probablement changé depuis. À tester à la main dans Chrome; si le filtre ne donne plus rien, supprimer l'article (et ajouter une redirection dans `properdocs.yml` vers la section) plutôt que le garder.
