---
description: "Guide complet de tuning HAProxy : nbthread, cpu-policy, maxconn, TLS (ECDSA vs RSA), sysctls, Kubernetes. Benchmarks ARM Axion vs x86 - le guide francophone de référence."
tags:
  - HAProxy
  - Performance
---

# HAProxy : guide de performance tuning (nbthread, maxconn, TLS, Kubernetes)

HAProxy est déjà très performant out of the box. Mais sur des infras à forte charge (100k+ connexions simultanées), quelques réglages font la différence entre "ça tient" et "ça explose".

!!! note
    Toutes les valeurs présentées ici sont des suggestions à adapter selon le profil de trafic. Un HAProxy qui sert du streaming vidéo n'a pas les mêmes besoins qu'un HAProxy devant une API REST. Toujours load-tester avant d'appliquer en production.

## Threads et CPU

### nbthread

Depuis HAProxy 1.8, `nbthread` remplace l'ancien `nbproc` (déprécié). Un thread par cœur CPU, c'est le réglage de base.

```haproxy
global
    nbthread 4
```

HAProxy détecte automatiquement le nombre de CPUs disponibles — `nbthread auto` existe mais mettre la valeur explicitement reste plus prédictible, surtout en conteneur où les cgroups peuvent fausser la détection.

### cpu-map (affinité manuelle)

`cpu-map` permet de bind chaque thread à un cœur spécifique pour éviter les migrations de contexte :

```haproxy
global
    nbthread 4
    cpu-map auto:1/1-4 0-3
```

En K8S ou environnement conteneurisé, `cpu-map` n'a généralement pas de sens vu que le scheduler gère déjà l'affinité. Ne l'utiliser que sur du bare-metal ou des VMs avec des CPUs dédiés.

### cpu-policy (3.2+)

Depuis HAProxy 3.2, `cpu-policy` remplace avantageusement les `cpu-map` manuels. HAProxy analyse la topologie CPU (NUMA nodes, CCX, L3 caches) et place ses threads de façon optimale.

```haproxy
global
    cpu-policy performance
```

| Policy | Comportement |
| ------ | ------------ |
| `performance` | Utilise tous les cœurs performance sur tous les NUMA nodes (défaut en 3.3) |
| `group-by-ccx` | Un thread group par CCX — minimise la latence inter-thread sur les AMD EPYC |
| `group-by-cluster` | Un thread group par cluster CPU — similaire à `group-by-ccx` sur la plupart des serveurs |
| `efficiency` | N'utilise que les cœurs basse consommation (E-cores Intel) |
| `first-usable-node` | Se limite au premier NUMA node (défaut en 3.2) |

!!! tip
    Sur HAProxy 3.3+, les défauts sont optimaux dans la majorité des cas — ne toucher à rien sauf si les benchmarks montrent un problème. Vérifier la configuration auto avec `haproxy -dc`.

### NUMA et gros serveurs

Sur des machines multi-socket ou multi-CCX (AMD EPYC, Intel Xeon Scalable), la latence de synchronisation entre threads dépend de leur distance :

- Deux threads sur le même cœur (hyperthreading) : le plus rapide
- Deux threads sur le même CCX (même L3 cache) : rapide
- Deux threads sur des CCX différents : plus lent
- Deux threads sur des sockets CPU différents : le pire, à éviter

HAProxy 2.4–3.2 se limite par défaut au premier NUMA node pour éviter les communications cross-socket. En 3.3+, il utilise tous les nodes mais groupe intelligemment les threads par L3 cache.

### Thread groups

Un thread group est un ensemble de threads qui partagent le même espace de travail. Les threads d'un même groupe coopèrent (partage de connexions, de caches internes), tandis que les threads de groupes différents sont quasi indépendants — ce qui réduit les verrous inter-groupes.

HAProxy supporte max 64 threads par groupe et 16 groupes, soit 1024 threads au total. Sur une machine avec plus de 64 cœurs, il faut obligatoirement plusieurs thread groups.

En 3.2+, `cpu-policy` gère ça automatiquement. Sur les versions 2.7–3.1, on définit manuellement :

```haproxy
global
    nbthread 128
    thread-groups 8
    thread-group 1 1-16
    thread-group 2 17-32
    thread-group 3 33-48
    thread-group 4 49-64
    thread-group 5 65-80
    thread-group 6 81-96
    thread-group 7 97-112
    thread-group 8 113-128
    cpu-map 1/1-16 0-7,64-71
    cpu-map 2/1-16 8-15,72-79
    # ... etc, un cpu-map par groupe aligné sur les L3 caches
```

Le principe : un thread group par L3 cache. Les threads du même groupe communiquent à bas coût (même cache), et les groupes entre eux se parlent le moins possible.

