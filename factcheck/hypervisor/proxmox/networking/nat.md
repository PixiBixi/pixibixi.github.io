---
article: docs/hypervisor/proxmox/networking/nat.md
checked: '2026-11-11'
commit: 5232b481709501128f1c9ec2eeff7e598810c8cd
sources:
- repo: pve-docs
  path: pve-network.adoc
  lines: 329-345
  ref: origin/HEAD
  commit: e67813a5deae705d5869d613fa2c73be89b6cb0b
unpinned: 1
---

# docs/hypervisor/proxmox/networking/nat.md

## Findings

- L13 IMPRECISE corrigé : le bridge NAT s'appelle `vmbr1`, avec une phrase qui explique pourquoi pas `vmbr0` (bridge de l'installeur qui porte l'IP de management). Preuve : pve-docs pve-network.adoc:329-345 @origin/HEAD ("The installation program creates a single bridge named `vmbr0`, which is connected to the management interface"). L'exemple NAT de la doc (pve-network.adoc:424-434) utilise bien `vmbr0`, mais dans un layout où l'IP publique est sur `eno1` sans bridge d'install.
- L17 IMPRECISE rejeté : `bridge_ports` (forme underscore) et `address`/`netmask` séparés sont acceptés. Preuve : ifupdown2 3.0.0 dans debian:12.7 privilégié, `ifup vmbr2` avec `bridge_ports none` + `netmask 255.255.255.0` monte le bridge en 10.20.20.254/24. Le bloc a quand même été aligné sur la forme de la doc (`address 10.10.10.254/24`, `bridge-ports`, `bridge-stp`, `bridge-fd`, pve-network.adoc:426-430).

## En plus

- `-o eno1` remplacé par `-o vmbr0` et la phrase sur l'interface de sortie précisée : sur une install standard l'IP publique est sur `vmbr0`, donc le trafic sort par `vmbr0` et un MASQUERADE `-o eno1` ne matche rien. Preuve : pve-network.adoc:339-345 (IP et gateway sur `vmbr0`, `eno1` en `bridge-ports`). Non testé sur un vrai node Proxmox (raisonnement sur la table de routage).
- Ajout du contournement conntrack zones quand le firewall Proxmox est actif, repris de pve-network.adoc:437-446.

## Modernisation

- SDN zone Simple avec SNAT : appliqué, courte section "Avec le SDN" (étapes GUI). Preuve : pvesdn.adoc:74-78 (SDN installé par défaut depuis PVE 8.1, `libpve-network-perl` seulement pour les upgrades), :234-240 (Simple zone, "NAT or routed setups"), :438-441 (option SNAT du Subnet), :1543-1588 (exemple), :1620 (Apply depuis le panneau SDN). La suggestion disait "PVE 7.x+", la doc ne garantit l'install par défaut qu'à partir de 8.1, c'est ce qui est écrit. `description` mise à jour pour mentionner le SDN.

## Tests

- Docker debian:12.7 `--privileged`, ifupdown2 3.0.0-1.1 + iptables : le nouveau bloc (avec `-o eth0` dans le conteneur) monte `vmbr1` en 10.10.10.254/24, pose `-A POSTROUTING -s 10.10.10.0/24 -o eth0 -j MASQUERADE` et `ip_forward=1`. L'ancien bloc (underscore, netmask) monte aussi.
- Section SDN non testée (pas de node PVE), uniquement sourcée.

## À signaler

- Proxmox livre son propre paquet ifupdown2, testé ici avec celui de Debian 12.
