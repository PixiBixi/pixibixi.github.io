---
description: Autoriser les transceivers génériques (no-name) sur Cisco IOS pour réduire les coûts d'infrastructure
tags:
  - Cisco
  - Hardware
---

# Autoriser les transceiver no-name

Pour éviter de payer une fortune un transceiver Cisco, il est possible d'autoriser des transceivers dits « no-name ». Par exemple, un simple SFP 1000BASE-LX/LH (1G, monomode, LC, GLC-LH-SMD chez Cisco) pouvait coûter dans les 300e quand j'ai écrit ces lignes, alors que l'équivalent no-name ne coûtait que 25e. Attention à prendre le bon type : en 10G, l'équivalent monomode est un SFP+ 10GBASE-LR.

La commande est cachée et non supportée : IOS affiche un avertissement à la saisie, et le TAC Cisco peut refuser le support sur un problème qu'il impute à l'optique tierce. Un no-name bas de gamme peut aussi se montrer moins fiable (DOM absent ou faux, lien instable), on surveille les erreurs sur l'interface après la pose.

Voici la commande magique à rentrer (en configuration générale)

```cisco
    service unsupported-transceiver
```

Et voici les logs qu'on obtient sur un Catalyst 4500 : le switch signale l'optique non supportée et l'échec du contrôle d'intégrité, puis le port monte quand même.

```cisco
Feb 18 12:40:49 sw4-occ4-bre01 warning/821: 000810: Feb 18 12:40:49: %GBIC_SECURITY-4-UNSUPPORTED_GBIC_INSERTED: Unsupported transceiver inserted in port Gi1/48
Feb 18 12:40:50 sw4-occ4-bre01 err/822: 000811: Feb 18 12:40:49: %C4K_CHASSIS-3-TRANSCEIVERCRCINTEGRITYCHECKFAILED: Transceiver integrity check on port Gi1/48 failed: bad crc
Feb 18 12:40:51 sw4-occ4-bre01 notice/823: 000812: Feb 18 12:40:50: %C4K_IOSINTF-5-TRANSCEIVERINSERTED: Slot=1 Port=48: Transceiver has been inserted
Feb 18 12:40:55 sw4-occ4-bre01 notice/824: 000813: Feb 18 12:40:54: %EC-5-BUNDLE: Interface GigabitEthernet1/48 joined port-channel Port-channel1
```
