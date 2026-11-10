---
description: Augmenter les buffers RX/TX d'une carte réseau avec ethtool et udev pour optimiser les performances
tags:
  - NIC
  - Performance
---

# Augmenter le buffer de sa carte réseau

Dans certains cas spécifiques, augmenter le buffer de sa carte réseau
peut être bénéfique pour votre serveur. On ne le pousse pas au maximum par réflexe : des ring plus grands consomment plus de mémoire et ajoutent de la latence en charge (bufferbloat). On augmente quand on voit des drops côté réception (`ethtool -S eno1 | grep -iE 'drop|miss|no_buf'`), typiquement sur des micro-bursts à fort pps.

## Augmenter ses buffers

Pour augmenter ses buffers, on utilise le merveuilleux outil disponible
partout, ethtool. On observe dans un premier temps les buffers
disponibles et ceux qu'on a déjà appliqués.

```bash
[vps ~]$ ethtool -g eno1
Ring parameters for eno1:
Pre-set maximums:
RX:             4096
RX Mini:        0
RX Jumbo:       0
TX:             4096
Current hardware settings:
RX:             512
RX Mini:        0
RX Jumbo:       0
TX:             512
```

On voit ici que nos buffers sont 8x inférieurs à ceux qu'on peut
potentiellement mettre. Les valeurs ne peuvent pas dépasser les `Pre-set maximums` de la carte, ici 4096. Sur beaucoup de drivers, `-G` réinitialise la carte et coupe le lien quelques secondes : on évite de le lancer en SSH sur l'interface par laquelle on est connecté. Voici comment les appliquer

```bash
[vps ~]$ ethtool -G eno1 rx 4096 tx 4096
```

### De façon permanente

Malheureusement, ethtool n'agit pas de manière permanente, voici une
des manières pour rendre permanente le fix. Le heredoc entre quotes simples garde `$name` intact (c'est udev qui le remplace par le nom de l'interface), et on met le chemin de `ethtool` donné par `command -v ethtool` :

```bash
cat > /etc/udev/rules.d/59-net-ring.rules <<'EOF'
ACTION=="add|change", SUBSYSTEM=="net", KERNEL=="eth*|en*", RUN+="/usr/sbin/ethtool -G $name rx 4096 tx 4096"
EOF
udevadm verify /etc/udev/rules.d/59-net-ring.rules  # systemd 254+
```

Sur une distro avec systemd 248 ou plus, un drop-in sur le `.link` par défaut fait la même chose sans script (`max` prend le maximum annoncé par la carte à partir de systemd 250, avant on met une valeur) :

```ini title="/etc/systemd/network/99-default.link.d/ring.conf"
[Link]
RxBufferSize=max
TxBufferSize=max
```

Il s'applique quand udev traite l'interface, donc au prochain boot ou après un `udevadm trigger --action=add /sys/class/net/eno1`.

Plus d'informations
[ici](https://fasterdata.es.net/host-tuning/linux/nic-tuning/)
