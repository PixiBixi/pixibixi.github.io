---
description: Simuler des conditions réseau - latence, perte de paquets et limitation de bande passante
tested_with:
  - "iproute2 6.1"
tags:
  - tc
  - Bandwidth
---

# Simuler des conditions réseau sur Linux

Il peut être intéressant de limiter sa bande passante pour simuler
certaines bande passante ou autre, ou tout simplement pour brider un
processus.

## Méthode barbare

La méthode barbare consiste à tout simplement jouer avec les iproute
directement avec la commande **tc**.

**tc** va nous permettre d'ajouter de la latence artificielle, limiter
le débit...

D'autres options sont disponibles, mais ne sont que très peu utile
(packet re-ordering, duplication...)

!!! warning "Session SSH"
    Les règles s'appliquent à tout le trafic sortant de l'interface, y compris la session SSH qui sert à les poser. On évite de tester sur l'interface d'administration, ou on garde la commande de suppression sous la main.

### Ajout de latence

```bash
tc qdisc add dev eth0 root netem delay 200ms
```

Via cette commande, nous ajoutons sur l'interface **eth0** 200ms de
latence via le network emulator (netem). Une commande plus précise
existe afin de simuler un comportement plus réel d'une connexion
domestique basique

```bash
tc qdisc change dev eth0 root netem delay 100ms 10ms 25%
```

Les arguments supplémentaires ajoutent un jitter de 10ms (100ms ± 10ms), et chaque valeur de délai dépend à 25% de la précédente : la latence varie sans faire de sauts aléatoires d'un paquet à l'autre.

### Perte de paquet

En 4G, il n'est pas rare d'avoir une connexion instable avec perte de
paquets, voici donc comment le simuler :

```bash
tc qdisc change dev eth0 root netem loss 2%
```

2% de loss seront appliqués sur tous vos paquets, soit 2 paquets sur 100
(en flat)

```bash
tc qdisc change dev eth0 root netem loss 2% 33%
```

Toujours 2% de pertes, mais avec une corrélation de 33% sur la perte du paquet précédent : les pertes arrivent plutôt en rafales.

`change` remplace toute la configuration netem : la latence posée plus haut disparaît. Pour cumuler latence et perte, on passe tout dans la même commande, et `replace` crée la qdisc si elle n'existe pas encore (rejouable sans erreur) :

```bash
tc qdisc replace dev eth0 root netem delay 100ms 10ms 25% loss 2%
```

### Bande passante

Méthode simple. Il est possible de jouer plus finement avec de la QoS. `tbf` exige un `burst` et une `latency` (ou `limit`), sinon la commande est refusée :

```bash
tc qdisc add dev eth0 root tbf rate 10mbit burst 32kbit latency 400ms
```

netem sait aussi brider le débit, ce qui permet de tout combiner dans une seule qdisc :

```bash
tc qdisc replace dev eth0 root netem delay 100ms rate 10mbit
```

### Retirer les règles

On vérifie ce qui est en place, puis on supprime la qdisc pour revenir à la normale :

```bash
tc qdisc show dev eth0
tc qdisc del dev eth0 root
```

## Méthode simple

Un wrapper a été développé permettant de manipuler (uniquement) la bande
passante simplement. La syntaxe dépend de la version installée :

- la 1.1a packagée par Debian jusqu'à bookworm prend des arguments positionnels (`wondershaper eth0 1024 1024`), mais elle repose sur la qdisc `cbq`, retirée du kernel depuis Linux 6.3 : sur un kernel récent, elle n'applique plus rien. Le paquet n'existe plus depuis trixie
- la version upstream ([magnific0/wondershaper](https://github.com/magnific0/wondershaper)) utilise `htb` et des options

Avec la version upstream, la syntaxe est la suivante : `wondershaper -a <interface> -d <downlink> -u <uplink>`

Ce qui nous donne par exemple

```bash
wondershaper -a eth0 -d 1024 -u 1024
```

On bride ici le traffic de eth0 en DL/UL a environ 1 Mbit/s (les débits sont en Kbps). Le bridage du download passe par une interface `ifb0`, qui demande le module kernel `ifb`.

Pour retirer les limites :

```bash
wondershaper -c -a eth0
```

---

## Voir aussi

- [Mémo sur la commande IP](ip.md) - configuration des interfaces réseau