En 3.2+, une seule ligne remplace tout ça :

```haproxy
global
    cpu-policy group-by-ccx
```

!!! warning
    Dès qu'on définit `nbthread`, `thread-groups` ou `cpu-map` manuellement, l'auto-détection NUMA est désactivée. Préférer `cpu-policy` quand la version le permet.

### Shards (contention socket)

Quand beaucoup de threads se partagent un seul listener socket, la contention noyau sur `SO_REUSEPORT` peut devenir un bottleneck. Symptôme : `perf top` montre `native_queued_spin_lock_slowpath` en haut.

`shards` crée plusieurs sockets pour le même bind, répartis entre les thread groups :

```haproxy
frontend http_front
    bind *:80 shards by-group
    bind *:443 ssl crt /etc/haproxy/certs/ shards by-group
```

`by-group` crée un socket par thread group — chaque groupe travaille sur son propre socket sans contention avec les autres.

### IRQ NIC et ksoftirqd

Sur du bare-metal à très haut débit, les interruptions NIC (`ksoftirqd`) peuvent saturer des cœurs CPU. Si `perf top` montre `ksoftirqd` en haut, il faut réserver des cœurs pour les IRQ et ne pas y placer de threads HAProxy.

Identifier les cœurs qui traitent les IRQ de la NIC :

```bash
# Voir la répartition des IRQ par cœur
grep eth0 /proc/interrupts

# Ou voir l'affinité d'une IRQ spécifique
cat /proc/irq/<IRQ_NUM>/smp_affinity_list
```

Exclure ces cœurs du pool HAProxy avec `cpu-set` (3.2+) :

```haproxy
global
    cpu-set drop-cpu 0,1
    cpu-policy performance
```

Ou manuellement, dédier les premiers cœurs aux IRQ NIC via `irqbalance` ou `smp_affinity`, et mapper HAProxy sur les cœurs restants.

!!! warning
    Ne pas utiliser `irqbalance` en même temps qu'un pinning manuel via `smp_affinity` — ils se marchent dessus.

## maxconn

Le paramètre le plus important. Il se configure à 3 niveaux :

### Global

Limite le nombre total de connexions simultanées sur l'instance HAProxy.

```haproxy
global
    maxconn 100000
```

Si `-m` est défini (limite mémoire), HAProxy calcule automatiquement le `maxconn` en fonction de la RAM disponible. C'est ce qui explique le comportement décrit dans l'article sur la [limite mémoire](memory_limit.md) — une surprise fréquente en environnement conteneurisé.

### Frontend

Limite les connexions sur un frontend spécifique. Les connexions qui dépassent sont mises en file d'attente.

```haproxy
frontend http_front
    maxconn 50000
```

### Server

Limite les connexions vers chaque backend server. Critique pour protéger les backends qui ne tiennent pas la charge.

```haproxy
backend app_servers
    server web1 10.0.0.1:8080 maxconn 2000 check
    server web2 10.0.0.2:8080 maxconn 2000 check
```

!!! warning
    Un `maxconn` serveur trop bas met les requêtes en queue dans HAProxy. C'est voulu — HAProxy gère bien les queues, les backends souvent non.

## Buffers

### tune.bufsize

Taille du buffer par connexion (request + response). Par défaut 16384 (16 KB).

```haproxy
global
    tune.bufsize 65536
```

!!! warning
    Dans la majorité des cas, la valeur par défaut de 16 KB est suffisante. N'augmenter `tune.bufsize` que si HAProxy retourne des erreurs 400 (headers tronqués) ou si les logs montrent des requêtes rejetées pour dépassement de buffer. Augmenter sans raison gaspille de la RAM pour rien.

64 KB est une valeur qu'on retrouve sur du trafic ad-tech ou des APIs avec de gros headers (cookies, JWT, query strings longues). La valeur par défaut de 16 KB est trop juste pour ces cas spécifiques.

Chaque connexion consomme 2 × `bufsize` en RAM — un `bufsize` de 64 KB avec 300k connexions = ~37 GB rien que pour les buffers. Dimensionner la RAM en conséquence.

### tune.maxrewrite

Espace réservé dans le buffer pour les réécritures de headers. Par défaut `bufsize / 2`. Réduire si on ne fait pas de réécriture volumineuse.

```haproxy
global
    tune.bufsize 16384
    tune.maxrewrite 1024
```

### tune.http.maxhdr

Nombre maximum de headers HTTP par requête. Par défaut 101.

```haproxy
global
    tune.http.maxhdr 128
```

À augmenter si des clients envoient beaucoup de headers custom. Rarement nécessaire.

## Timeouts

