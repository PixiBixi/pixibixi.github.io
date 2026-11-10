---
description: Activer et configurer un serveur SSH sur Cisco IOS pour remplacer Telnet
tags:
  - Cisco
  - SSH
---

# Serveur SSH

Un serveur SSH est désormais indispensable, voici donc comment en
installer

<div class="steps" markdown>

1. Nous devons tout d'abord définir un hostname et un domain-name (Utile
    afin de générer les keys)

    ```cisco
        Router(config)# hostname wiki
        Router(config)# ip domain-name jdelgado.fr
    ```

2. Maintenant, on génère les clés en 2048 bits minimum (4096 si l'équipement le supporte). Sans `modulus`, IOS pose la question en interactif avec 512 par défaut, trop faible : SSHv2 exige au moins 768 bits et 1024 n'est plus considéré comme sûr.

    ```cisco
        Router(config)# crypto key generate rsa modulus 2048
    ```

3. On force SSHv2 tout de suite : sans `ip ssh version 2`, IOS tourne en mode compatibilité et accepte aussi SSHv1.

    ```cisco
        Router(config)# ip ssh version 2
    ```

4. Puis on génère des identifiants. Avec `algorithm-type scrypt` (IOS 15.3(3) et plus), le secret est stocké en type 9 (scrypt) au lieu d'un hash MD5 type 5.

    ```cisco
        Router(config)# username xxxx algorithm-type scrypt secret xxxx
    ```

</div>

Et voilà, nous disposons d'un serveur SSH fonctionnel

## Bonus

## Désactivation du telnet

Maintenant que nous disposons d'un serveur SSH, le telnet s'avère peu
utile, nous pouvons donc le désactiver

```cisco
    line vty 0 15
    transport input ssh
    login local
```

## Sécurisation

Pour plus de sécurité, nous pouvons abaisser le max de retries et baisser la durée avant timeout.

```cisco
    ip ssh authentication-retries 2
    ip ssh time-out 15
```
