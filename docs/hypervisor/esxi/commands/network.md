---
description: Commandes ESXi CLI pour lister et gérer l'état des interfaces réseau virtuelles
tags:
  - ESXi
  - Network
---

# ESXi : commandes réseau en vrac

Quelques commandes `esxcli` pour gérer les interfaces réseau d'un hôte ESXi.

Désactiver / réactiver une interface physique :

```bash
esxcli network nic down -n vmnicX
esxcli network nic up -n vmnicX
```

Lister les NICs physiques et leur état :

```bash
esxcli network nic list
```

Lister les vSwitches et leurs uplinks :

```bash
esxcli network vswitch standard list
```

Afficher la configuration IP des VMkernel ports :

```bash
esxcli network ip interface ipv4 get
```

Vérifier la connectivité depuis l'hôte :

```bash
vmkping <ip>
```