Des timeouts serrés libèrent les connexions rapidement et protègent contre les slowloris.

```haproxy
defaults
    timeout connect 1s
    timeout client  5s
    timeout server  30s
    timeout http-request 10s
    timeout http-keep-alive 5s
    timeout queue 30s
    timeout client-fin 1s
```

| Timeout | Rôle |
| ------- | ---- |
| `connect` | Temps max pour établir la connexion TCP vers le backend |
| `client` | Temps max d'inactivité côté client |
| `server` | Temps max d'inactivité côté serveur |
| `http-request` | Temps max pour recevoir la requête HTTP complète (anti-slowloris) |
| `http-keep-alive` | Temps max d'attente entre deux requêtes sur une connexion keep-alive |
| `queue` | Temps max en file d'attente avant d'abandonner |
| `client-fin` | Temps max après un FIN client (half-closed) — ferme les connexions fantômes rapidement |

### timeout client-fin

Sur du trafic fire-and-forget (beaconing, pixels de tracking), les clients envoient un FIN sans attendre la réponse. Sans `timeout client-fin`, HAProxy maintient la connexion half-closed pendant tout le `timeout client`. Avec 1s, les file descriptors sont libérés quasi immédiatement.

### Timeouts agressifs vs conservateurs

Pour du trafic dense sans état long (ad-tech, APIs stateless), on serre les timeouts :

```haproxy
defaults
    timeout connect 1s
    timeout client  5s
    timeout server  30s
    timeout http-keep-alive 5s
    timeout client-fin 1s
```

Pour du long-polling ou du streaming (beaconing, DASH), on garde les keep-alive longs :

```haproxy
defaults
    timeout http-keep-alive 60s
    timeout server 60s
    timeout client-fin 1s
```

!!! tip
    `timeout http-request` est le meilleur rempart contre les attaques slowloris. Le garder à 10s max.

## SSL/TLS

### Cache de sessions

Le cache de sessions SSL évite de refaire le handshake complet à chaque connexion.

```haproxy
global
    tune.ssl.cachesize 100000
    tune.ssl.lifetime 600
```

`tune.ssl.cachesize` à 100k = une entrée par session TLS en cache. Chaque entrée consomme ~200 bytes. 100k sessions = ~20 MB.

### DH params

```haproxy
global
    tune.ssl.default-dh-param 2048
```

2048 est le minimum raisonnable. 4096 offre plus de sécurité mais coûte en CPU — mesurer avant de passer à 4096 en production.

### Certificats : ECDSA vs RSA

Le handshake TLS est l'opération la plus coûteuse en CPU. Le type de certificat a un impact majeur sur le nombre de handshakes/seconde qu'un HAProxy peut absorber.

| Certificat | C4a (ARM Axion) | C4d (x86 Emerald Rapids) |
| ---------- | --------------- | ------------------------ |
| ECDSA P-256 | ~50 900 sign/s | ~69 200 sign/s |
| RSA 2048 | ~1 261 sign/s | ~4 629 sign/s |
| RSA 4096 | ~191 sign/s | ~761 sign/s |

Le x86 est 1.4x à 4x plus rapide par cœur selon l'algo, mais le ratio entre ECDSA et RSA reste le même partout : ECDSA P-256 est ~15x plus rapide que RSA 2048, et RSA 4096 est ~6x plus lent que RSA 2048.

En intégrant le prix (GCP spot, standard-16, avril 2026 : C4a ~179$/mois, C4d ~216$/mois), le x86 reste aussi plus rentable en crypto pur :

| Algo | C4a sign/s/$ | C4d sign/s/$ | Avantage |
| ---- | ------------ | ------------ | -------- |
| ECDSA P-256 | 4 545 | 5 131 | x86 +13% |
| RSA 2048 | 113 | 343 | x86 +3x |

Ces ratios ne concernent que la crypto TLS (signatures, bulk encryption) — pas les performances HAProxy globales. Un proxy passe aussi beaucoup de temps en parsing HTTP, évaluation d'ACLs et forwarding, où l'écart est bien moins marqué. Ne pas choisir un type d'instance uniquement sur la base de ces benchmarks — profiler avec le trafic réel.

Ces chiffres viennent d'`openssl speed` sur des instances GCP single-core. Vérifier sur sa propre machine :

```bash
openssl speed rsa2048 rsa4096 ecdsap256
```

Sur un HAProxy qui gère 100k nouvelles connexions TLS par seconde : en RSA 4096, il faudrait ~130 cœurs x86 (ou ~524 cœurs ARM). En ECDSA P-256, 2 cœurs suffisent.

