---
article: docs/networking/cisco/mpls/ttl_propagation.md
checked: '2026-11-11'
commit: 572dc60e7acff4333b682843798e436cdffe9a34
sources: []
unpinned: 1
---

# docs/networking/cisco/mpls/ttl_propagation.md

## Findings

- L15 IMPRECISE corrigé : sans mot-clé la commande masque le cœur pour le trafic transité et le trafic local ; ajout de `no mpls ip propagate-ttl forwarded` (garde les traceroutes depuis le PE) et de `local`. Avertissement réécrit : c'est le routeur d'entrée du LSP qui copie le TTL, donc on l'applique sur tous les PE. Preuve : command reference IOS XR NCS5500 / CRS `mpls ip-ttl-propagate disable [forwarded | local]` (sans mot-clé : forwarded et local) ; fil Cisco Community "no mpls ip propagate-ttl forwarded" (syntaxe IOS classique).

## En plus

- Rien.

## Modernisation

- Appliqué : variante `forwarded`.

## Tests

- Aucun (pas d'équipement IOS).

## À signaler

- La référence de commande IOS classique (non XR) pour `forwarded`/`local` n'a pas été lue directement, seulement la doc XR et un fil Cisco Community.
