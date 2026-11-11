---
article: docs/misc/fibre_optique/info_transceiver.md
checked: '2026-11-10'
commit: 236610535265b5d73fb5523bb11cc88507375600
sources: []
unpinned: 7
---

# docs/misc/fibre_optique/info_transceiver.md

## Findings

- L22 ERROR corrigé : "SR = Single Range = Monomode" devient "SR = Short Reach = Multimode (850nm)". Preuve : Wikipedia "10 Gigabit Ethernet" : "10GBASE-SR ("short range")", lasers 850 nm sur multimode.
- L42 ERROR corrigé : SFP+ SR 550m remplacé par "300m (OM3), 400m (OM4), 33-82m (OM1/OM2)". Preuve : Wikipedia "10 Gigabit Ethernet" : 33 m OM1, 82 m OM2, 300 m OM3, 400 m OM4 (26 m sur FDDI-grade). Le finding donnait 26-82 m, la borne basse OM1 est 33 m.
- L12 IMPRECISE corrigé : "Monomode en général" + une phrase sur le 1310nm en multimode (LRM, LX avec patch de conditionnement). Preuve : Wikipedia "Gigabit Ethernet" (1000BASE-LX sur multimode jusqu'à 550 m, patch de conditionnement au-delà de 300 m) et "10 Gigabit Ethernet" (10GBASE-LRM 1310 nm, 220 m sur multimode).
- L24 IMPRECISE corrigé : "MMC" remplacé par MM / MMF, SMF ajouté à côté de SM. Preuve : terminologie courante (Multi-Mode Fiber / Single-Mode Fiber) ; pas de source normative, "MMC" n'apparaît dans aucune des pages lues.
- L36 IMPRECISE corrigé : phrase ajoutée avant les tableaux (EX, ZX, EZX, ZR non IEEE, portée selon constructeur), EZX passe à "120km et plus selon le constructeur". Preuve : Wikipedia "Gigabit Ethernet" : EX "non-standard but industry accepted term" 40 km, ZX "non-standard but multi-vendor term" au moins 70 km, "Some vendors claim up to 120 km (EZX)" ; le finding cite 160 km sur la page SFP (non relue).
- L44 IMPRECISE corrigé : LRM "0.22km" devient "220m", ZR couvert par la phrase non IEEE. Preuve : Wikipedia "10 Gigabit Ethernet" : LRM 220 m ; "This 80 km PHY is not specified within the IEEE 802.3ae standard".
- L48 IMPRECISE corrigé : reformulé en moyen mnémotechnique (X = 1000BASE-X 8b/10b = 1G = SFP, R = 10GBASE-R 64b/66b = 10G = SFP+). Preuve : Wikipedia "10 Gigabit Ethernet" (LR, ER, SR en 64b/66b), "Gigabit Ethernet" (8b/10b pour 1000BASE-X).

## En plus

- Colonne "Fibre" (type et longueur d'onde) ajoutée aux deux tableaux, mêmes sources.
- SFP LX : "10km (5km dans la norme IEEE)". Preuve : Wikipedia "Gigabit Ethernet" : "up to 5 km over ... single-mode fiber" ; 10 km est la valeur constructeur courante (LX/LH), non sourcée normativement.
- SFP SX : précision OM2 550m vs OM1 220-275m. Preuve : Wikipedia "Gigabit Ethernet" : 220/275 m en 62.5 µm, 500/550 m en 50 µm.
- ZX : 80km devient 70-80km (même source, "at least 70 km").
- Listes réécrites en `-`, y compris la section Connecteur (markdownlint MD004 exigeait la cohérence dans le fichier).

## Modernisation

- Section "Diagnostic" ajoutée avec `ethtool -m` (DOM / SFF-8472). Preuve : debian:12.7, ethtool 6.1 : `-m|--dump-module-eeprom|--module-info DEVNAME  Query/Decode Module EEPROM information and optical diagnostics if available`. Non testé sur une vraie optique.

## Tests

- Docker debian:12.7 + ethtool 6.1 (aide de la commande). Sources web : Wikipedia "10 Gigabit Ethernet" et "Gigabit Ethernet" (pas de code source applicable, normes IEEE non accessibles).

## À signaler

- "DAC : Généralement pour stacker les switchs" laissé tel quel : un DAC sert surtout aux liens courts switch-serveur ou ToR, et ce n'est pas un connecteur mais un câble avec les SFP sertis. À reformuler si l'auteur le souhaite.
- Titre et "Longeur" (faute) non touchés.
