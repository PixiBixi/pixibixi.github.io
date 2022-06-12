# La commande ss

La commande ss est aujourd'hui le nouveau *netstat*. *netstat* étant
déprécié depuis des années, voici comment l'utiliser :

## Lister toutes les connexions

Une utilité basique, une commande basique

``` bash
$ ss | less
```

Nous voyons ici **toutes** les connexion, aussi bien celles basées sur
UDP/TCP, que des connexions à des sockets UNIX. Cette commande est
complète, mais l'est donc trop (Par exemple, nous ne voulons
généralement pas voir les connexions à des sockets UNIX)

## Filtrer les connexions TCP, UDP ou Unix

Rentrons un peu plus en profondeur dans la commande ss avec les filtres
par type de connexion

-   **-t** ou **'--tcp** : Socket TCP
-   **-u ou '--udp** : Socket UDP
-   **-x ou '--unix** : Sockets UNIX

Les filtres sont assez explicites. Il existe également 2 autres types de
filtres, mais ceux-ci ne sont jamais utilisés dans un usage normal :

-   **-d ou '--dccp** : Sockets DCCP
-   **-w ou '--raw** : Sockets RAW

Cette option est particulièrement utilisée avec **-a ou '--all** qui
permet de lister toutes les connexions d'un protocole

Par exemple, pour lister toutes les connexions TCP :

``` bash
$ ss -t -a | less
```

Par défaut (sans l'option -a), seuls les connexions ESTABLISHED sont
listées (ou CONNECTED pour UDP). (Il s'agit de l'option '*'*-l ou
'*'*'--listening)

## Afficher les numéros de port / ne pas résoudre les IPs

Par défaut, il faut savoir que ss convertit les numéros de port par le
service associé (en se basant sur le fichier /etc/services) mais
n'essaie de résoudre l'IP par le rDNS associé.

Il est fort préférable que vous préferiez voir l'IP et le numéro de
port, plutôt que le rDNS et le service associé au port.

Pour cela, voici l'option :

-   **-n ou '--numeric** : Permet de ne pas résoudre les IP et les ports
    associés aux services

A noter qu'il n'est pas possible de ne pas résoudre les adresses IPs
ou les numéros de ports uniquement, les deux sont liés.

Pour résoudre les adresses IP :

-   **-r ou '--resolve** : Permet de résoudre les adresse IPs

Petit exemple en cumulant les paramètres vu avant

``` bash
$ ss -s -t -a
```

## Afficher le nom du processus lié et son pid

Lister précisément les connexions n'est pas très utile si on ne connait
pas le pid du programme associé. Heureusement, la commande ss à pensé à
tout.

-   **-p ou '--pid** : Permet de lister le processus lié à une connexion

``` bash
$ ss -p
```

## Afficher des statistiques avec SS

ss sait aussi faire des statistiques des connexions actives sur votre
serveur

'* **-s ou '--summary**

``` bash
$ ss -s
```

## Filtrer les connexions par types

Si vous ne souhaitez voir que les connexions IPv4 ou IPv6 (voir socket),
c'est possible avec ss :

-   **-f ou '--family='...**

Et voici les types disponibles

-   **inet**
-   **inet6**
-   **link**
-   **netlink**

Voici un exemple d'utilisation

``` bash
$ ss -a -f inet6 -t -n
```

Dans cette example, j'affiche toutes les connexion IPv6 en TCP sans
résoudre le numéro de port

## ss et les filtres

### Filter les états

Dans ss, il est possible de filtrer leur connexion via leur statut
(ESTABLISHED, CLOSED'...) de manière extrêmement simple :

``` bash
$ ss state ESTABLISHED
```

Dans cet exemple, j'affiche toutes les connexions ayant ESTABLISHED en
état.

Voici tous les états supportés par ss

-   established
-   syn-sent
-   syn-recv
-   fin-wait-2
-   fin-wait-1
-   time-wait
-   closed
-   close-wait
-   last-ack
-   listen
-   closing

Certains de ces états sont également regroupés en '"catégories'" :

-   **connected** =
    {established'|syn-sent'|syn-recv'|fin-wait-{1,2}'|time-wait'|close-wait'|last-ack'|closing}
-   **synchronized** =
    {established'|syn-recv'|fin-wait-{1,2}'|time-wait'|close-wait'|last-ack'|closing}
-   **bucket** = {syn-recv'|time-wait}
-   **big** =
    {established'|syn-sent'|fin-wait-{1,2}'|closed'|close-wait'|last-ack'|listen'|closing}

### Filter les ports

Et enfin, ultime fonctionnalité, le filtrage de port, qui permet de
sélectionner par port source ou destination, par exemple

``` bash
$ ss -t -n sport eq 1998
```

Dans cet exemple, nous voulons voir toutes les connections TCP dont le
port source est 1998

Il est également possible de faire la même commande avec le nom du
service

``` bash
$ ss -nt state ESTABLISHED dst :https
```

Ici, nous voulons toutes les connexions TCP ayant l'état ESTABLISHED
dont le port destination est HTTPS.

Et enfin, il est possible de réunir plusieurs conditions avec un **AND**
ou **OR**

``` bash
$ ss -nt ( dport = :443 or dport = :80 )
```

Enfin, nous voulons ici lister toutes les connexions de notre machine
vers des sites internet (HTTP ou HTTPS)
