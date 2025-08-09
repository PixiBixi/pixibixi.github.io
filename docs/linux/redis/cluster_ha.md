# Déployer un Redis en High Availability

Redis c'est bien, qu'il soit toujours dispo, c'est mieux. On va voir
comment faire un cluster pour le rendre redondant côté applicatif
(sentinel/HAproxy), mais également côté IP (IPFO).

## Outils utilisés

Dans notre cluster, nous allons utiliser les outils suivants :

  * **sentinel** : Nous l'utiliserons pour surveiller nos nœuds
    maître/esclave, sentinel élira un esclave pour le passer en maître
    lorsqu'un problème survient.
  * **haproxy** : Équilibreur de charge TCP, HAproxy peut tester si un
    noeud redis est maître ou esclave, nous l'utiliserons comme
    front-end auquel les clients se connecteront. HAproxy détectera quel
    noeud est maître et s'assurera que le trafic circule vers le bon
    noeud. Nous pouvons égalment utiliser un autre frontend HAproxy afin
    de balancer les lectures sur tous les noeuds Redis
  * **pacemaker** : équilibreur de charge au niveau du réseau, nous
    utiliserons pacemaker pour exposer une ip virtuelle et gérer le
    basculement entre nos noeuds HAproxy.

## Atteindre une disponibilité de 100%

  * **Réplication Redis** - Redis a une réplication intégrée, nous
    configurerons redis2/redis3 comme esclave, ce qui assurera que nos
    trois nœuds redis ont les mêmes données RDB.

  * **Défaillance Redis** : Si notre maître Redis tombe en panne
    (redis1), un des nœuds sentinelle/redis esclave (redis2) détecteront
    la défaillance. Nous utilisons 3 nœuds sentinelle pour nous assurer
    d'avoir un quorum, ce qui garantit que nous n'aurons pas de faux
    positifs en cas de problème de réseau entre deux nœuds redis. Nous
    nous assurons que deux systèmes distincts surveillent le maître et
    que les deux doivent convenir que le maître a échoué. Si 2 instances
    de sentinel sont d'accord, le processus redis-sentinel s'exécutant
    sur le nœud esclave (redis2) convertira le nœud en maître. HAproxy
    surveillera les nœuds maître et esclave (redis1/2) à tout moment, il
    s'assurera que le nœud maître sera celui vers lequel le trafic sera
    dirigé.

  * **Défaillance de HAproxy** : En cas de problème de HAproxy, nous
    avons probablement un problème plus important concernant le serveur.
    L'IP sera donc re-routée sur un autre serveur avec pacemaker.

## Installation initiale

Imaginons que nous avons ces IPs

|  Machine |   IPs         |
|----------|:-------------:|
|  redis1  |   10.10.10.1  |
|  redis2  |   10.10.10.2  |
|  redis3  |   10.10.10.3  |
|  IPFO    | 10.10.10.100  |

redis1 sera pour nous le master.

Installation des packages nécessaires :

```bash
$ apt install -y haproxy redis redis-sentinel
```

Pour simplifier la configuration, on entre tout dans le fichier hosts

```bash
$ cat /etc/hosts
redis1.internal 10.10.10.1
redis2.internal 10.10.10.2
redis3.internal 10.10.10.3
redis.lb-internal 10.10.10.100
```

Nous ne verrons pas la configuration de l'IPFO dans ce tutoriel

## Configuration

### Redis

Nous allons configurer redis2/3 afin qu'il soit slave de redis1. Nous
allons également les configurer pour qu'ils écoutent sur notre
interface privée. Par défaut, redis n'écoute que sur 127.0.0.1.

Selon votre version de redis, il se peut que **replicaof** ne fonctionne
pas. Dans ces cas-là, remplacer par la directive **slaveof**

Exemple pour redis2, à adapter pour redis3. Attention à ne pas
configurer replicaof pour redis1 :

