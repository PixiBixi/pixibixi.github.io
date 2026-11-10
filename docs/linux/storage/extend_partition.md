---
description: Étendre une partition root en ligne sans redémarrage avec growpart, puis resize2fs (ext4) ou xfs_growfs (XFS)
tags:
  - Storage
tested_with:
  - "cloud-guest-utils 0.33"
  - "e2fsprogs 1.47"
  - "xfsprogs 6.6"
---

# Étendre à chaud sa partition root

On croit souvent qu'étendre une partition root impose de redémarrer sur un système rescue. Ce n'est plus le cas : le noyau sait relire la table de partitions d'un disque en cours d'usage, et **growpart** fait tout le travail en une commande, partition montée. Le rescue ne sert que si le noyau refuse cette relecture.

Ceci peut être extrêmemnt utile dans le cas d'un agrandissement à chaud
d'un disque dur d'un VPS par exemple.

`growpart` est dans le paquet `cloud-guest-utils` sur Debian/Ubuntu et `cloud-utils-growpart` sur RHEL/Amazon Linux, il est déjà là sur la plupart des images cloud. Il ne peut étendre une partition que si l'espace libre est juste derrière elle. On réécrit la table de partitions : un snapshot du disque avant, c'est pas du luxe.

<div class="steps" markdown>

1. Tout d'abord, nous devons vérifier que le disque dur a bien été étendu
    sur le système :

    ```bash
    [vps ~]$ lsblk
    NAME          MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
    nvme1n1       259:0    0  30G  0 disk /data
    nvme0n1       259:1    0  16G  0 disk
    └─nvme0n1p1   259:2    0   8G  0 part /
    └─nvme0n1p128 259:3    0   1M  0 part
    ```

2. Ici, nous voyons que nous avons 2 disques dur NVMe. Sur **nvme0n1**,
    nous pouvons voir 2 partitions, une de 8GB et une de 1M. Nous souhaitons
    donc étendre la partition root à 16G. On regarde d'abord ce que growpart compte faire avec `-N` (dry-run, rien n'est écrit) :

    ```bash
    [vps ~]$ growpart -N /dev/nvme0n1 1
    ```

    Puis on lance pour de vrai :

    ```bash
    [vps ~]$ growpart /dev/nvme0n1 1
    ```

3. La syntaxe du logiciel est très simple à comprendre. Nous prenons le
    disque dur nvme0n1 et choisissons la première partition. Si la partition occupe déjà tout l'espace, growpart répond `NOCHANGE` sans rien toucher. Nous refaisons
    un coup de lsblk afin de s'assurer que la partition a été étendue :

    ```bash
    [vps ~]$ lsblk
    NAME          MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
    nvme1n1       259:0    0  30G  0 disk /data
    nvme0n1       259:1    0  16G  0 disk
    └─nvme0n1p1   259:2    0  16G  0 part /
    └─nvme0n1p128 259:3    0   1M  0 part
    ```

4. Nous pouvons voir désormais que la partition fait 16G et non 8G. Il ne
    nous reste plus qu'à étendre le filesystem, et la commande dépend de son type. On le vérifie :

    ```bash
    [vps ~]$ df -T /
    ```

    En ext4, `resize2fs` prend le device :

    ```bash
    [vps ~]$ resize2fs /dev/nvme0n1p1
    ```

    En XFS (le défaut sur RHEL et Amazon Linux 2023), `resize2fs` échoue avec `Bad magic number in super-block`. On utilise `xfs_growfs`, qui prend le point de montage :

    ```bash
    [vps ~]$ xfs_growfs /
    ```

</div>

Nous avons désormais notre partition / étendue sans aucune interruption
de service
