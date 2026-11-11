---
article: docs/networking/cisco/dns.md
checked: '2026-11-11'
commit: 301b057d5ff2a77f5ce385ede4fcbccb20315bd4
sources: []
unpinned: 2
---

# docs/networking/cisco/dns.md

## Findings

- L30 ERROR corrigé : `transport preferred none` est présenté comme une alternative par ligne, pas un second correctif obligatoire ; ajout du message `% Unknown command or computer name, or unable to find computer address` renvoyé immédiatement après `no ip domain lookup`. Intro (L10), titres des sections et description du front matter alignés. Preuve : Cisco doc 46253 (<https://www.cisco.com/c/en/us/support/docs/routers/10000-series-routers/46253-ipdomain-lookup.html>, via WebFetch) : "The user immediately receives a router prompt without an issue of a DNS broadcast" et "You can also use the transport preferred none command on the vty/con/aux lines".
- L22 IMPRECISE corrigé : "Sur IOS 15 et au-delà" -> "Sur les IOS récents", l'ancienne syntaxe étant celle des vieilles releases. Preuve : même page Cisco : "On older Cisco IOS releases the syntax of the command was no ip domain-lookup", aucun numéro de version donné.

## En plus

- Aucun.

## Modernisation

- `no ip domain lookup` comme forme actuelle : déjà présente, rien à changer.

## Tests

- Aucun équipement IOS dispo, rien n'a été exécuté. Source : uniquement la doc Cisco.

## À signaler

- La section "Garder la résolution" utilise encore `ip domain-lookup` (ancienne forme, laissée telle quelle) ; l'auteur peut vouloir passer à `ip domain lookup` par cohérence.
