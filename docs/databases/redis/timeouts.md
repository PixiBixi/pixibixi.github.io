---
description: "Redis timeout, tcp-keepalive et pconnect PHP : liveness check ECHO de phpredis, CONFIG SET contre fichier de config, churn de connexions"
tags:
  - Redis
  - PHP
  - Troubleshooting
---

# Redis : timeout, tcp-keepalive et pconnect PHP

Un Redis qui ferme les connexions idle et des workers PHP qui gardent les leurs ouvertes se marchent dessus sans lever la moindre erreur : le client détecte le socket mort, se reconnecte et le coût se dilue dans la latence. On règle ici le sort d'une connexion inactive côté serveur et côté phpredis, on applique un changement sans qu'un restart l'annule et on reconnaît le churn de connexions qui en résulte. Côté serveur, 2 réglages comptent : `timeout` et `tcp-keepalive`. Côté client, c'est phpredis en `pconnect`.

## Timeout et tcp-keepalive : ne pas les confondre

`timeout` et `tcp-keepalive` n'ont rien à voir malgré leur proximité dans `redis.conf`. Le premier ferme les clients inactifs côté Redis, le second garde le TCP vivant à travers le réseau.

- `timeout N` : Redis ferme une connexion cliente inactive depuis plus de N secondes, `0` désactive. La valeur par défaut est `0`. Les replicas, les monitors, les masters, les clients bloqués (`BLPOP`) et les clients Pub/Sub sont exemptés.
- `tcp-keepalive N` : Redis active `SO_KEEPALIVE` sur chaque nouvelle connexion TCP et envoie des ACK toutes les N secondes d'inactivité. La valeur par défaut est `300`. Sur Linux, il faut le double de N pour qu'une connexion morte soit détectée et fermée.

Les 2 valeurs par défaut viennent de `redis.conf` et de `src/config.c` dans le repo amont (branche `unstable`). Le keepalive sert à détecter un pair mort et à empêcher un équipement réseau intermédiaire (firewall, NAT, load balancer) d'oublier une connexion silencieuse, les 2 usages listés dans `redis.conf`.

Le sens du double se lit dans `anetKeepAlive` : le premier probe part après N secondes d'idle, l'intervalle entre 2 probes vaut N/3 (1 seconde minimum) et le kernel en envoie 3 avant d'abandonner. Le plancher de 10 secondes qu'on lit dans ce code ne concerne que Solaris.

!!! warning "timeout 1 et pconnect"
    Un `timeout` de quelques secondes est tentant pour libérer des connexions, mais il tue précisément celles qu'un client persistant compte réutiliser. Chaque requête qui tombe après le délai paie une reconnexion.

## Le liveness check de phpredis et son coût

Avec `pconnect`, une connexion survit à la requête PHP et reste dans un pool du worker. Quand le worker suivant la reprend, phpredis ne sait pas si Redis l'a fermée entre-temps. Tant que `redis.pconnect.pooling_enabled` vaut `1`, la fonction `redis_sock_check_liveness` de `library.c` (dépôt phpredis, branche `develop`) enchaîne 3 contrôles à chaque reprise d'une connexion du pool :

1. le stream PHP est-il encore vivant (`PHP_STREAM_OPTION_CHECK_LIVENESS`, détecte un EOF sans rien envoyer)
2. le stream est-il « sale » (données non lues restées dans le buffer), contrôle piloté par `redis.pconnect.pool_detect_dirty`
3. un `ECHO` avec un identifiant aléatoire, dont la réponse doit rendre le même identifiant, piloté par `redis.pconnect.echo_check_liveness`

Si l'un des contrôles échoue, la connexion est fermée et phpredis en ouvre une nouvelle. Les valeurs par défaut des INI (`redis.c`) sont `redis.pconnect.pooling_enabled=1`, `redis.pconnect.echo_check_liveness=1`, `redis.pconnect.pool_detect_dirty=0` et `redis.pconnect.connection_limit=0`.

