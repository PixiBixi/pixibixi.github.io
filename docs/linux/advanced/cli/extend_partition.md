# Etendre à chaud sa partition root

Etendre une partition root à chaud sur son serveur requiert généralement
un redémarrage de ce dernier sur un système rescue (hors système
scalable comme LVM,XFS ou autre). Hors, via un simple logiciel, il est
possible d'éviter ce redémarrage en rescue : **growpart**.

Ceci peut être extrêmemnt utile dans le cas d'un agrandissement à chaud
d'un disque dur d'un VPS par exemple.

Tout d'abord, nous devons vérifier que le disque dur a bien été étendu
sur le système :

```bash
[vps ~]$ lsblk
NAME          MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
nvme1n1       259:0    0  30G  0 disk /data
nvme0n1       259:1    0  16G  0 disk
└─nvme0n1p1   259:2    0   8G  0 part /
└─nvme0n1p128 259:3    0   1M  0 part
```

Ici, nous voyons que nous avons 2 disques dur NVMe. Sur **nvme0n1**,
nous pouvons voir 2 partitions, une de 8GB et une de 1M. Nous souhaitons
donc étendre la partition root à 16G.

```bash
[vps ~]$ growpart /dev/nvme0n1 1
```

La syntaxe du logiciel est très simple à comprendre. Nous prenons le
disque dur nvme0n1 et choisissons la première partition. Nous refaisons
un coup de lsblk afin de s'assurer que la partition a été étendue :

```bash
[vps ~]$ lsblk
NAME          MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
nvme1n1       259:0    0  30G  0 disk /data
nvme0n1       259:1    0  16G  0 disk
└─nvme0n1p1   259:2    0  16G  0 part /
└─nvme0n1p128 259:3    0   1M  0 part
```

Nous pouvons voir désormais que la partition fait 16G et non 8G. Il ne
nous reste plus qu'à notifier ce changement

```bash
[vps ~]$ resize2fs /dev/nvme0n1p1
```

Nous avons désormais notre partition / étendue sans aucune interruption
de service
