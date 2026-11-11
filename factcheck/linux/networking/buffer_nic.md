---
article: docs/linux/networking/buffer_nic.md
checked: '2026-11-10'
commit: b848216514f47aeb1603f2c11437cc1ec3f6da01
sources: []
unpinned: 4
---

# docs/linux/networking/buffer_nic.md

## Findings

- L11 ERROR corrigé : "aucune raison de ne pas le pousser au maximum" remplacé par : on n'augmente pas par réflexe (mémoire, latence en charge), on augmente quand `ethtool -S` montre des drops côté réception. Preuve : raisonnement établi (bufferbloat), source ESnet citée par l'article non relue verbatim. Partiellement vérifié seulement.
- L48 ERROR corrigé : `echo` cassé remplacé par un heredoc `<<'EOF'` vers `59-net-ring.rules` + `udevadm verify`. Preuve : la commande d'origine lancée dans bash : "change, SUBSYSTEM==net, KERNEL==eth*: command not found", rc=127, fichier vide ; la nouvelle règle dans `debian:trixie-20251020` (udev 257) : `udevadm verify` "Success: 1, Fail: 0", `$name` intact dans le fichier.
- L39 IMPRECISE corrigé (prudence) : phrase sur la coupure de lien possible avec `-G` sur beaucoup de drivers, éviter en SSH sur l'interface de connexion. Non testé sur une vraie NIC (pas de matériel), gardé car c'est une précaution sans risque.
- L48 IMPRECISE corrigé : phrase "les valeurs ne peuvent pas dépasser les Pre-set maximums" ; chemin `/usr/sbin/ethtool` + conseil `command -v ethtool`. Preuve : `command -v ethtool` = `/usr/sbin/ethtool` dans debian:trixie.

## En plus

- `udevadm verify` annoté "systemd 254+". Preuve : `man/udevadm.xml` absent de `verify` en v253, présent en v254 (clone systemd-systemd).

## Modernisation

- systemd.link appliqué, sous forme de drop-in `99-default.link.d/ring.conf` (une `.link` séparée remplacerait `99-default.link` pour l'interface, seul le premier fichier qui matche s'applique). Preuve : `man/systemd.link.xml@origin/main:1232-1243` (RxBufferSize/TxBufferSize, "max" = maximum hardware) ; option depuis v244, `max` depuis v250 (absent de v248, présent en v250), drop-ins `.link.d` depuis v248 (absent en v247). Test : `udevadm test-builtin net_setup_link /sys/class/net/eth0` dans debian:trixie liste `ID_NET_LINK_FILE_DROPINS=/etc/systemd/network/99-default.link.d/ring.conf`, sans erreur de parsing (application ethtool sautée en mode test).
- NetworkManager `ethtool.ring-rx` : non appliqué, pas de source locale ni test.
- BQL / fq_codel : non appliqué, hors sujet de l'article court.

## Tests

- bash 5 local (reproduction de l'echo cassé) ; OrbStack `debian:trixie-20251020` avec udev 257 et ethtool (2 conteneurs `--rm`).

## À signaler

- Le fact-check citait systemd v248 pour RxBufferSize : l'option existe depuis v244, c'est `max` qui demande v250.
