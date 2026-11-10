---
description: Accélérer les connexions SSH en réutilisant une connexion déjà établie avec ControlMaster
tags:
  - SSH
---

# Améliorer la vitesse de connexion à votre serveur SSH

Dans la vie d'un sysadmin, nous devons nous connecter des dizaines de
fois par jour à différents serveurs SSH, parfois situés à l'autre bout
de la planète et ainsi entrainant une latence assez importance. Une connexion SSH, ce n'est pas qu'un 3 Way Handshake TCP (1 aller-retour) : il y a ensuite l'échange de version, l'échange de clés, l'authentification puis l'ouverture du canal, soit une bonne demi-douzaine d'allers-retours. Imaginons un serveur situé à Paris alors que nous sommes en Colombie, avec environ 200 ms de RTT : on approche vite la seconde de latence lors de **chaque** connexion au serveur.

Heureusement, les développeurs du client SSH ont pensés à tout et ont développés un multiplexer SSH. Lorsque cette option est activée, la première connexion devient un master qui reste ouvert (TCP, échange de clés et authentification déjà faits), et les connexions suivantes ne sont que de nouveaux canaux sur ce master, via un socket unix local. Le gain de temps est considérable.

## Configuration

La configuration se fait d'une manière simpliste dans votre fichier de
configuration ssh côté client

```bash
λ MacBook-Pro-de-Delgado ~ → cat ~/.ssh/config
Host *
    ControlMaster auto
    ControlPath ~/.ssh/private/master-%r@%h:%p.socket
    ControlPersist 10m
```

Nous appliquons la valeur auto à ControlMaster car il s'agit de
l'option la plus logique à utiliser. Celle-ci essaie d'utiliser une
connexion maitre déjà existante, si celle-ci n'existe pas, alors elle
sera créée. Le ControlPath est définit dans un dossier propre à notre
utilisateur et ne doit **surtout** pas être accessible par tous. %r sera
remplacé par l'username, %h par l'host et %p par le port utilisé.
Enfin, `ControlPersist 10m` garde le master en arrière-plan pendant 10 minutes après la fermeture de la dernière session : c'est un délai d'inactivité, pas une durée de vie fixe.

Le dossier private n'existe pas, on le crée avec des droits restreints :

```bash
mkdir -m 700 -p ~/.ssh/private
```

Un chemin de socket unix est limité à 104 octets sur macOS (108 sur Linux). Avec un FQDN un peu long, ssh refuse la connexion (`ControlPath too long`). Le token `%C` (OpenSSH 6.7+), un hash de l'host, du port, de l'user et du ProxyJump, garde un chemin court :

```bash
    ControlPath ~/.ssh/private/%C
```

Evidemment, des explications plus détaillées sont disponibles dans le
[man de ssh_config](https://man.openbsd.org/ssh_config)

## Benchmark

Benchmark effectué dans un train avec une connexion mitigée.

```bash
λ MacBook-Pro-de-Delgado ~ → time ssh backup.x.y.tld ls
ssh backup.x.y.tld ls  0,03s user 0,02s system 2% cpu 2,149 total
λ MacBook-Pro-de-Delgado ~ → time ssh backup.x.y.tld ls
ssh backup.x.y.tld ls  0,00s user 0,01s system 4% cpu 0,284 total
```

Lors de la première connexion, aucun master n'existait, ainsi, la commande ls a durée 2,1s. Lors du second lancement, le master était ouvert et a donc été réutilisé. Notre commande a durée à peine 0,28s, soit environ 7,5x plus rapide. Le gain peut vous sembler dérisoire,
cependant, multilplié sur une journée ainsi que 200j/an, il s'avère
considérable.

## Précautions

!!! warning
    Toutes les sessions vers un host passent par une seule connexion TCP : un gros `rsync` ou `scp` ralentit les autres sessions, et si le master tombe, toutes les sessions tombent avec lui. Pour ces opérations, on contourne le master ponctuellement avec `-S none` (`ssh -S none host`, `rsync -e 'ssh -S none'`, `scp -o ControlPath=none`).

## Troubleshooting

Pour être sûr qu'un socket est ouvert, nous pouvons utiliser la control
command (-O dans ssh) **check**.

```bash
ssh -O check backup.x.y.tld ls
Control socket connect(/Users/jeremy/.ssh/private/master-y-jd@backup.x.y.tld:6666): No such file or directory
```

Ici, nous voyons que le socket n'est pas créé. C'est normal tant qu'on ne s'est pas encore connecté : avec `ControlMaster auto`, le socket n'apparaît qu'à la première connexion, et `ControlPersist` le garde ensuite. Si le socket n'existe toujours pas après une connexion, on vérifie que le dossier existe et dispose de bons droits, puis on peut initialiser le master à la main :

```bash
ssh -M -S /Users/jeremy/.ssh/private/master-y-jd@backup.x.y.tld:6666 backup.x.y.tld
```

Désormais, si vous refaites notre commande de check, vous devrez
utiliser le socket :

```bash
ssh -O check backup.x.y.tld
Master running (pid=87060)
```

Si pour une quelconque raison on souhaite arrêter le master, on utilise la control command **exit**. Elle coupe le master tout de suite, et toutes les sessions qui passent par lui :

```bash
ssh -O exit backup.x.y.tld
Exit request sent.
```

La control command **stop** est plus douce : le master supprime son socket et refuse les nouvelles sessions, mais continue à servir celles en cours et ne s'arrête qu'à la fermeture de la dernière (la prochaine connexion crée un nouveau master) :

```bash
ssh -O stop backup.x.y.tld
Stop listening request sent.
```