!!! tip
    Passer de RSA 2048 à ECDSA P-256 est le gain de performance TLS le plus simple et le plus impactant. Tous les clients modernes supportent ECDSA — il n'y a plus de raison de rester en RSA sauf contrainte legacy.

Si des clients anciens ne supportent pas ECDSA, HAProxy peut servir les deux certificats sur le même bind (dual-cert). Il choisit automatiquement le bon en fonction de ce que le client supporte :

```haproxy
bind *:443 ssl crt /etc/haproxy/certs/site.ecdsa.pem crt /etc/haproxy/certs/site.rsa.pem
```

### Ciphers et protocoles

Le choix des ciphers affecte à la fois la sécurité et le CPU. Le bulk encryption (AES, ChaCha20) consomme peu par rapport au handshake, mais le choix du cipher influence quel algorithme de key exchange est utilisé.

#### TLS 1.3 vs 1.2

TLS 1.3 est plus rapide que TLS 1.2 : le handshake passe de 2 RTT à 1 RTT, et les cipher suites sont simplifiées (plus de négociation complexe). Forcer TLS 1.2 minimum :

```haproxy
global
    ssl-default-bind-options ssl-min-ver TLSv1.2
```

#### 0-RTT (early data)

TLS 1.3 supporte le 0-RTT : le client peut envoyer des données dès le premier paquet, sans attendre la fin du handshake. Le gain de latence est significatif, surtout sur des connexions à haute latence (mobile, intercontinental).

```haproxy
bind *:443 ssl crt /etc/haproxy/certs/ allow-0rtt
```

HAProxy reçoit la requête immédiatement sans attendre le handshake complet. Pour relayer le 0-RTT vers les backends :

```haproxy
backend app_servers
    retry-on 0rtt-rejected
    server web1 10.0.0.1:8080 ssl allow-0rtt check
```

`retry-on 0rtt-rejected` relance automatiquement la requête en full handshake si le backend refuse les early data.

!!! danger "Replay attacks"
    Le 0-RTT est vulnérable aux replay attacks — un attaquant peut rejouer les early data. N'activer `allow-0rtt` que sur des requêtes **idempotentes** (GET, HEAD). Pour les requêtes non-idempotentes, utiliser `wait-for-handshake`.

<!-- markdownlint-disable MD046 -->
```haproxy
http-request wait-for-handshake if !{ method GET HEAD OPTIONS }
```
<!-- markdownlint-enable MD046 -->

#### AES-GCM vs ChaCha20-Poly1305

Benchmarks blocs de 16 KB (`openssl speed -evp`) :

| Cipher | C4a (ARM Axion) | C4d (x86 Emerald Rapids) |
| ------ | --------------- | ------------------------ |
| AES-128-GCM | 7.24 GB/s | 20.99 GB/s |
| AES-256-GCM | 6.14 GB/s | 18.39 GB/s |
| ChaCha20-Poly1305 | 1.35 GB/s | 5.03 GB/s |

AES-GCM est accéléré matériellement sur tous les CPUs serveur modernes — x86 (AES-NI) comme ARM (extensions crypto ARMv8, présentes sur Graviton, Axion, Ampere Altra). ChaCha20 n'a pas d'accélération matérielle et n'est plus rapide que sur du vieux ARM sans extensions crypto (Raspberry Pi, vieux SoC mobile).

Vérifier si l'accélération AES est disponible :

```bash
# x86
grep -o aes /proc/cpuinfo | head -1

# ARM — chercher "aes" dans les features
cat /proc/cpuinfo | grep -i features | grep -o aes | head -1
```

En pratique, le bulk encryption pèse très peu comparé au handshake. La différence de cipher n'est visible que sur du trafic à très haut débit (multi-Gbps par cœur). L'ordre dans la cipherlist reste important pour des raisons de sécurité plus que de performance.

#### Ciphersuites recommandées

Préférer AES-128-GCM en premier (plus rapide), ECDSA en key exchange :

```haproxy
global
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305
    ssl-default-bind-options ssl-min-ver TLSv1.2
```

`ssl-default-bind-ciphersuites` gère TLS 1.3 (ciphersuites fixes, peu de choix). `ssl-default-bind-ciphers` gère TLS 1.2 — l'ordre compte, les premiers sont préférés.

!!! warning
    Ne pas activer `ssl-default-bind-options prefer-client-ciphers` sauf cas très spécifique — ça laisse le client choisir le cipher, et un client mal configuré peut forcer un cipher lent.

### Rate limiting SSL

Sur des infras à très fort trafic TLS, `maxsslconn` et `maxsslrate` évitent qu'un pic de handshakes sature le CPU :

```haproxy
global
    maxsslconn 320000
    maxsslrate 320000
```

