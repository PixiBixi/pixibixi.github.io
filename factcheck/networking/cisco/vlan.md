---
article: docs/networking/cisco/vlan.md
checked: '2026-11-11'
commit: 1d29a7ffff73f05b32d7ad9b31c1faa86cde9139
sources: []
unpinned: 1
---

# docs/networking/cisco/vlan.md

## Findings

- L21 IMPRECISE corrigé : plan d'adressage aligné sur routage_vlan.md (corrigé) : interface VLAN 3 du switch = 192.168.0.1, passerelle = routeur 192.168.0.254 sur Gi0/1.3, relié en trunk au Gi0/1 du switch. La section routeur (IP 192.168.0.1 sur G0/0 physique, contradictoire) est remplacée par un renvoi vers routage_vlan.md ; `ip default-gateway` passe à 192.168.0.254. Preuve : cohérence avec docs/networking/cisco/routage_vlan.md L24-27, L43-52, L72 ; avec le routeur sur un port access Fa0/6-12 l'ancien exemple aurait marché, mais il contredisait l'article voisin.

## En plus

- Prompt faux : `interface VLAN 3` suivi de `Switch(config-vlan)#` remplacé par `Switch(config-if)#` (une SVI est en mode interface ; `config-vlan` est le mode de `vlan 3`). Source : comportement IOS standard, même syntaxe que routage_vlan.md L87-88. Non testé sur IOS.
- `Switch(config)interface range` : `#` manquant ajouté.
- Ordre : création du VLAN (`vlan 3` / `name`) avant l'affectation des ports et la SVI, au lieu de "Maintenant le nom" après coup.
- `name "VLAN3"` remplacé par `name VLAN3` (non vérifié si IOS garde les guillemets dans le nom ; sans guillemets c'est sûr).
- Apostrophes parasites L19-21 supprimées, "dun" corrigé en "d'un", titre "Créér" en "Créer", "Etant donner" en "Étant donné".
- Blocs indentés convertis en blocs ```cisco, comme routage_vlan.md.
- Description du front matter : elle annonçait "trunk" que l'article ne couvre pas ; réécrite (ports access, interface VLAN, passerelle).

## Modernisation

- Aucune suggestion.

## Tests

- Pas d'IOS disponible.

## À signaler

- La section "Au niveau du routeur" n'a plus de commandes, juste le renvoi : à l'auteur de dire s'il préfère y dupliquer la config sous-interface.
