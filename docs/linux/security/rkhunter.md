---
description: Scanner et détecter les rootkits avec RKHunter en comparant les fichiers système à une baseline locale
tags:
  - rkhunter
tested_with:
  - "rkhunter 1.4.6 (Debian 12)"
---

# Installer et configurer RKHunter

rkhunter (pour Rootkit Hunter) est un petit programme UNIX permettant de détecter les rootkits. Il cherche des signatures de rootkits connus et compare les propriétés des fichiers importants (hash, droits, taille, inode...) aux valeurs qu'il a lui-même enregistrées en local lors d'un `--propupd`. Il n'y a pas de base de hashs en ligne : la référence est une photo de la machine. Le hash utilisé est un seul algo à la fois, SHA256 par défaut (`HASH_CMD` dans `/etc/rkhunter.conf` ou `--hash`, MD5 ou SHA1 sur un système avec prelink).

Le cycle classique, juste après l'installation sur une machine saine :

```bash
# Photo de référence des fichiers, à faire sur un système sain
rkhunter --propupd
# Met à jour les fichiers de données (mirrors, signatures, programmes connus), pas les hashs
rkhunter --update
# Scan, sans pause interactive, en n'affichant que les warnings
rkhunter --check --sk --rwo
```

Le piège : un `--propupd` lancé sur une machine déjà compromise fige la compromission dans la baseline, et rkhunter ne verra plus rien. Après une mise à jour de paquets, on relance `--propupd` seulement si on est sûr que les changements viennent du gestionnaire de paquets.

Le projet est quasi à l'arrêt : la dernière release est la 1.4.6 de février 2018 (c'est encore celle de Debian 12), donc pas de signatures pour les rootkits récents. On le complète avec AIDE ou un IDS dont la baseline est stockée hors de la machine.

<https://wiki.debian-fr.xyz/Rkhunter>

<https://grepitout.com/how-to-install-rkhunter-on-centos/>
