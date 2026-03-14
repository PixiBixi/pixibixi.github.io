---
description: ESXi et Proxmox — installation, configuration réseau, gestion des VMs et troubleshooting.
tags:
  - ESXi
  - Proxmox
  - Hypervisor
  - Virtualization
---

# Hypervisor

ESXi pour l'entreprise, Proxmox pour le lab et le selfhost. Les 2 ont leurs bizarreries — cette section couvre les opérations courantes sans passer par l'interface graphique.

## Contenus

- [ESXi — Réseau](esxi/commands/network.md) — commandes réseau depuis le shell ESXi
- [ESXi — Accès shell](esxi/misc/shell_access.md) — activer et utiliser le SSH sur ESXi
- [ESXi — Upload ISO en CLI](esxi/upload_iso_cli.md) — copier une ISO sans l'interface web
- [Proxmox — Bootstrap](proxmox/bootstrap_pve.md) — installer un Proxmox propre dès le départ
- [Proxmox — Cluster](proxmox/cluster.md) — créer et gérer un cluster Proxmox
- [Proxmox — Insérer une ISO depuis une URL](proxmox/insert_iso_from_url.md) — télécharger directement sur le storage
- [Proxmox — NAT](proxmox/networking/nat.md) — configurer le NAT pour les VMs
- [Proxmox — VM bloquée](proxmox/troubleshooting/vm_locked.md) — débloquer une VM en état locked
- [Proxmox — Gérer les VMs en CLI](proxmox/vm_as_cli.md) — `qm` et `pvesh` pour tout faire sans UI