```bash
$ cat /etc/redis/redis.conf
bind 10.10.10.2 127.0.0.1 ::1
replicaof redis1.internal 6379
```

On restart

```bash
$ systemctl restart redis-server
```

Et on observe :

```bash
root@dev redis1:/root$ redis-cli role
1) "master"
2) (integer) 0
3) (empty array)

root@dev redis2:/root$ redis-cli role
1) "slave"
2) "10.10.10.1"
3) (integer) 6379
4) "connect"
5) (integer) -1
```

On voit que notre redis1 est le master et que redis2 est le slave de
redis1, on voit également qu'il est bien connecté.

Pour debug notre replication & election de master, nous pouvons forcer
un sleep du '"master'", empêchant ainsi les écritures. Nous devons
observer un changement de master (côté Redis & HAproxy)

```bash
root@dev redis1:/root$ redis-cli DEBUG sleep 30
```

  * Si tout se passe bien, nous verrons que le master se sera déplacé
    sur redis02 ou redis03 et que le frontend HAproxy redis-write
    indiquera le même redis.

### HAproxy

La configuration de HAproxy est quand à elle assez simple. Il faut
l'adapter à son usage. Dans ce que je propose, nous avons 2 entrypoints

  * Un pour les écritures, qui va nous permettre de détecter le master.
  * Un second pour les lectures, qui les balancera sur tous les redis.

Pour rappel, nous utilisons une configuration spliited par fichier.

**Backend**

??? example "/etc/haproxy/30-backend.cfg"
    ```bash
    backend redis_read
        mode tcp
        option tcp-check
        tcp-check connect
        tcp-check send PING\r\n
        tcp-check expect string +PONG
        tcp-check send QUIT\r\n
        tcp-check expect string +OK

        server redis1 redis1.internal:6379 check inter 1s fall 1 rise 1
        server redis2 redis2.internal:6379 check inter 1s fall 1 rise 1
        server redis3 redis3.internal:6379 check inter 1s fall 1 rise 1

    backend redis_write
        mode tcp
        option tcp-check
        tcp-check connect
        tcp-check send PING\r\n
        tcp-check expect string +PONG
        tcp-check send info\ replication\r\n
        tcp-check expect string role:master
        tcp-check send QUIT\r\n
        tcp-check expect string +OK

        server redis1 redis1.internal:6379 check inter 1s fall 1 rise 1
        server redis2 redis2.internal:6379 check inter 1s fall 1 rise 1
        server redis3 redis3.internal:6379 check inter 1s fall 1 rise 1
    ```

**Frontend**

??? example "/etc/haproxy/40-backend.cfg"
    ```bash
    frontend redis-write
        bind *:6380
        mode tcp

        option  tcpka
        option  tcplog
        option  logasap

        default_backend redis_write

    frontend redis-read
        bind *:6381
        mode tcp

        option  tcpka
        option  tcplog
        option  logasap

        default_backend redis_read
    ```

Côté backend, nous voyons que la différence est uniquement côté
détection du master. Nous avons également réduit le fall et le rise à 1
afin de détecter immédiatement la réélection d'un master par Sentinel.
Cette option est moins impactante pour la lecture.

Côté frontend, nous utilisons diverses options pour améliorer le log et
nous maintenons la connexion (*tcpka*)

### Sentinel

Côté sentinel, il est important de conserver un identifiant unique sur
chaque noeud (sentinel myid).

La configuration est assez simple :

```bash
cat /etc/redis/sentinel.conf
# Default is 30 seconds.
sentinel monitor mymaster front01.internal 6379 2
sentinel down-after-milliseconds mymaster 1000
protected-mode no
```

Le '"2'" est le nombre de replica que l'on souhaite. On élit un nouveau
master après 1s de down. On désactive le *protected-mode* afin de
pouvoir se connecter depuis tous les noeuds.

Attention à vérifier que sentinel écoute bien sur toutes les interfaces
(du moins, à minima celle que nous désirons) mais également que les
ports 6379 et 26379 soit bien ouverts

