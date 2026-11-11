---
article: docs/cloud/azure/misc_commands.md
checked: '2026-11-11'
commit: 467380fa25da5633c184ee160acefa31d11a6a2c
sources: []
unpinned: 2
---

# docs/cloud/azure/misc_commands.md

## Findings

- L12 IMPRECISE corrigé : titre "toutes les instances de tous les AKS de tous les RG" remplacé par "tous les nodepools de tous les AKS de la subscription active", plus une phrase d'intro qui dit que `az aks list` ne voit que la subscription active et renvoie vers `az account set -s` ou la section Resource Graph. Preuve : `az aks list -h` (azure-cli 2.89.1) ne propose que `-g` et l'argument global `--subscription` ("configure the default subscription using az account set"); test sur un compte à 2 subscriptions : `az aks list` sans `--subscription` renvoie les clusters d'une seule.
- L34 IMPRECISE rejeté : le finding confirme lui-même que le code est correct (`Spot` pour un pool Spot, autre valeur traitée en false). Rien à changer. Preuve : requête Resource Graph sur le tenant, `scaleSetPriority == 'Spot'` vrai sur 7 pools, faux sur 31. Pas pu tester `az aks nodepool list` localement (extension aks-preview locale cassée, api-version refusée).

## En plus

- Aucun.

## Modernisation

- Appliqué : nouvelle section "Tous les AKS de toutes les subscriptions avec Resource Graph", avec `az extension add --name resource-graph`, une requête qui produit le même CSV que le script 1 et une qui produit le total par VMSize comme le script 2. Les 2 blocs ont été exécutés tels quels depuis l'article (39 lignes de CSV, total par type cohérent).
- Non appliqué : boucle sur `az account list` dans les scripts existants, Resource Graph la rend inutile; l'intro mentionne `az account set -s`.

## Tests

- azure-cli 2.89.1 (extension resource-graph), compte réel, commandes en lecture seule. Données de test supprimées du scratchpad.

## À signaler

- `az graph query` est limité à 1000 lignes avec `--first 1000` (au-delà il faut paginer avec `--skip-token`), sans impact pour un parc AKS normal.
