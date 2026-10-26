---
description: Déployer Redis en haute disponibilité - configurer Sentinel, HAProxy et réplication pour la redondance complète
variables:
  - name: redis_password
    default: CHANGE_ME
tags:
  - Redis
  - HA
---

# Déployer un Redis en High Availability

Redis c'est bien, qu'il soit toujours dispo, c'est mieux. On va voir comment le rendre redondant côté applicatif (Sentinel/HAProxy), mais également côté IP (IPFO).

Ce n'est pas un Redis Cluster, qui découpe les données en shards sur plusieurs masters : ici un seul master porte toutes les données. Des replicas prennent le relais quand il tombe.

## Outils utilisés

Dans notre montage, on utilise les outils suivants :

* **Sentinel** : il surveille les nœuds master/replica et promeut un replica en master lorsqu'un problème survient.
* **HAProxy** : load balancer TCP, il peut tester si un nœud Redis est master ou replica. On l'utilise comme frontend auquel les clients se connectent : HAProxy détecte quel nœud est master et s'assure que le trafic d'écriture va vers le bon nœud. Un second frontend HAProxy balance les lectures sur tous les nœuds Redis. Il n'est utile que pour les clients qui ne savent pas interroger Sentinel, voir [Sentinel ou HAProxy pour les clients](#sentinel-ou-haproxy-pour-les-clients).
* **Pacemaker** : il expose une IP virtuelle et gère le basculement entre les nœuds HAProxy.

Depuis Redis 7.4, Redis n'est plus sous licence BSD (RSALv2/SSPLv1, puis AGPLv3 en option depuis Redis 8). [Valkey](https://valkey.io/) est le fork BSD maintenu par la Linux Foundation, Sentinel y fonctionne de la même manière. Debian 13 propose les 2 : `redis-server` en 8.0 et `valkey-server` en 8.1.

## Ce que le montage garantit

* **Réplication Redis** : Redis a une réplication intégrée, on configure redis2 et redis3 comme replicas de redis1. La réplication est **asynchrone** : le master acquitte une écriture avant que les replicas l'aient reçue, donc un failover peut perdre les dernières écritures. On limite la fenêtre avec `min-replicas-to-write` et `min-replicas-max-lag` (le master refuse les écritures s'il n'a pas assez de replicas à jour). Pour les écritures critiques, on peut aussi utiliser `WAIT` côté client.

* **Défaillance Redis** : si le master (redis1) tombe en panne, les Sentinels détectent la défaillance. Avec 3 Sentinels et un quorum de 2, il faut que 2 Sentinels voient le master down pour le déclarer en panne, ce qui réduit les faux positifs sur un problème réseau entre 2 nœuds. Ça ne les élimine pas : une partition réseau ou un pic de latence plus long que `down-after-milliseconds` suffit à déclencher un failover. Les 3 Sentinels doivent tourner sur 3 machines distinctes, idéalement dans 3 zones de panne différentes. Une fois le master déclaré en panne, un Sentinel élu par la majorité promeut un replica (redis2 ou redis3) en master et reconfigure les autres. HAProxy teste en permanence le rôle de chaque nœud et dirige les écritures vers le nouveau master.

* **Défaillance de HAProxy** : en cas de problème de HAProxy, on a probablement un problème plus important sur le serveur. L'IP est donc re-routée sur un autre serveur avec Pacemaker.

Ce montage ne donne pas 100% de disponibilité : entre la détection, le failover et le prochain check HAProxy, les clients prennent des erreurs pendant quelques secondes. Ils doivent savoir se reconnecter et rejouer.

## Installation initiale

Imaginons que nous avons ces IPs :

|  Machine |   IPs         |
|----------|:-------------:|
|  redis1  |   10.10.10.1  |
|  redis2  |   10.10.10.2  |
|  redis3  |   10.10.10.3  |
|  IPFO    | 10.10.10.100  |

redis1 sera le master au départ.

Installation des paquets nécessaires sur les 3 nœuds :

```bash
apt install -y haproxy redis-server redis-sentinel
```

Pour simplifier la configuration, on entre tout dans le fichier hosts :

```console
$ cat /etc/hosts
10.10.10.1   redis1.internal
10.10.10.2   redis2.internal
10.10.10.3   redis3.internal
10.10.10.100 redis.lb-internal
```

On ne verra pas la configuration de l'IPFO dans ce tutoriel.

## Configuration

### Redis

Par défaut, Redis n'écoute que sur `127.0.0.1` et `::1`. On configure les **3 nœuds** pour qu'ils écoutent aussi sur l'interface privée, master compris : sans ça, les replicas et les Sentinels ne peuvent pas joindre redis1. La config doit être la même partout (à l'IP du `bind` près), puisqu'après un failover n'importe quel nœud peut devenir master.

