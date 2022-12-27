## Repérer un disque dur défaillant en le faisant clignoter

Pour identifier un disque défaillant afin de le remplacer, il nous faut
auparavant connaitre le disque dur défaillant

```bash
sysconfig -r
```

Voici ce que vous aurez pour un disque défaillant

```bash
Broken disks

RAID Disk       Device          HA  SHELF BAY CHAN Pool Type  RPM  Used (MB/blks)    Phys (MB/blks)
---------       ------          ------------- ---- ---- ---- ----- --------------    --------------
failed          0b.01.3         0b    1   3   SA:B   0   SAS 10000 560000/1146880000 572325/1172123568
```

Et voici la commande pour faire clignoter le disque (Il faut auparavant
passer en mode avancé : **priv set advanced**)

```bash
blink_on 0b.01.3
```
