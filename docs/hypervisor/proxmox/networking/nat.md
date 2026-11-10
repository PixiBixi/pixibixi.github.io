---
description: Configurer le NAT sur Proxmox avec Linux Bridge et iptables, ou avec une zone SDN Simple, pour l'accès réseau des VMs
tags:
  - Proxmox
  - Networking
---

# NAT pour les VMs Proxmox

Pour ajouter un NAT sur Proxmox, on crée un bridge dédié dans `/etc/network/interfaces`. Surtout pas `vmbr0` : c'est le bridge créé par l'installeur, il porte l'IP de management, et le remplacer coupe l'accès au node.

```bash
auto vmbr1
iface vmbr1 inet static
        address 10.10.10.254/24
        bridge-ports none
        bridge-stp off
        bridge-fd 0

        post-up   echo 1 > /proc/sys/net/ipv4/ip_forward
        post-up   iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o vmbr0 -j MASQUERADE
        post-down iptables -t nat -D POSTROUTING -s 10.10.10.0/24 -o vmbr0 -j MASQUERADE
```

On pense à changer l'interface de sortie selon notre système : celle qui porte l'IP publique, donc `vmbr0` sur une install standard, ou la carte physique (`eno1`...) si l'IP est posée directement dessus.
Concernant la VM, il nous faut donc une IP dans le même /24 et en
gateway 10.10.10.254

Si le firewall Proxmox est activé sur les VMs, les connexions sortantes peuvent être bloquées. La doc Proxmox donne le contournement par conntrack zones, à ajouter dans le même bloc :

```bash
        post-up   iptables -t raw -I PREROUTING -i fwbr+ -j CT --zone 1
        post-down iptables -t raw -D PREROUTING -i fwbr+ -j CT --zone 1
```

## Avec le SDN

Depuis PVE 8.1, le SDN est installé par défaut et une zone Simple fait le même travail sans écrire d'iptables à la main :

- Datacenter > SDN > Zones : on crée une zone de type Simple
- on y ajoute une VNet (`vnet1`), puis un Subnet `10.10.10.0/24` avec une gateway `10.10.10.254` et l'option SNAT cochée
- on applique depuis le panneau SDN principal, ce qui crée le bridge `vnet1` sur le node, à affecter aux VMs