On ajoute aussi un mot de passe, identique sur les 3 nœuds : `requirepass` protège le nœud, `masterauth` sert au nœud quand il est replica pour s'authentifier auprès du master.

Exemple pour redis1 :

```text title="/etc/redis/redis.conf"
bind 10.10.10.1 127.0.0.1 -::1
requirepass <redis_password>
masterauth <redis_password>
min-replicas-to-write 1
min-replicas-max-lag 10
```

Pour redis2 et redis3, on adapte le `bind` et on ajoute la ligne `replicaof`. On met l'IP plutôt que le nom, comme dans la config Sentinel :

```text title="/etc/redis/redis.conf"
bind 10.10.10.2 127.0.0.1 -::1
requirepass <redis_password>
masterauth <redis_password>
min-replicas-to-write 1
min-replicas-max-lag 10
replicaof 10.10.10.1 6379
```

`replicaof` existe depuis Redis 5.0, `slaveof` n'est plus qu'un alias. Ensuite, Sentinel réécrit lui-même `replicaof` dans `redis.conf` à chaque failover : on ne la touche plus à la main.

On restart sur chaque nœud :

```bash
systemctl restart redis-server
```

Et on observe :

```console
root@redis1:~# REDISCLI_AUTH=<redis_password> redis-cli role
1) "master"
2) (integer) 1288
3) 1) 1) "10.10.10.2"
      2) "6379"
      3) "1288"
   2) 1) "10.10.10.3"
      2) "6379"
      3) "1288"

root@redis2:~# REDISCLI_AUTH=<redis_password> redis-cli info replication | grep -E 'master_host|master_link_status|master_repl_offset'
master_host:10.10.10.1
master_link_status:up
master_repl_offset:1288
```

redis1 est master et liste ses 2 replicas. Côté redis2, `master_link_status` doit valoir `up` avec un offset positif. Un `down` (ou un 4e champ `connect` dans `redis-cli role`, avec un offset à `-1`) signifie que le replica n'a **pas** encore rejoint le master : mauvais `bind`, mot de passe ou firewall. On regarde alors les logs de redis2.

### Sentinel ou HAProxy pour les clients

Les clients se connectent toujours à Redis lui-même : Sentinel ne relaie aucune donnée, il sert seulement d'annuaire qui répond à la question « qui est le master ? ». 2 approches sont donc possibles.