`maxsslconn` limite le nombre de connexions SSL simultanées. `maxsslrate` limite le nombre de nouveaux handshakes par seconde. Les connexions qui dépassent sont mises en queue ou refusées.

### OCSP stapling

Activer l'OCSP stapling réduit la latence TLS — le client n'a plus besoin de contacter le CA pour vérifier le certificat.

```haproxy
bind *:443 ssl crt /etc/haproxy/certs/ ocsp-update on
```

!!! warning "Let's Encrypt"
    Let's Encrypt a arrêté de fournir des réponses OCSP en juin 2025. Avec des certificats LE, `ocsp-update on` ne sert plus à rien — HAProxy logguera des erreurs de fetch OCSP sans impact fonctionnel, mais c'est du bruit inutile. Les autres CA (DigiCert, Sectigo, etc.) supportent toujours OCSP.

## Tuning réseau noyau

HAProxy ne peut pas aller plus vite que le noyau Linux. Sur un serveur dédié à du load balancing, ces sysctls sont essentiels.

```bash
# Backlog de connexions
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=262144

# Buffers réseau
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"

# Réutilisation des connexions TIME_WAIT
sysctl -w net.ipv4.tcp_tw_reuse=1

# Réduire le temps en TIME_WAIT (défaut 60s)
sysctl -w net.ipv4.tcp_fin_timeout=15

# Maximiser la plage de ports éphémères
sysctl -w net.ipv4.ip_local_port_range="1024 65023"

# File descriptors
sysctl -w fs.nr_open=1048576
```

`tcp_fin_timeout=15` réduit le temps pendant lequel une connexion fermée reste en état TIME_WAIT (défaut 60s). Sur un load balancer qui ouvre des milliers de connexions par seconde vers les backends, 60s de TIME_WAIT sature vite la table de connexion.

`ip_local_port_range="1024 65023"` étend la plage de ports éphémères à ~64k ports. Le défaut `32768 60999` ne donne que ~28k ports — insuffisant quand HAProxy ouvre beaucoup de connexions sortantes.

Pour persister, ajouter dans `/etc/sysctl.d/99-haproxy.conf` et appliquer avec `sysctl --system`.

!!! warning
    `net.ipv4.tcp_tw_recycle` est supprimé depuis Linux 4.12 — ne pas l'utiliser. Seul `tcp_tw_reuse` est safe.

### File descriptors

HAProxy a besoin de 2 file descriptors par connexion (client + backend). Pour 100k connexions :

```bash
# /etc/security/limits.d/haproxy.conf
haproxy  soft  nofile  200000
haproxy  hard  nofile  200000
```

HAProxy calcule automatiquement son `ulimit-n` à partir du `maxconn` — pas besoin de le forcer manuellement. Vérifier simplement que les limits système sont suffisantes.

## Pool de file descriptors

Quand HAProxy approche de sa limite de file descriptors, il commence à fermer les connexions idle pour en libérer. Les ratios `tune.pool-high-fd-ratio` et `tune.pool-low-fd-ratio` contrôlent ce comportement :

```haproxy
global
    tune.pool-high-fd-ratio 90
    tune.pool-low-fd-ratio 80
```

Par défaut, HAProxy commence à recycler les connexions idle quand il atteint ~75% des FD disponibles, et s'arrête quand il redescend à ~25%. Sur du trafic avec de longs keep-alive (beaconing, long-polling), ce comportement par défaut tue les connexions backend poolées trop tôt, ce qui force des reconnexions TCP inutiles et consomme du CPU.

Monter les ratios à 90/80 préserve le pool de connexions plus longtemps et ne recycle qu'en cas de vrai manque de FD.

## Déploiement K8S

Sur Kubernetes, quelques patterns spécifiques au déploiement de HAProxy :

### hostNetwork

Pour du trafic très haut débit, le réseau overlay de K8S (kube-proxy, iptables/IPVS) ajoute de la latence. Passer en `hostNetwork: true` bypass complètement la stack réseau K8S :

```yaml
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
```

`hostNetwork` fonctionne aussi bien en Deployment qu'en DaemonSet. En Deployment, on cumule hostNetwork (performance réseau) avec le scaling horizontal classique (replicaCount).

!!! warning
    Avec `hostNetwork`, penser à `dnsPolicy: ClusterFirstWithHostNet` — sans ça, le pod utilise le DNS du node et ne résout plus les Services K8S.

### DaemonSet vs Deployment

- **DaemonSet** avec `hostNetwork` : un pod HAProxy par node, trafic routé directement sur l'IP du node. Adapté quand on veut saturer les nodes dédiés (compute-class).
- **Deployment** avec `hostNetwork` : même avantage réseau, mais avec un replicaCount flexible et un anti-affinity pour répartir sur les nodes.

