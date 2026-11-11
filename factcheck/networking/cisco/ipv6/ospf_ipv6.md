---
article: docs/networking/cisco/ipv6/ospf_ipv6.md
checked: '2026-11-11'
commit: bd8365c643a4e978ba15ade712d00df4ba365691
sources: []
unpinned: 3
---

# docs/networking/cisco/ipv6/ospf_ipv6.md

## Findings

- L25 OUTDATED corrigé : la syntaxe `ipv6 router ospf` est conservée (encore acceptée) et présentée comme historique ; ajout du bloc `router ospfv3` + `address-family ipv6 unicast` + `passive-interface` sous l'AF, et de la commande d'interface `ospfv3 pid ipv6 area area-id`. Preuve : pas de test (aucun IOS disponible). Sources : recherche web citant la page Cisco 15M&T "OSPFv3 Address Families" ("supported as of Cisco IOS Release 15.1(3)S and Cisco IOS Release 15.2(1)T", page aujourd'hui remplacée par un avis de retrait, lue via extrait de moteur), pages Cisco "Implementing OSPFv3" pour IOS XE 3.4S (extrait de moteur, page non chargée) ; syntaxe exacte confirmée par globalknowledge.com (router ospfv3 1 / address-family ipv6 unicast / router-id 1.1.1.1 / ospfv3 1 ipv6 area 0). Placement de passive-interface sous l'AF non confirmé par une source (la doc dit qu'il est accepté au niveau process et AF, à vérifier).
- L41 IMPRECISE corrigé : précisé que le router-id OSPFv3 est un 32 bits choisi pareil, mais qu'un routeur sans IPv4 ne démarre pas le process sans router-id manuel. Preuve : blog.ipspace.net/2025/10/ospf-automatic-router-id (sortie IOS citée "%OSPFv3 1 address-family ipv6 not running, please configure a router-id", et la doc Cisco qui prétendait l'inverse corrigée le 2026-04-14) ; packetlife.net/blog/2008/sep/1/ipv6-and-ospfv3 ("%OSPFv3-4-NORTRID: OSPFv3 process 1 could not pick a router-id, please configure manually", vu en extrait). Pas de test sur équipement.
- L81 IMPRECISE non vérifié : la conversion masque -> wildcard par IOS sur `network` n'est pas réfutée par le fact-check (simple "formulation vague"), et aucun IOS pour tester. Texte laissé tel quel.

## En plus

- L43 corrigé : prompt `(router-rtr)#` inexistant remplacé par `(config-rtr)#`, cohérent avec L26. Preuve : le prompt du mode `ipv6 router ospf` est `(config-rtr)#` dans l'article lui-même (L26) ; pas de test.

## Modernisation

- `router ospfv3` avec address-families : appliqué (voir L25).
- `ospfv3 <pid> ipv6 area <id>` sur l'interface : appliqué.

## Tests

- Aucun : pas d'IOS/IOS XE disponible (ni image, ni labo). Tout repose sur des sources web secondaires.

## À signaler

- Toutes les corrections de cet article sont non testées sur équipement. Si un labo (CML, GNS3 avec IOSv) est dispo, vérifier `passive-interface` sous `address-family ipv6 unicast` et le message sans router-id.
- `clear ipv6 ospf process` (L48) correspond à la syntaxe legacy ; avec `router ospfv3` la commande devient `clear ospfv3 process` (non vérifié, non modifié).
