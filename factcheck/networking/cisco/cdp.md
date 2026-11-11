---
article: docs/networking/cisco/cdp.md
checked: '2026-11-11'
commit: 023e85a262e6db9331327a91380eaffe37dd2984
sources: []
unpinned: 2
---

# docs/networking/cisco/cdp.md

## Findings

- L30 ERROR corrigé : suppression de "l'IOS est basé sur un noyau Linux" ; la phrase dit maintenant que `lldpd` implémente CDP (option `-c`). Preuve : `lldpd -h` dans alpine:3.20 (lldpd 1.0.18) : `-c  Enable the support of CDP protocol. (Cisco)`. L'affirmation sur IOS classique vs IOS XE n'est pas vérifiée par une source primaire, mais elle n'est plus dans l'article.
- L118 IMPRECISE corrigé : défauts ajoutés (holdtime 180 s, timer 60 s) et rappel que le holdtime doit rester supérieur au timer. Preuve : Cisco IOS CDP Command Reference (cisco.com cdp-cr-a1) : "The default is 180 seconds" / "The default is 60 seconds" / holdtime "must be set to a higher number of seconds than the time between ... transmissions". Les plages 10-255 / 5-254 ne figurent pas sur cette page, laissées telles quelles.

## En plus

- Rien.

## Modernisation

- Appliquée, reformulée : une phrase avant `no cdp enable` sur interface (CDP annonce modèle, version IOS, IP de management : le couper sur les ports d'accès, sauf là où un téléphone IP Cisco s'en sert pour son voice VLAN). Je n'ai pas repris "LLDP-MED à préférer avec les téléphones IP" : faux pour les téléphones Cisco qui récupèrent leur voice VLAN par CDP.

## Tests

- Docker alpine:3.20, lldpd 1.0.18.

## À signaler

- "les équipements doivent être de marque Cisco" (L27) contredit un peu la phrase lldpd qui suit ; laissé tel quel.
