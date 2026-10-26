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

2. Maintenant, on génère les clés (Je recommande une taille de 1024b et
    non 512)

    ```cisco
        Router(config)# crypto key generate rsa
    ```

3. Puis on génère des identifiants

    ```cisco
        Router(config)# username xxxx secret xxxx
    ```

</div>

Et voilà, nous disposons d'un serveur SSH fonctionnel

## Bonus

## Désactivation du telnet

Maintenant que nous disposons d'un serveur SSH, le telnet s'avère peu
utile, nous pouvons donc le telnet

```cisco
    line vty 0 15
    transport input ssh
    login local
```

## Sécurisation

Pour plus de sécurité, nous pouvons abaisser le max de retries, mais
également baisser la durée avant timeout, mais aussi passer à SSHv2
(Comme nous sommes avec des keys de 1024b)

```cisco
    ip ssh authentication-retries 2
    ip ssh time-out 15
    ip ssh version 2
```