### Sysctls via initContainers

Les sysctls réseau sont per-namespace en K8S. On les applique via un initContainer privileged :

```yaml
initContainers:
  - name: sysctl
    image: "busybox:musl"
    command:
      - /bin/sh
      - -c
      - |
        sysctl -w net.ipv4.tcp_max_syn_backlog=262144
        sysctl -w net.ipv4.tcp_fin_timeout=15
        sysctl -w net.ipv4.ip_local_port_range="1024 65023"
    securityContext:
      privileged: true
```

!!! warning
    Les sysctls `net.*` nécessitent un pod privileged ou que le PodSecurityPolicy/PodSecurityStandard autorise les unsafe sysctls.

## Réutilisation des connexions backend

Par défaut, HAProxy ouvre une nouvelle connexion TCP vers le backend pour chaque requête client. Sur du HTTP/1.1 avec TLS, ça veut dire un handshake TCP + TLS à chaque requête — coûteux en latence et en CPU.

`http-reuse` permet de réutiliser les connexions idle vers les backends :

```haproxy
backend app_servers
    http-reuse always
```

| Mode | Comportement |
| ---- | ------------ |
| `never` | Pas de réutilisation — une connexion par session |
| `safe` | Réutilise à partir de la 2e requête d'une session (défaut, le plus sûr) |
| `aggressive` | Réutilise dès la 1re requête si la connexion a déjà été réutilisée une fois |
| `always` | Réutilise toujours — le plus performant, mais le backend doit supporter le multiplexing |

Contrôler le pool de connexions idle par serveur :

```haproxy
backend app_servers
    http-reuse always
    server web1 10.0.0.1:8080 pool-max-conn 100 pool-purge-delay 5s check
```