La première, ce sont des clients qui savent interroger Sentinel (redis-py, Jedis, Lettuce, go-redis, ioredis, StackExchange.Redis...). On leur donne la liste des Sentinels et le nom `mymaster`, ils demandent l'adresse du master puis s'y connectent directement. Après un failover, ils se reconnectent au nouveau master, soit en réinterrogeant Sentinel, soit via l'événement `+switch-master`. Exemple avec redis-py :

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [("10.10.10.1", 26379), ("10.10.10.2", 26379), ("10.10.10.3", 26379)],
    socket_timeout=0.5,
)
master = sentinel.master_for("mymaster", socket_timeout=0.5, password="<redis_password>")
replica = sentinel.slave_for("mymaster", socket_timeout=0.5, password="<redis_password>")
```

La seconde, c'est HAProxy devant les nœuds Redis. Il est utile quand le client ne sait pas parler à Sentinel (vieille lib, outil tiers, script) et ne connaît qu'un `host:port`, pour n'avoir qu'une adresse à configurer dans chaque application ou pour répartir les lectures sur les replicas. Le prix à payer : un saut réseau de plus, Pacemaker et l'IP virtuelle à maintenir. Surtout, HAProxy devient une seconde source de vérité : il décide seul du master d'après `role:master` et peut ne pas être d'accord avec Sentinel pendant un failover.

Si toutes les applications ont une lib compatible Sentinel, on se passe de HAProxy et de Pacemaker. Sinon, on garde HAProxy pour les clients qui en ont besoin, les autres passent par Sentinel.

#### Cas typique : les sessions PHP

Les sessions PHP en HA sont le cas d'école. Le session handler de phpredis ne connaît que `redis` et `rediscluster` : il ne sait pas interroger Sentinel, même si phpredis a une classe `RedisSentinel` utilisable dans le code applicatif. On pointe donc le handler sur le frontend d'écriture HAProxy, derrière l'IP virtuelle :

```ini title="/etc/php/8.4/fpm/conf.d/30-session.ini"
session.save_handler = redis
session.save_path = "tcp://10.10.10.100:6380?auth=<redis_password>"
```

3 pièges sur ce cas :

* **Ne pas lister les 3 nœuds dans `save_path`** : plusieurs hôtes y répartissent les sessions selon leur `weight`, sans aucun failover. Les sessions qui tombent sur un replica échouent en `READONLY`.
* **Ne pas passer par `redis_read`** : juste après une écriture, un replica en retard renvoie l'ancienne session. Un login semble alors ne pas avoir marché.
* **Accepter de perdre quelques sessions au failover** : la réplication est asynchrone, les dernières sessions écrites peuvent disparaître et quelques utilisateurs sont déconnectés. Pour des sessions, c'est en général acceptable.

Pour se passer de HAProxy, il faut un handler de session applicatif branché sur une lib qui parle à Sentinel, par exemple [Predis](https://github.com/predis/predis), si le framework accepte un client Predis pour ses sessions :

```php
$client = new Predis\Client(
    ['tcp://10.10.10.1:26379', 'tcp://10.10.10.2:26379', 'tcp://10.10.10.3:26379'],
    [
        'replication' => 'sentinel',
        'service' => 'mymaster',
        'parameters' => ['password' => '<redis_password>'],
    ]
);
```

### HAProxy

La configuration de HAProxy est quant à elle assez simple. Il faut l'adapter à son usage, ici on a 2 entrypoints :

* Un pour les écritures, qui ne route que vers le master.
* Un second pour les lectures, qui les balance sur tous les nœuds Redis.

On utilise une configuration splittée par fichier : il faut que l'unit systemd charge le répertoire (`-f /etc/haproxy/` ou un `conf.d`), voir [Reverse proxy: HAProxy](../../web/haproxy/overview.md).

#### Backend

Les checks s'authentifient avec le mot de passe Redis avant d'envoyer leurs commandes :

```bash title="/etc/haproxy/30-backend.cfg"
backend redis_read
    mode tcp
    option tcp-check
    tcp-check connect
    tcp-check send AUTH\ <redis_password>\r\n
    tcp-check expect string +OK
    tcp-check send PING\r\n
    tcp-check expect string +PONG
    tcp-check send QUIT\r\n
    tcp-check expect string +OK

    server redis1 redis1.internal:6379 check inter 1s fall 2 rise 2
    server redis2 redis2.internal:6379 check inter 1s fall 2 rise 2
    server redis3 redis3.internal:6379 check inter 1s fall 2 rise 2

