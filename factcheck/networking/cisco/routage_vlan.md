---
article: docs/networking/cisco/routage_vlan.md
checked: '2026-11-11'
commit: a829506d8e3146253f777030686a347e40473fbe
sources: []
unpinned: 2
---

# docs/networking/cisco/routage_vlan.md

## Findings

- L27 IMPRECISE corrigé : bloc d'adressage réécrit en liste : lien Gi0/1 switch vers Gi0/1 routeur, IP de management du switch sur l'interface VLAN 3 (192.168.0.1, un port L2 « GA0/0 » ne porte pas d'IP), passerelle des machines = sous-interface du routeur 192.168.0.254. `GA0/1` normalisé en `Gi0/1`. Preuve : cohérence interne (pas de source externe nécessaire).
- L42 IMPRECISE corrigé : ajout de `interface Gi0/1` / `no ip address` / `no shutdown` sur le parent, et d'une section « Application côté switch » (`switchport mode trunk`, `switchport trunk allowed vlan 3`, note `switchport trunk encapsulation dot1q` sur 3560/3750, `ip default-gateway 192.168.0.254`, `show interfaces trunk`). Preuve : Cisco « Configuring Routing Between VLANs with IEEE 802.1Q » (cisco.com/en/US/docs/ios/lanswitch/configuration/guide/lsw_cfg_vlan_encap.pdf), Cisco Community « router on the stick » (parent sans IP, port switch en trunk). Non testé sur IOS (pas d'émulateur disponible).

## En plus

- Rien d'autre.

## Modernisation

- Appliqué : section « Avec un switch L3 » (`ip routing` + SVI `interface vlan 3` en 192.168.0.254). Syntaxe IOS standard, non testée sur équipement.

## Tests

- Aucun (pas d'IOS/GNS3 disponible).

## À signaler

- `docs/networking/cisco/vlan.md` (hors périmètre) contredit cet article : il met 192.168.0.1 sur le routeur (`interface G0/0`), configure `interface VLAN 3` sous le prompt `config-vlan` au lieu de `config-if`, a des apostrophes parasites L19-21 et des blocs indentés au lieu de fences. À reprendre dans un pass dédié.