`pool-max-conn` limite le nombre de connexions idle gardées par serveur (évite d'accumuler des milliers de FD). `pool-purge-delay` recycle les connexions idle régulièrement.

## Optimisations avancées

### Zero-copy (splice)

Sur Linux, HAProxy peut transférer les données entre sockets sans les copier en userspace via `splice()` :

```haproxy
defaults
    option splice-auto
```

HAProxy décide automatiquement quand le splice est bénéfique. Le gain est surtout visible sur du gros débit (vidéo, downloads), moins sur du trafic HTTP classique avec des petites réponses.

### tune.ssl.maxrecord

Limite la taille des records TLS envoyés au début d'une connexion. Par défaut, un record TLS fait jusqu'à 16 KB — le client ne peut commencer à décrypter qu'après avoir reçu un record complet.

```haproxy
global
    tune.ssl.maxrecord 1419
```

1419 bytes = un record qui tient dans un seul segment TCP (MTU 1500 - overhead IP/TCP/TLS). Améliore le TTFB sur les connexions à haute latence (mobile, intercontinental). HAProxy revient automatiquement à des records de taille normale une fois la connexion établie.

### tune.listener.multi-queue

Contrôle comment les connexions entrantes sont distribuées entre les threads :

```haproxy
global
    tune.listener.multi-queue fair
```

| Mode | Comportement |
| ---- | ------------ |
| `on` | Distribue vers le thread le moins chargé (défaut, bon pour les connexions longues) |
| `fair` | Round-robin entre tous les threads (mieux pour les connexions courtes / très haut débit) |
| `off` | Le thread qui accepte garde la connexion (peut créer du déséquilibre) |

### tune.sched.low-latency

```haproxy
global
    tune.sched.low-latency on
```

Force le scheduler à traiter les nouvelles connexions/requêtes en priorité, même au milieu d'un gros batch de tâches. Réduit la latence P99 au détriment du throughput global. À activer uniquement sur du trafic latency-sensitive (APIs temps réel, ad-tech).

### tune.notsent-lowat

Réduit la quantité de données bufferisées dans les sockets kernel. Moins de mémoire consommée côté noyau et surtout moins de latence applicative :

```haproxy
global
    tune.notsent-lowat.client 65536
    tune.notsent-lowat.server 65536
```

Aligner sur `tune.bufsize` est un bon point de départ. Linux uniquement (`TCP_NOTSENT_LOWAT`).

## Consistent Hashing

Pour du load balancing devant des serveurs de cache, le round-robin est un anti-pattern : chaque serveur essaie de cacher toutes les données, le cache est dilué et le hit ratio s'effondre avec le nombre de serveurs.

Le consistent hashing envoie les requêtes pour un même contenu toujours au même serveur, ce qui maximise le cache hit ratio.

```haproxy
backend cache_servers
    balance hdr(X-LB)
    hash-type consistent sdbm avalanche
    hash-balance-factor 140
```

`hash-type consistent sdbm avalanche` active le hashing consistant (les ajouts/retraits de serveurs ne redistribuent qu'une fraction des clés).

### Bounded Loads

Le problème du consistent hashing pur : certains contenus sont beaucoup plus populaires que d'autres. Quelques serveurs reçoivent 10x plus de trafic que les autres, ce qui empêche l'autoscaling de se déclencher (la moyenne reste basse).

`hash-balance-factor 140` limite la charge d'un serveur à 140% de la moyenne. Au-delà, les requêtes débordent sur les voisins. On garde l'avantage du cache tout en permettant un scaling correct.

La bonne valeur dépend du workload — tester en charge en surveillant le cache hit ratio, les retries et la distribution de charge entre serveurs.

## Retry et redispatch

Sur des backends qui peuvent se dégrader (throttle réseau cloud, saturation CPU), HAProxy sait retenter la requête sur un autre serveur :

```haproxy
defaults
    timeout connect 20ms
    timeout server  2s
    retries 2
    retry-on 502 503 504 0rtt-rejected conn-failure empty-response response-timeout
    option redispatch

backend app_servers
    default-server inter 1s fall 1 rise 10 observe layer7
    server web1 10.0.0.1:8080 check
    server web2 10.0.0.2:8080 check
```

| Paramètre | Rôle |
| --------- | ---- |
| `retry-on` | Liste des erreurs qui déclenchent un retry sur un autre serveur |
| `option redispatch` | Autorise le retry sur un serveur différent (sinon retry sur le même) |
| `retries 2` | Nombre max de tentatives |
| `observe layer7` | Retire un serveur du pool dès qu'il retourne des erreurs HTTP |
| `fall 1` | Un seul échec suffit pour marquer le serveur DOWN |
| `rise 10` | 10 checks OK consécutifs pour le remonter — évite les allers-retours |

!!! tip
    `timeout connect 20ms` est très agressif — adapté quand HAProxy et les backends sont dans le même datacenter/VPC. Un backend qui met plus de 20ms à accepter la connexion TCP est probablement throttled ou saturé, mieux vaut redispatcher immédiatement.

## Health checks

### spread-checks

Par défaut, les health checks se lancent tous en même temps. Sur 500 backends, ça crée un burst de trafic inutile.

```haproxy
global
    spread-checks 5
```

La valeur représente un pourcentage de jitter — 5 = les checks sont étalés avec ±5% de variance sur l'intervalle. Réduit les pics de CPU et de trafic réseau.

## Logging

Sur les gros volumes, le logging peut devenir un bottleneck.

```haproxy
global
    log /dev/log local0 notice
```

Passer de `info` à `notice` ou `warning` réduit drastiquement le volume de logs. En production, `notice` est souvent suffisant sauf pour du debug.

Pour les frontends à très haut débit, désactiver le log par requête et ne garder que les erreurs :

```haproxy
frontend high_traffic
    option dontlog-normal
```

`dontlog-normal` ne log que les requêtes avec un status >= 400, les timeouts et les connexions avortées.

## Compression

HAProxy peut compresser les réponses à la volée. Utile si les backends ne le font pas.

```haproxy
defaults
    compression algo gzip
    compression type text/html text/plain text/css application/javascript application/json

global
    tune.comp.maxlevel 4
```

### Algorithmes supportés

| Algo | Usage |
| ---- | ----- |
| `gzip` | Le standard, supporté par tous les clients. Le seul à utiliser en pratique. |
| `deflate` | Ambigu, mal supporté par les navigateurs récents — à éviter. |
| `raw-deflate` | Deflate sans wrapper zlib, mieux supporté que `deflate` mais aucun avantage sur gzip. |
| `identity` | Pas de compression, utile pour du debug uniquement. |

Pas de support zstd à ce jour, même en HAProxy 3.x. Si on a besoin de zstd, le faire côté backend (Nginx, application).

### Niveau de compression

`tune.comp.maxlevel` contrôle l'agressivité de la compression gzip. Valeur de 1 (rapide, faible ratio) à 9 (lent, meilleur ratio). Le défaut est 1.

- **1** : quasi gratuit en CPU, ratio de compression modeste (~60%)
- **4-5** : bon compromis ratio/CPU pour la plupart des workloads
- **9** : gain marginal en ratio par rapport à 6, mais consommation CPU qui explose

Sur un HAProxy à forte charge, rester entre 1 et 4. Le gain de bande passante entre le niveau 4 et le niveau 9 ne justifie rarement le coût CPU.

!!! warning
    La compression consomme du CPU. Si les backends gèrent déjà la compression (Nginx, CDN), ne pas l'activer côté HAProxy — ça revient à compresser deux fois pour rien. HAProxy détecte automatiquement un `Content-Encoding` existant et ne recompresse pas.

## Exemple complet

```haproxy
global
    nbthread 4
    maxconn 300000
    maxsslconn 300000
    maxsslrate 300000
    spread-checks 5
    tune.bufsize 65536
    tune.ssl.cachesize 100000
    tune.ssl.lifetime 600
    tune.ssl.default-dh-param 2048
    log /dev/log local0 notice

defaults
    mode http
    timeout connect 1s
    timeout client  5s
    timeout server  30s
    timeout http-request 10s
    timeout http-keep-alive 5s
    timeout queue 30s
    timeout client-fin 1s
    option httplog
    option dontlog-normal

frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/ ocsp-update on
    maxconn 150000
    default_backend app_servers

backend app_servers
    balance roundrobin
    server web1 10.0.0.1:8080 maxconn 2000 check inter 3s fall 3 rise 2
    server web2 10.0.0.2:8080 maxconn 2000 check inter 3s fall 3 rise 2
```

## Monitoring Prometheus

Le tuning sans monitoring, c'est du pilotage à l'aveugle. Un set complet de recording rules et alertes Prometheus pour HAProxy est disponible sur [rules.jdelgado.fr](https://rules.jdelgado.fr/#alerts/haproxy.rules.yml) (40 alertes, 20 recording rules).

Les alertes les plus pertinentes pour le tuning :

| Alerte | Seuil | Ce que ça détecte |
| ------ | ----- | ----------------- |
| `HAProxyProcessConnectionsSaturation` | >80% de maxconn | `maxconn` trop bas |
| `HAProxyProcessConnectionsCritical` | >90% de maxconn | Rejet de connexions imminent |
| `HAProxyFrontendSessionSaturation` | >70% des sessions | Frontend qui sature |
| `HAProxyProcessIdleLow` | <10% idle | CPU HAProxy saturé — ajouter des threads ou des replicas |
| `HAProxyProcessPoolFailures` | >0 | Allocation mémoire échoue — OOM, `tune.bufsize` ou RAM insuffisante |
| `HAProxyProcessSslConnectionsSaturation` | >80% de maxsslconn | `maxsslconn` trop bas |
| `HAProxyRetryHigh` | >10/s | Backends dégradés, `retry-on` / `redispatch` en action |
| `HAProxyBackendQueueTimeHigh` | >500ms | `maxconn` serveur trop bas ou backends lents |
| `HAProxyConnectionRateNearLimit` | >80% du rate limit | Pic de nouvelles connexions |
| `HAProxyProcessDroppedLogs` | >0 | Socket syslog saturé — passer en `dontlog-normal` |

Les recording rules pré-calculent les ratios d'erreurs (4xx/5xx par backend), le trafic, les sessions et les retries pour que les alertes soient rapides sans surcharger Prometheus.

## Voir aussi

- [HAProxy : Comportement d'une limite mémoire](memory_limit.md)
- [Reverse proxy: HAProxy](overview.md)
- [HAProxy : Utiliser son API](api.md)
- [HAProxy : Obtenir les vraies IPs depuis CloudFlare](cloudflare.md)
- [Conserver l'IP de son visiteur sur un reverse-proxy](keep_real_ip.md)
- [HAProxy : Mettre un node en maintenance](maintenance.md)
- [GOMEMLIMIT/GOMAXPROCS automatiques en Kubernetes](../../kubernetes/deployment/gomaxprocs_gomemlimit_kubernetes.md)

## Diagnostic

### Runtime

Vérifier les paramètres effectifs en runtime via le socket :

```bash
echo "show info" | socat - /var/run/haproxy.sock | grep -iE 'maxconn|maxsock|nbthread|ulimit|pool'
```

### CPU binding

Voir comment HAProxy a réparti ses threads sur les CPUs (3.2+) :

```bash
haproxy -dc -f /etc/haproxy/haproxy.cfg
```

Affiche les thread groups, le nombre de threads par groupe, et les CPU sets associés.

### Contention CPU

Identifier les bottlenecks CPU avec `perf` :

```bash
sudo perf top
```

| Symptôme dans perf top | Cause probable | Action |
| ---------------------- | -------------- | ------ |
| `native_queued_spin_lock_slowpath` | Contention sur les listener sockets | Ajouter `shards by-group` |
| `ksoftirqd` | IRQ NIC saturent des cœurs | Réserver des cœurs pour les IRQ, exclure du pool HAProxy |
| Fonctions SSL (`_bignum`, `_mont`) | Handshakes TLS intensifs | Séparer les threads SSL sur un NUMA node dédié |
