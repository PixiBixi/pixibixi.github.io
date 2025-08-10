# Autoriser les transceiver no-name

Pour éviter de payer une fortune le transceiver 1XG LC LR, il est
possible d'autoriser des transceivers dit '"no-name'". Par exemple, un
simple transceiver 1XG LC LR peut couter dans les 300e alors que le
no-name (qui fera exactement le même travaille) ne coutera que 25e.

Voici la commande magique à rentrer (en configuration générale)

```cisco
    service unsupported-transceiver
```

Et voici les logs que vous obtiendrez :

```cisco
Feb 18 12:40:49 sw4-occ4-bre01 warning/821: 000810: Feb 18 12:40:49: %GBIC_SECURITY-4-UNSUPPORTED_GBIC_INSERTED: Unsupported transceiver inserted in port Gi1/48
Feb 18 12:40:50 sw4-occ4-bre01 err/822: 000811: Feb 18 12:40:49: %C4K_CHASSIS-3-TRANSCEIVERCRCINTEGRITYCHECKFAILED: Transceiver integrity check on port Gi1/48 failed: bad crc
Feb 18 12:40:51 sw4-occ4-bre01 notice/823: 000812: Feb 18 12:40:50: %C4K_IOSINTF-5-TRANSCEIVERINSERTED: Slot=1 Port=48: Transceiver has been inserted
Feb 18 12:40:55 sw4-occ4-bre01 notice/824: 000813: Feb 18 12:40:54: %EC-5-BUNDLE: Interface GigabitEthernet1/48 joined port-channel Port-channel1
```