Le `ECHO` coûte un aller-retour réseau et une commande Redis à chaque réutilisation de connexion. Sur un Redis très sollicité par des workers PHP, il devient une part visible du trafic : sur un nœud mesuré chez nous, `ECHO` représentait environ un tiers des commandes par seconde. Le compteur à regarder est `cmdstat_echo` dans `INFO commandstats`.

Le `ECHO` est le seul des 3 contrôles à prouver que Redis répond encore, là où les 2 autres n'inspectent que le socket local. Pour un Redis distant derrière du réseau, le laisser activé est le choix prudent. Pour des workers qui parlent à un Redis sur la même machine, par socket Unix, il apporte moins et son coût devient plus difficile à justifier.

Pour désactiver le `ECHO` sur des workers qui parlent à des Redis locaux, on pose l'INI côté PHP :

```ini
; php.ini ou fichier conf.d du module redis
redis.pconnect.echo_check_liveness = 0
```

Un changement de ce type se déploie par groupes de nœuds avec un canari. On le vérifie sur `cmdstat_echo` (le compteur arrête de croître) et sur le taux d'erreurs applicatif.

## Appliquer un changement sans qu'un restart l'annule

`timeout` et `tcp-keepalive` sont tous les 2 modifiables à chaud (`MODIFIABLE_CONFIG` dans `config.c`). Les nuances ne sont pas les mêmes.

- `CONFIG SET timeout 300` s'applique tout de suite à toutes les connexions, y compris les existantes : la valeur est relue à chaque passage du cron des clients.
- `CONFIG SET tcp-keepalive 300` ne touche que les **nouvelles** connexions. Redis pose `SO_KEEPALIVE` dans `createClient`, au moment de l'accept, puis ne revient jamais sur un socket existant. Un client persistant qui ne se reconnecte pas garde son ancien réglage.
- Rien de tout ça ne survit à un restart. `CONFIG SET` ne modifie pas le fichier, il faut `CONFIG REWRITE` ou éditer la config.

Le piège classique est celui du réglage posé uniquement à chaud sur une flotte : les fichiers de config n'ont jamais été mis à jour, donc tout Redis redémarré (reboot, mise à jour, crash) revient aux valeurs du fichier. Sur des nœuds rebootés quelques mois après un tuning, on a retrouvé `timeout 1` à la place de `timeout 300` et les paramètres de snapshot par défaut, avec un coût CPU qui n'apparaissait que comme une dérive de CPU par requête.

Pour détecter la dérive, on compare ce que tourne l'instance à ce que dit son fichier :

```console
$ redis-cli -p 6379 config get timeout
1) "timeout"
2) "300"
$ redis-cli -p 6379 config get tcp-keepalive
1) "tcp-keepalive"
2) "300"
$ rg -n '^(timeout|tcp-keepalive)' /etc/redis/redis.conf
87:timeout 300
92:tcp-keepalive 300
```

Un déploiement qui réécrit le fichier de config redémarre souvent le service au passage, ce qui coupe les connexions de tous les clients. Quand on déploie via Ansible, séparer « réécrire le fichier + `CONFIG SET`, sans restart » de « réécrire le fichier + restart » dans 2 playbooks distincts évite qu'un simple changement de template redémarre toute une flotte.

## Reconnaître le churn de connexions

Un `timeout` trop bas face à des clients `pconnect` ne produit aucune erreur, seulement du churn : des connexions fermées par Redis puis rouvertes à la requête suivante. Le signal est le taux de `total_connections_received` (`INFO stats`) mesuré sur quelques minutes, qui grimpe à chaque pic de trafic PHP pendant que `connected_clients` bouge à peine. `CLIENT LIST` confirme le diagnostic : les connexions d'un même client ont toutes un `age` court et un `idle` qui plafonne au `timeout` configuré. Quand un seul datacenter ou un seul hôte présente ce profil, on compare son `CONFIG GET timeout` à celui d'un hôte sain, pas les fichiers : c'est en général un nœud redémarré depuis le dernier tuning à chaud.

## Voir aussi

- [Déployer un Redis en High Availability](cluster_ha.md) pour la topologie Sentinel et HAProxy devant les clients
