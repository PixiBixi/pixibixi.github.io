---
article: docs/networking/cisco/transceiver/noname.md
checked: '2026-11-11'
commit: 528ea6e17944d97a6a02074ec3cef26ccde569bb
sources: []
unpinned: 2
---

# docs/networking/cisco/transceiver/noname.md

## Findings

- L10 IMPRECISE corrigé : « 1XG LC LR » remplacé par « SFP 1000BASE-LX/LH (1G, monomode, LC, GLC-LH-SMD chez Cisco) », avec la précision que l'équivalent 10G est un SFP+ 10GBASE-LR. Le 1G est déduit des logs de l'article (port Gi1/48). Preuve : nomenclature IEEE 1000BASE-LX / 10GBASE-LR, référence Cisco GLC-LH-SMD.
- L12 IMPRECISE corrigé : « fera exactement le même travail » supprimé; ajout d'un paragraphe : commande cachée et non supportée, avertissement IOS à la saisie, le TAC peut refuser le support sur un défaut imputé à l'optique tierce, fiabilité variable (DOM, lien), surveiller les erreurs. Les prix sont gardés mais datés (« quand j'ai écrit ces lignes »). L'intro des logs explique maintenant l'échec du contrôle d'intégrité. Preuve : Cisco Community « command service unsupported-transceiver » (community.cisco.com/t5/switching/command-service-unsupported-transceiver/td-p/2557261) et cisco-nsp 2012-07 (texte de l'avertissement « Cisco may withhold support under warranty or a Cisco support program »). Pas de doc Cisco officielle trouvée pour la commande.

## En plus

- Logs attribués à un Catalyst 4500 (préfixe `C4K_`).

## Modernisation

- Aucune suggestion.

## Tests

- Aucun (pas d'équipement).

## À signaler

- Sur 2960/3750, les forums associent souvent `no errdisable detect cause gbic-invalid` à la commande; non vérifié, donc non ajouté.
