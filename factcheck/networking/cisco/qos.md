---
article: docs/networking/cisco/qos.md
checked: '2026-11-11'
commit: fa94d9abe065695aae403adf939b2b1694fc7d56
sources: []
unpinned: 2
---

# docs/networking/cisco/qos.md

## Findings

- L33 OUTDATED corrigé : ligne `mls qos trust cos` supprimée (redondante), l'exemple est présenté comme Catalyst legacy (2960/3560/3750), ajout de la syntaxe Catalyst 9000 (`auto qos trust {cos|dscp}`, MQC, plus de `mls qos`). Preuve : guide Catalyst 2960 "Configuring Auto-QoS" (`auto qos voip trust` "sets the ingress classification to trust the CoS value received in the packet on a nonrouted port", via extrait manualowl/manualsonline) ; Cisco tech note 222225 "Configure AutoQoS on Catalyst 9000 Switches" (`auto qos trust`, sans mot-clé CoS en L2 et DSCP en L3, policies `AutoQos-4.0-*` générées).
- L27 IMPRECISE corrigé en partie : ajout d'un exemple routeur. Le finding dit que le routeur n'a pas de mot-clé trust identique, c'est faux : la commande routeur est `auto qos voip [trust] [fr-atm]`, sans `trust` la voix est classée par NBAR, CEF requis. Preuve : Cisco "AutoQoS - VoIP" (ios-xml qos_auto 15-2mt) et la command reference `auto qos voip`.

## En plus

- L13 : "dun réseau" -> "d'un réseau".

## Modernisation

- Appliqué : variante Catalyst 9000.

## Tests

- Aucun (pas d'équipement IOS). Sources Cisco uniquement.

## À signaler

- "`mls qos trust dscp` sur un port routé" vient de la doc 3560/3750 (le 2960 LAN Base n'a pas de port routé), extrait non relu en entier. "`mls qos` n'existe plus sur C9k" : non écrit tel quel par la tech note, c'est le comportement établi d'IOS XE sur C9k, à confirmer si l'auteur veut une source.