backend redis_write
    mode tcp
    option tcp-check
    tcp-check connect
    tcp-check send AUTH\ <redis_password>\r\n
    tcp-check expect string +OK
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

#### Frontend

```bash title="/etc/haproxy/40-frontend.cfg"
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

Côté backend, la différence est uniquement la détection du master. Sur `redis_write`, `fall 1 rise 1` bascule au premier check qui change : HAProxy suit le nouveau master au plus 1s après sa promotion par Sentinel. Le revers, c'est qu'un seul check raté sous charge sort le master. Surtout, un ancien master qui revient se déclare `role:master` quelques instants avant que Sentinel le reconfigure en replica : HAProxy peut alors lui envoyer des écritures qui seront perdues. Sur `redis_read`, on garde `fall 2 rise 2` pour éviter le flapping.

Côté frontend, on utilise diverses options pour améliorer le log et on maintient la connexion (*tcpka*).

### Sentinel

Côté Sentinel, chaque nœud doit garder un identifiant unique (`sentinel myid`). Sentinel le génère au premier démarrage et l'écrit dans `sentinel.conf` : on ne copie donc jamais un `sentinel.conf` déjà démarré d'un nœud à l'autre.

La configuration est assez simple, la même sur les 3 nœuds :

```text title="/etc/redis/sentinel.conf"
sentinel monitor mymaster 10.10.10.1 6379 2
sentinel auth-pass mymaster <redis_password>
# Default is 30000 (30s), lowered to 1s for a fast failover
sentinel down-after-milliseconds mymaster 1000
```

Le `2` est le **quorum** : le nombre de Sentinels qui doivent voir le master down pour le déclarer en panne. Les replicas, eux, sont découverts automatiquement via le master. Pour lancer le failover, un Sentinel doit en plus être élu par la majorité des Sentinels connus (2 sur 3 ici) : un Sentinel isolé ne peut jamais promouvoir un replica tout seul.

On surveille le master par son IP : par défaut, Sentinel ne résout pas les noms d'hôte. Pour utiliser des noms, il faut `sentinel resolve-hostnames yes` (Redis 6.2+).

`down-after-milliseconds` à 1000 promeut un nouveau master après 1s sans réponse. C'est agressif : une pause de quelques secondes (fork d'un gros `BGSAVE`, VM qui swappe) déclenche un failover. Entre 5000 et 10000 est plus raisonnable si on n'a pas besoin d'un basculement aussi rapide.

`protected-mode` est déjà désactivé par défaut dans `sentinel.conf`, Sentinel accepte donc les connexions de toutes les interfaces sur lesquelles il écoute. On restreint le port 26379 aux 3 nœuds Redis (et aux clients qui interrogent Sentinel) par firewall.

!!! warning
    Vérifier que Sentinel écoute sur les interfaces désirées et que les ports 6379 et 26379 sont ouverts entre les 3 nœuds.

### Tester le failover

Pour tester la réplication et l'élection d'un master, le plus simple est de demander un failover à Sentinel :

```bash
redis-cli -p 26379 sentinel failover mymaster
```

On peut aussi simuler un master qui ne répond plus avec `DEBUG sleep 30`. Depuis Redis 7.0, la commande `DEBUG` est désactivée par défaut : il faut `enable-debug-command local` dans `redis.conf` et un restart, l'option ne se change pas à chaud.

```bash
REDISCLI_AUTH=<redis_password> redis-cli DEBUG sleep 30
```

Si tout se passe bien, le master passe sur redis2 ou redis3. Le backend HAProxy `redis_write` ne garde que ce nœud UP. Quand redis1 revient, Sentinel le reconfigure en replica du nouveau master et réécrit son `redis.conf` : on le vérifie avec `redis-cli role` sur redis1. On interroge Sentinel pour connaître le master courant :

```bash
redis-cli -p 26379 sentinel get-master-addr-by-name mymaster
```

## Voir aussi

* [Décoder une fonction Redis](decode_function.md)
