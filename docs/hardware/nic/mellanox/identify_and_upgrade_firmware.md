# Identifier and upgrade son firmware Mellanox

Dans certains cas, il peut être utile d'upgrade son firmware de sa NIC si vous rencontrez différents soucis, ou tout simplement pour obtenir des nouveautés firmware.

Premièrement, nous devons repérer nos lignes PCI correspondant à notre NIC :

```
root@hostname:/home/user# lspci |grep -i mel
18:00.0 Ethernet controller: Mellanox Technologies MT27800 Family [ConnectX-5]
18:00.1 Ethernet controller: Mellanox Technologies MT27800 Family [ConnectX-5]
af:00.0 Ethernet controller: Mellanox Technologies MT27800 Family [ConnectX-5]
af:00.1 Ethernet controller: Mellanox Technologies MT27800 Family [ConnectX-5]
```

Nous voyons ici que nous avons 2 NIC, chacune comprenant 2 ports.

Via l'utilitaire que nous fournit Mellanox, nous pourrons récuperer le PSID de la NIC, qui correspondra à un modele precis.

```
root@hostname:/home/user# mstflint -d 18:00.0 q
Image type:            FS4
FW Version:            16.25.1020
FW Release Date:       30.4.2019
Product Version:       16.25.1020
Rom Info:              type=UEFI version=14.18.19 cpu=AMD64
                       type=PXE version=3.5.701 cpu=AMD64
Description:           UID                GuidsNumber
Base GUID:             1c34da0300682e10        4
Base MAC:              1c34da682e10            4
Image VSD:             N/A
Device VSD:            N/A
PSID:                  MT_0000000248
Security Attributes:   N/A
```

Nous voyons ici que notre première NIC a le PSID _MT_0000000248_.

Après une petite recherche Google, nous pouvons en déduire qu'il s'agit du modele MCX542B-ACA.

Via un autre utilitaire fournit par Mellanox, disponible [ici](https://network.nvidia.com/products/adapter-software/firmware-tools/), nous devons trouver le nom "interne" de la NIC.

```
root@hostname:/home/user# mst start
root@hostname:/home/user# mst status
MST modules:
------------
    MST PCI module is not loaded
    MST PCI configuration module loaded

MST devices:
------------
/dev/mst/mt4119_pciconf0         - PCI configuration cycles access.
                                   domain:bus:dev.fn=0000:18:00.0 addr.reg=88 data.reg=92 cr_bar.gw_offset=-1
                                   Chip revision is: 00
/dev/mst/mt4119_pciconf1         - PCI configuration cycles access.
                                   domain:bus:dev.fn=0000:af:00.0 addr.reg=88 data.reg=92 cr_bar.gw_offset=-1
                                   Chip revision is: 00
```

Imaginons que nous voulons upgrade notre NIC ayant comme ligne PCI 18:00.0, son nom est donc `/dev/mst/mt4119_pciconf0`. Nous n'avons plus qu'à appliquer le firmware avec flint :

```
root@hostname:/home/user# flint -d <device_name> -i <binary image> burn
```

Un petit restart, un recommence la commande mstflint, et hop, firmware upgraded :)
