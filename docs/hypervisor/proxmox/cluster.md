---
description: Créer et gérer un cluster Proxmox - redondance réseau, quorum et migration de VMs
tags:
  - Proxmox
  - HA
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
pvecm create mycluster --link0 10.10.10.101,priority=20 --link1 192.168.0.101,priority=15
```

Corosync utilise le lien qui a la priorité la plus **haute** : ici le lien 2.5Gbps (priority=20) passe en premier, le lien 1Gbps (priority=15) ne sert qu'en secours

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

Nous désactivons également une migration dite "secure" étant donné que nous somme sur un réseau interne isolé : avec `type=insecure`, la RAM de la VM transite en clair. À ne faire que sur un réseau dont on maîtrise vraiment l'accès, sinon on garde `secure` (le défaut)

Il est également possible de migrer une VM en utilisant un réseau spécifique directement dans le `qm migrate`

```bash
qm migrate 200 <new_host> --online --migration_network 10.10.10.0/24
```

## Détruire son cluster

Pour retirer un seul node, la méthode recommandée reste `pvecm delnode <node>` depuis un node restant, après avoir éteint le node à retirer (puis réinstallation de ce dernier s'il doit rejoindre un cluster).

!!! warning "Méthode non recommandée"
    La procédure ci-dessous sépare un node sans le réinstaller. La doc Proxmox la classe comme *not the recommended method* : un stockage partagé encore accessible par plusieurs clusters casse le locking et peut créer des conflits de VMID. On sépare d'abord les stockages partagés.

Pour casser tout le cluster, on lance la commande suivante sur tous les nodes :

```bash
systemctl stop pve-cluster corosync
pmxcfs -l
rm /etc/pve/corosync.conf
rm -r /etc/corosync/*
killall pmxcfs
systemctl start pve-cluster
rm /var/lib/corosync/*
```

Les configs des autres nodes restent dans `/etc/pve/nodes/<autre_node>/` sur chaque node : on les supprime à la main une fois sûr du nom, ainsi que leurs clés dans `/etc/pve/priv/authorized_keys`.
