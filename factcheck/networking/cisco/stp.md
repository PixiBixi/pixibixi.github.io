---
article: docs/networking/cisco/stp.md
checked: '2026-11-11'
commit: a790a878f5545655f15cc2300723fbf0417a48dd
sources: []
unpinned: 5
---

# docs/networking/cisco/stp.md

## Findings

- L36 ERROR corrigé : `spanning-tree mode stp` remplacé par `pvst`, section Modes réécrite avec les 3 modes (`pvst`, `rapid-pvst`, `mst`). Preuve : thread Cisco Community (`spanning-tree mode ?` sur 3850/9300 : mst, pvst, rapid-pvst) et page de cours Cisco Networking Academy (2960 : PVST+, Rapid PVST+, MST, un seul actif). Command reference Catalyst 9300 17.12 consultée mais la section n'a pas pu être extraite.
- L16 IMPRECISE corrigé : prompts des `show` passés en `Switch#` + phrase sur `do` en mode config. Preuve : comportement IOS connu, pas de source primaire rechargée ni de test (pas d'IOS disponible).
- L40 IMPRECISE corrigé : titres "PVST+", "Rapid PVST+ (RSTP, une instance par VLAN)", "MST (802.1s)". Preuve : command reference 9300 17.12 (`rapid per-VLAN spanning-tree plus (rapid-PVST+)`, `Multiple Spanning Tree (802.1s) (MST)`, sortie `Spanning tree enabled protocol rstp` en mode rapid-pvst).
- L46 IMPRECISE corrigé : "Partout" utilise `spanning-tree portfast bpduguard default` en global, avec la précision "ports en PortFast seulement". Preuve : résultats de recherche (manuels Catalyst 2950/3560/4500), pas de page Cisco officielle extraite.
- L50 IMPRECISE corrigé : `fa0/1<U+2013>10` (en dash) -> `fa0/1 - 10`. Preuve : U+2013 présent dans le fichier (rg); le rejet par IOS n'est pas testé.

## En plus

- Rien.

## Modernisation

- Appliqué : `portfast bpduguard default` et `mode mst`.

## Tests

- Aucun (pas d'IOS ni d'émulateur).

## À signaler

- Toutes les corrections IOS reposent sur des sources secondaires et le comportement connu, pas sur un test : à relire si l'auteur a un switch sous la main.
