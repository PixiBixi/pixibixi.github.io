---
description: Créer et gérer un cluster Proxmox — redondance réseau, quorum et migration de VMs
---

# Gérer son cluster Proxmox

Imaginons l'infrastructure suivante

* vmbr0 : 1G, 192.168.0.0/24, le réseau de notre box
* vmbr1 : 2.5G, 10.10.10.0/24, un réseau interne

## Créer son cluster

Créer son cluster n'a rien de compliqué, il suffit de suivre la procédure sur le clicodrome.

Si vous souhaitez le faire en ligne de commande, rien de plus facile également

```bash
pvecm create <name> --link0 <ip>
```

Il est également possible d'ajouter plusieurs links pour ajouter de la redondance à son cluster, voici un exemple

```bash
pvecm create mycluster --link0 10.10.10.101,priority=15 --link1 192.168.1.101,priority=20
```

Ici, nous utilisons en premier notre lien 2.5Gbps en priorité, suivi de notre lien 1Gbps

Si nous ne souhaitons pas avoir plusieur lien, il n'est évidemment pas utile de spécifier la priorité du lien

### Bonus : Utiliser une interface dédié pour la live-migration

Cette étape semble toute bête mais cependant très très pénible car peu documentée.

Nous allons naturellement vouloir aller sur vmbr1 pour notre live migration. Pour cela, il faut modifier un fichier de configuration de PVE en ligne de commande

```bash
root@proxmox1:~# cat /etc/pve/datacenter.cfg
keyboard: fr
migration: type=insecure,network=10.10.10.0/24
```

Comme nous le voyons, nous précisons ici le CIDR à utiliser pour la migration, la documentation complète de ce fichier est [disponible ici](https://pve.proxmox.com/wiki/Manual:_datacenter.cfg)

Nous désactivons également une migration dite "secure" étant donné que nous somme sur un réseau interne isolé

Il est également possible de migrer une VM en utilisant un réseau spécifique directement dans le `qm migrate`

```bash
qm migrate 200 <new_host> --online --migration_network 10.10.10.0/24
```

## Détruire son cluster

C'est très simple, on lance la commande suivante sur tous les nodes

```bash
systemctl stop pve-cluster corosync
pmxcfs -l
rm /etc/corosync/*
rm /etc/pve/corosync.conf
killall pmxcfs
systemctl start pve-cluster
```
