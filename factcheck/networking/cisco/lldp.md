---
article: docs/networking/cisco/lldp.md
checked: '2026-11-11'
commit: 663dc99b709a35ec0d2d486c5cbe10334337a498
sources: []
unpinned: 4
---

# docs/networking/cisco/lldp.md

## Findings

- L14 ERROR corrigé : `802.11AB` -> `IEEE 802.1AB`. Preuve : Cisco, Interface and Hardware Configuration Guide IOS 15.2(7)Ex Catalyst 1000, chapitre LLDP : « the device supports the IEEE 802.1AB Link Layer Discovery Protocol (LLDP) ».
- L87 ERROR corrigé : `no lldp enable` / `lldp enable` remplacés par `no lldp transmit` + `no lldp receive` (et l'inverse pour activer), avec une phrase d'intro. Preuve : même guide Catalyst 1000 : `lldp transmit` « Enables the interface to send LLDP packets », `lldp receive` idem, désactivation par `no lldp transmit / no lldp receive` ; aucune commande `lldp enable` dans le chapitre.
- L109 ERROR corrigé : holdtime 0-65535 (défaut 120 s), timer 5-65534 (défaut 30 s). Preuve : même guide : « The range is 0 to 65535 seconds; the default is 120 seconds » et « The range is 5 to 65534 seconds; the default is 30 seconds ». Mêmes plages sur IOS XR Cisco 8000 (résultats de recherche, non relu en entier).
- L15 IMPRECISE corrigé : « compatible sur toutes les plateformes sans modification » remplacé par standard ouvert, désactivé par défaut sur IOS (`lldp run`), TLV optionnels variables. Preuve : même guide, table des valeurs par défaut : « LLDP global state | Disabled ».

## En plus

- Rien.

## Modernisation

- LLDP-MED pour les téléphones IP : non appliqué, pas vérifié au-delà du titre du chapitre Cisco, et hors du périmètre court de l'article.

## Tests

- Aucun (pas d'équipement IOS) ; vérification sur la doc Cisco via WebFetch : <https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst1000/software/releases/15_2_7_e/configuration_guides/int_hw/b_1527e_int_and_hw_c1000_cg/configuring_lldp__lldp_med__and_wired_location_service.html>

## À signaler

- Les plages et valeurs par défaut viennent d'un guide Catalyst IOS 15.2 ; d'autres plateformes (Cisco Business 350 par exemple) ont une autre syntaxe et d'autres plages. L'article ne précise pas de plateforme cible.
- La table de défauts du Catalyst 1000 donne aussi `LLDP receive/transmit | Disabled` par interface, ce qui contredit en partie l'idée qu'un `lldp run` suffit sur cette plateforme ; non creusé, texte laissé à « il faut un `lldp run` ».
