---
description: "Tuning de HAProxy à fort trafic avec nbthread, cpu-policy, maxconn, buffers, TLS (ECDSA contre RSA, benchmarks ARM Axion et x86), sysctls et déploiement Kubernetes."
tags:
  - HAProxy
  - Performance
---

# HAProxy performance tuning : nbthread, maxconn, TLS, Kubernetes

Les paramètres par défaut de HAProxy suffisent pour la plupart des infrastructures. À partir de la centaine de milliers de connexions simultanées, quelques réglages décident de la tenue en charge.

!!! note
    Toutes les valeurs présentées ici sont des suggestions à adapter selon le profil de trafic. Un HAProxy qui sert du streaming vidéo n'a pas les mêmes besoins qu'un HAProxy devant une API REST. Un load test passe avant toute mise en production.

## Répartir les threads sur les CPUs

### nbthread

Depuis HAProxy 1.8, `nbthread` remplace l'ancien `nbproc`, supprimé en 2.5 (sa présence fait échouer le démarrage). Le réglage de base est un thread par cœur CPU.

```haproxy
global
    nbthread 4
```

Sans directive `nbthread`, HAProxy détecte le nombre de CPUs auxquels le process est lié et démarre un thread par CPU. Il n'existe pas de valeur `auto`, on met un nombre ou rien. Une valeur explicite reste plus prévisible, surtout en conteneur où les cgroups peuvent annoncer un nombre de CPUs différent de celui alloué.

### cpu-map (affinité manuelle)

`cpu-map` lie chaque thread à un cœur précis pour éviter les migrations d'un cœur à l'autre :

```haproxy
global
    nbthread 4
    cpu-map auto:1/1-4 0-3
```

En Kubernetes ou en conteneur, `cpu-map` n'a en principe pas d'intérêt, car le scheduler gère déjà le placement. On le réserve au bare-metal et aux VMs avec des CPUs dédiés.

### cpu-policy (3.2+)

Depuis HAProxy 3.2, `cpu-policy` remplace les `cpu-map` manuels. HAProxy lit la topologie CPU (NUMA nodes, CCX, caches L3) et place ses threads en conséquence.

```haproxy
global
    cpu-policy performance
```

| Policy | Comportement |
| ------ | ------------ |
| `performance` | Comme `group-by-ccx`, en écartant les cœurs à moins de 80 % des plus performants, typiquement les E-cores (défaut en 3.3) |
| `group-by-ccx` | Un thread group par CCX, pour réduire la latence entre threads sur les AMD EPYC |
| `group-by-cluster` | Un thread group par cluster CPU, proche de `group-by-ccx` sur la plupart des serveurs |
| `efficiency` | N'utilise que les cœurs basse consommation (E-cores Intel) |
| `resource` | N'utilise que le plus petit cluster CPU, pour limiter HAProxy au strict minimum |
| `none` | Aucune sélection, tous les CPUs activés sont utilisables |
| `first-usable-node` | Se limite au premier NUMA node (défaut en 3.2) |

!!! tip
    Sur HAProxy 3.3+, les valeurs par défaut conviennent dans la plupart des cas. On n'y touche que si un benchmark montre un problème. La configuration automatique se vérifie avec `haproxy -c -dc -f /etc/haproxy/haproxy.cfg`. Sans `-c`, `-dc` démarre vraiment un process, qui échoue sur un conflit de port si HAProxy tourne déjà sur la machine.

### NUMA et gros serveurs

Sur des machines multi-socket ou multi-CCX (AMD EPYC, Intel Xeon Scalable), la latence de synchronisation entre threads dépend de leur distance :

- 2 threads sur le même cœur (hyperthreading) : le plus rapide
- 2 threads sur le même CCX (même cache L3) : rapide
- 2 threads sur des CCX différents : plus lent
- 2 threads sur des sockets CPU différents : le pire, à éviter

HAProxy 2.4 à 3.2 se limite par défaut au premier NUMA node pour éviter les échanges entre sockets. En 3.3+, il utilise tous les nodes et regroupe les threads par cache L3.

### Thread groups

Un thread group est un ensemble de threads qui partagent le même espace de travail. Les threads d'un même groupe coopèrent (partage de connexions, de caches internes). Les threads de groupes différents restent presque indépendants et se disputent peu de verrous.

HAProxy supporte au plus 64 threads par groupe sur une machine 64 bits. Depuis la 3.2, il accepte 32 groupes et 1024 threads au total, contre 16 groupes et 256 threads de la 2.7 à la 3.1. Une machine de plus de 64 cœurs a donc besoin de plusieurs thread groups.

En 3.2+, `cpu-policy` crée ces groupes automatiquement. De la 2.7 à la 3.1, on les définit à la main :

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
    # ... un cpu-map par groupe, aligné sur les caches L3
```

L'idée est d'avoir un thread group par cache L3. Les threads d'un même groupe échangent à bas coût puisqu'ils partagent ce cache. Entre groupes, les échanges restent minimes.

En 3.2+, une seule ligne remplace cette configuration :

```haproxy
global
    cpu-policy group-by-ccx
```

!!! warning
    Dès qu'on définit `nbthread` ou `cpu-map` ou qu'on lance HAProxy sous `taskset`, l'auto-détection NUMA est désactivée. On préfère `cpu-policy` quand la version le permet.

### Shards (contention sur le socket d'écoute)

Quand beaucoup de threads se partagent un seul socket d'écoute, le lock kernel de ce socket limite le débit et `perf top` montre `native_queued_spin_lock_slowpath` en tête. Ce symbole est un spinlock générique qui ne désigne pas forcément le listener, il se croise donc avec le reste du profil.

`shards` crée plusieurs sockets pour le même `bind` via `SO_REUSEPORT`, répartis entre les thread groups. Les connexions se répartissent sur ces sockets et la contention sur le lock diminue.

```haproxy
frontend http_front
    bind *:80 shards by-group
    bind *:443 ssl crt /etc/haproxy/certs/ shards by-group
```

`by-group` crée un socket par thread group, si bien que chaque groupe travaille sur son propre socket sans contention avec les autres.

### IRQ NIC et ksoftirqd

Sur du bare-metal à très haut débit, le traitement des interruptions de la NIC (`ksoftirqd`) peut saturer des cœurs CPU. Si `perf top` montre `ksoftirqd` en tête, on réserve des cœurs aux IRQ et on n'y place pas de threads HAProxy.

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

Il est aussi possible de dédier les premiers cœurs aux IRQ de la NIC avec `irqbalance` ou `smp_affinity`, puis de lier HAProxy aux cœurs restants.

!!! warning
    Ne pas utiliser `irqbalance` en même temps qu'un pinning manuel par `smp_affinity`, car les 2 réécrivent l'affinité des IRQ.

## Dimensionner maxconn

`maxconn` est l'un des réglages les plus déterminants. Il se pose à 3 niveaux.

### maxconn global

Le `maxconn` global limite le nombre total de connexions simultanées de l'instance HAProxy.

```haproxy
global
    maxconn 100000
```

Si `-m` est défini (limite mémoire), HAProxy calcule automatiquement le `maxconn` en fonction de la RAM disponible. Ce calcul explique le comportement décrit dans l'article sur la [limite mémoire](memory_limit.md), une surprise fréquente en conteneur.

### maxconn d'un frontend

Le `maxconn` d'un frontend limite les connexions de ce frontend. Les connexions suivantes attendent en queue.

```haproxy
frontend http_front
    maxconn 50000
```

### maxconn d'un serveur

Le `maxconn` d'un serveur limite les connexions vers ce serveur. Il protège les backends qui ne tiennent pas la charge.

```haproxy
backend app_servers
    server web1 10.0.0.1:8080 maxconn 2000 check
    server web2 10.0.0.2:8080 maxconn 2000 check
```

!!! warning
    Un `maxconn` serveur trop bas met les requêtes en queue dans HAProxy. C'est voulu, car HAProxy gère bien ses queues alors que beaucoup de backends gèrent mal la surcharge.

## Dimensionner les buffers

### tune.bufsize

`tune.bufsize` fixe la taille du buffer par connexion (requête et réponse), 16384 octets (16 KB) par défaut.

```haproxy
global
    tune.bufsize 65536
```

!!! warning
    Dans la plupart des cas, la valeur par défaut de 16 KB suffit. On n'augmente `tune.bufsize` que si HAProxy retourne des erreurs 400 (headers tronqués) ou si les logs montrent des requêtes rejetées pour dépassement de buffer, car chaque connexion consomme alors plus de RAM.

Sur du trafic ad-tech ou des APIs à gros headers (cookies, JWT, query strings longues), 16 KB devient trop juste et 64 KB est une valeur courante.

Chaque connexion consomme 2 × `bufsize` de RAM. Un `bufsize` de 64 KB avec 300k connexions représente ainsi environ 37 GB de buffers, à prévoir dans le dimensionnement de la RAM.

### tune.maxrewrite

`tune.maxrewrite` réserve de la place en fin de buffer pour les réécritures de headers. Les premières lectures ne remplissent pas plus de `bufsize - maxrewrite`, si bien que cette réserve est autant de place en moins pour la requête elle-même.

Le défaut est `MIN(1024, bufsize / 2)`, soit **1024** pour tout `bufsize` d'au moins 2048. On lit souvent « la moitié du bufsize », une valeur historique qui n'est plus d'actualité. Il n'y a donc rien à réduire.

On ne touche à `tune.maxrewrite` que pour le **monter**, quand on insère beaucoup de headers sur des requêtes déjà volumineuses et que HAProxy refuse d'en ajouter :

```haproxy
global
    tune.maxrewrite 2048
```

Changer `bufsize` ne demande pas de toucher à `maxrewrite`, car HAProxy le ramène à la moitié du `bufsize` quand il la dépasse.

### tune.http.maxhdr

`tune.http.maxhdr` fixe le nombre maximum de headers HTTP par requête, 101 par défaut.

```haproxy
global
    tune.http.maxhdr 128
```

L'augmenter ne sert que si des clients envoient beaucoup de headers custom. Ce cas reste rare.

## Adapter les timeouts au profil de trafic

Des timeouts courts libèrent les connexions rapidement et protègent contre les attaques slowloris.

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
| `connect` | Temps maximum pour établir la connexion TCP vers le backend |
| `client` | Temps maximum d'inactivité côté client |
| `server` | Temps maximum d'inactivité côté serveur |
| `http-request` | Temps maximum pour recevoir la requête HTTP complète (protection slowloris) |
| `http-keep-alive` | Temps maximum d'attente entre 2 requêtes sur une connexion keep-alive |
| `queue` | Temps maximum passé en queue avant abandon |
| `client-fin` | Temps maximum après un FIN client (half-closed), pour fermer vite les connexions abandonnées |

### timeout client-fin

Sur du trafic où le client n'attend pas la réponse (beaconing, pixels de tracking), les clients envoient un FIN sans lire la réponse. Sans `timeout client-fin`, HAProxy garde la connexion half-closed pendant tout le `timeout client`, alors qu'avec 1s les file descriptors sont libérés aussitôt.

### Timeouts courts ou longs

Pour du trafic dense sans état long (ad-tech, APIs stateless), on raccourcit les timeouts :

```haproxy
defaults
    timeout connect 1s
    timeout client  5s
    timeout server  30s
    timeout http-keep-alive 5s
    timeout client-fin 1s
```

Pour du long-polling ou du streaming (DASH), on garde des keep-alive longs :

```haproxy
defaults
    timeout http-keep-alive 60s
    timeout server 60s
    timeout client-fin 1s
```

!!! tip
    `timeout http-request` est la protection la plus directe contre les attaques slowloris. On le garde à 10s au plus.

## Réduire le coût de TLS

### Cache de sessions

Le cache de sessions SSL évite de refaire le handshake complet à chaque connexion.

```haproxy
global
    tune.ssl.cachesize 100000
    tune.ssl.lifetime 600
```

`tune.ssl.cachesize 100000` réserve 100k entrées, une par session TLS en cache. Chaque entrée consomme environ 200 octets, soit environ 20 MB pour 100k sessions.

### DH params

La taille des paramètres Diffie-Hellman est un réglage global qui s'applique à tous les binds :

```haproxy
global
    tune.ssl.default-dh-param 2048
```

!!! note "Réglage largement obsolète"
    `tune.ssl.default-dh-param` ne concerne que le key exchange **DHE** (Diffie-Hellman en corps fini). Les clients actuels négocient de l'ECDHE et TLS 1.3 n'utilise plus ce paramètre. Sur une configuration moderne, il n'a donc aucun effet sur les performances. Il reste documenté ici parce que beaucoup de configurations héritées le contiennent encore.

### Certificats : ECDSA ou RSA

Le handshake TLS est l'opération la plus coûteuse en CPU. Le type de certificat fait varier d'un facteur 15 à 40 le nombre de handshakes par seconde qu'un HAProxy absorbe.

| Certificat | C4a (ARM Axion) | C4d (x86 Emerald Rapids) |
| ---------- | --------------- | ------------------------ |
| ECDSA P-256 | ~50 900 sign/s | ~69 200 sign/s |
| RSA 2048 | ~1 261 sign/s | ~4 629 sign/s |
| RSA 4096 | ~191 sign/s | ~761 sign/s |

Le x86 est 1,4x à 4x plus rapide par cœur selon l'algorithme. L'écart entre ECDSA et RSA dépend en revanche beaucoup de l'architecture, puisque ECDSA P-256 est environ 15x plus rapide que RSA 2048 sur x86 et environ 40x sur ARM. Plus le CPU est lent en RSA, plus le passage à ECDSA rapporte. Le ratio entre RSA 4096 et RSA 2048 reste proche de 6x des 2 côtés.

En tenant compte du prix (GCP spot, standard-16, avril 2026 : C4a environ 179$/mois, C4d environ 216$/mois), le x86 reste aussi plus rentable en crypto pure :

| Algo | C4a sign/s par $/mois et par vCPU | C4d sign/s par $/mois et par vCPU | Avantage |
| ---- | ------------ | ------------ | -------- |
| ECDSA P-256 | 4 545 | 5 131 | x86 +13% |
| RSA 2048 | 113 | 343 | x86 +3x |

Ces ratios ne concernent que la crypto TLS (signatures, bulk encryption), pas les performances globales de HAProxy. Un proxy passe aussi beaucoup de temps à parser le HTTP, évaluer des ACL et relayer les données, où l'écart est bien moins marqué. Le choix d'un type d'instance se fait donc sur un profil du trafic réel, pas sur ces seuls benchmarks.

Ces chiffres viennent d'`openssl speed` sur des instances GCP single-core. Pour les mesurer sur sa propre machine :

```bash
openssl speed rsa2048 rsa4096 ecdsap256
```

Pour 100k nouvelles connexions TLS par seconde, la signature seule demanderait environ 130 cœurs x86 (ou environ 524 cœurs ARM) en RSA 4096, contre 2 cœurs en ECDSA P-256.

!!! tip
    Passer de RSA 2048 à ECDSA P-256 est le changement TLS qui rapporte le plus pour le moins d'effort. Les clients actuels supportent ECDSA, si bien que seule une contrainte legacy justifie de rester en RSA.

Si des clients anciens ne supportent pas ECDSA, HAProxy peut servir les 2 certificats sur le même bind (dual-cert) et choisit le bon selon ce que le client annonce :

```haproxy
bind *:443 ssl crt /etc/haproxy/certs/site.ecdsa.pem crt /etc/haproxy/certs/site.rsa.pem
```

### Ciphers et protocoles

Le choix des ciphers touche à la fois la sécurité et le CPU. Le bulk encryption (AES, ChaCha20) consomme peu à côté du handshake, mais le cipher retenu détermine l'algorithme de key exchange.

#### TLS 1.3 ou 1.2

TLS 1.3 est plus rapide que TLS 1.2 : le handshake complet passe de 2 RTT à 1 RTT et la liste des cipher suites est réduite. Pour imposer TLS 1.2 au minimum :

```haproxy
global
    ssl-default-bind-options ssl-min-ver TLSv1.2
```

#### 0-RTT (early data)

TLS 1.3 supporte le 0-RTT : le client envoie des données dès le premier paquet, sans attendre la fin du handshake. Il économise ainsi 1 RTT. Ce gain compte surtout sur des connexions à haute latence (mobile, intercontinental).

```haproxy
bind *:443 ssl crt /etc/haproxy/certs/ allow-0rtt
```

`allow-0rtt` s'active par ligne `bind` et HAProxy reçoit alors la requête sans attendre le handshake complet. Il faut aussi que le client négocie l'ALPN. Pour relayer le 0-RTT vers les backends :

```haproxy
backend app_servers
    retry-on 0rtt-rejected
    server web1 10.0.0.1:8080 ssl allow-0rtt check
```

`retry-on 0rtt-rejected` relance automatiquement la requête en full handshake si le backend refuse les early data.

!!! danger "Attaques par rejeu"
    Le 0-RTT est vulnérable aux attaques par rejeu, car un attaquant peut renvoyer les early data. `allow-0rtt` s'applique à tout le `bind` et ne filtre pas les méthodes. C'est `wait-for-handshake` qui fait attendre la fin du handshake aux requêtes **non idempotentes**, en laissant passer les méthodes sûres (GET, HEAD, OPTIONS).

```haproxy
http-request wait-for-handshake if !{ method GET HEAD OPTIONS }
```

#### AES-GCM ou ChaCha20-Poly1305

Le débit de chiffrement sur des blocs de 16 KB (`openssl speed -evp`) donne :

| Cipher | C4a (ARM Axion) | C4d (x86 Emerald Rapids) |
| ------ | --------------- | ------------------------ |
| AES-128-GCM | 7,24 GB/s | 20,99 GB/s |
| AES-256-GCM | 6,14 GB/s | 18,39 GB/s |
| ChaCha20-Poly1305 | 1,35 GB/s | 5,03 GB/s |

AES-GCM est accéléré matériellement sur les CPUs serveur actuels, en x86 (AES-NI) comme en ARM (extensions crypto ARMv8, présentes sur Graviton, Axion et Ampere Altra). ChaCha20 n'a pas d'accélération matérielle et n'est plus rapide que sur du vieux ARM sans ces extensions (Raspberry Pi, anciens SoC mobiles).

Pour vérifier que l'accélération AES est disponible :

```bash
# x86
grep -o aes /proc/cpuinfo | head -1

# ARM - chercher "aes" dans les features
cat /proc/cpuinfo | grep -i features | grep -o aes | head -1
```

En pratique, le bulk encryption pèse peu face au handshake. La différence entre ciphers n'apparaît qu'à plusieurs Gbps par cœur. L'ordre de la cipherlist compte surtout pour la sécurité.

#### Ciphersuites recommandées

On place en premier AES-128-GCM, le plus rapide, puis les suites ECDHE-ECDSA avant les suites ECDHE-RSA :

```haproxy
global
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305
    ssl-default-bind-options ssl-min-ver TLSv1.2
```

`ssl-default-bind-ciphersuites` règle TLS 1.3, qui n'offre que quelques ciphersuites. `ssl-default-bind-ciphers` règle TLS 1.2, où l'ordre compte puisque les premières suites sont préférées.

!!! warning
    Ne pas activer `ssl-default-bind-options prefer-client-ciphers`. Le client choisit alors le cipher. Un client mal configuré peut ainsi en imposer un lent.

### Limiter le rythme des handshakes

Sur des infrastructures à très fort trafic TLS, `maxsslconn` et `maxsslrate` évitent qu'un pic de handshakes sature le CPU :

```haproxy
global
    maxsslconn 320000
    maxsslrate 320000
```

`maxsslconn` limite le nombre de connexions SSL simultanées et `maxsslrate` celui des nouveaux handshakes par seconde. Une fois la limite atteinte, les listeners SSL cessent d'accepter et les connexions attendent dans le backlog du kernel sans être refusées.

!!! warning "maxsslconn compte les 2 côtés"
    `maxsslconn` s'applique aux connexions entrantes **et** sortantes. Une requête déchiffrée côté client puis rechiffrée vers un backend en TLS (`server ... ssl`) compte pour 2. Avec des backends en HTTPS, un `maxsslconn 320000` ne couvre donc qu'environ 160k clients. Avec des backends en HTTP clair, le compte est direct.

### OCSP stapling

L'OCSP stapling réduit la latence TLS, car le client n'a plus besoin de contacter la CA pour vérifier le certificat.

!!! danger "`ocsp-update on` ne se met pas sur une ligne `bind`"
    Cette erreur est fréquente. `ocsp-update` est une option de certificat et non de `bind`. La doc HAProxy 3.3 indique que pour l'activer sur une ligne `bind`, on passe par un crt-store ou par l'option globale `ocsp-update.mode` (disponible depuis la 3.0). Les 3 emplacements valides sont l'option globale, une crt-list et un crt-store.

L'option globale, la plus simple, s'applique à tous les certificats :

```haproxy
global
    ocsp-update.mode on
    ocsp-update.mindelay 300
    ocsp-update.maxdelay 3600

frontend http_front
    bind *:443 ssl crt /etc/haproxy/certs/
```

Une crt-list (2.8+) n'active l'option que sur certains certificats :

```haproxy
# haproxy.cfg
frontend http_front
    bind *:443 ssl crt-list /etc/haproxy/certs.list
```

```text
# /etc/haproxy/certs.list
/etc/haproxy/certs/mysite.pem [ocsp-update on]
/etc/haproxy/certs/legacy.pem
```

Un crt-store (3.0+) est plus lisible quand on gère beaucoup de certificats :

```haproxy
crt-store web
    crt-base /etc/haproxy/certs/
    load crt mysite.pem ocsp-update on

frontend http_front
    bind *:443 ssl crt "@web/mysite.pem"
```

!!! warning "Let's Encrypt"
    Let's Encrypt a arrêté son OCSP en 2025. Depuis le 7 mai 2025, les nouveaux certificats n'embarquent plus d'URL OCSP et les répondeurs ont été arrêtés le 6 août 2025. Avec des certificats Let's Encrypt, `ocsp-update` ne sert donc plus à rien et HAProxy loguera des erreurs de fetch sans impact fonctionnel. Les autres CA (DigiCert, Sectigo…) supportent encore OCSP.

## Libérer les ports et le backlog côté kernel

Les performances de HAProxy dépendent de celles du kernel Linux. Sur un serveur dédié au load balancing, ces sysctls sont les réglages de base.

```bash
# Backlog de connexions
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=262144

# Buffers réseau
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"

# Réutilisation des sockets en TIME_WAIT pour les connexions sortantes
sysctl -w net.ipv4.tcp_tw_reuse=1

# Purger les FIN_WAIT_2 orphelins plus vite (défaut 60s)
sysctl -w net.ipv4.tcp_fin_timeout=15

# Maximiser la plage de ports éphémères
sysctl -w net.ipv4.ip_local_port_range="1024 65023"

# File descriptors
sysctl -w fs.nr_open=1048576
```

!!! warning "`tcp_fin_timeout` ne touche pas au TIME_WAIT"
    Les 2 réglages sont souvent confondus. `tcp_fin_timeout` contrôle l'état **FIN_WAIT_2**, quand on a envoyé un FIN et qu'on attend celui d'en face. La durée du TIME_WAIT est la constante `TCP_TIMEWAIT_LEN`, fixée à 60s dans le kernel. Aucun sysctl ne la change et seule une recompilation la modifie.

Le sysctl reste utile, car il libère les FIN_WAIT_2 laissés par des peers qui ne referment jamais, mais il ne règle pas un problème de TIME_WAIT. Pour celui-ci, `tcp_tw_reuse=1` autorise le kernel à réutiliser un socket en TIME_WAIT pour une nouvelle connexion **sortante**. C'est le cas d'un load balancer qui ouvre des milliers de connexions par seconde vers ses backends. Depuis Linux 4.19, la valeur par défaut est 2, qui n'active la réutilisation que sur le loopback : il faut donc passer à 1 explicitement.

`ip_local_port_range="1024 65023"` étend la plage de ports éphémères à environ 64k ports. Le défaut `32768 60999` n'en donne qu'environ 28k, trop peu quand HAProxy ouvre beaucoup de connexions sortantes.

!!! warning "Descendre à 1024 a un coût"
    Le kernel choisit dans la plage éphémère le port source des sockets sortants. Rien ne l'empêche d'attribuer un port qu'un service local voudra ouvrir plus tard. Avec une borne à 1024, une connexion sortante peut prendre le port de MySQL (3306), de Redis (6379), d'un backend applicatif (8080) ou d'un exporter Prometheus (9100). On ne le fait que sur une machine dédiée au load balancing, dont on connaît tous les services.

Il faut vérifier ce qui écoute et surtout ce qui peut démarrer **après** HAProxy. Un service qui démarre en retard et trouve son port déjà pris par une connexion sortante est très difficile à diagnostiquer :

```bash
ss -lntup | awk '{print $5}' | grep -oE '[0-9]+$' | sort -un
```

On réserve ensuite les ports à protéger. Un service peut toujours les ouvrir, mais le kernel ne les attribue plus aux connexions sortantes, même s'ils tombent dans la plage :

```bash
sysctl -w net.ipv4.ip_local_reserved_ports="3306,6379,8080,9100"
```

Pour que ces réglages survivent à un reboot, ils vont dans `/etc/sysctl.d/99-haproxy.conf`, appliqué avec `sysctl --system`.

!!! warning
    `net.ipv4.tcp_tw_recycle` est supprimé depuis Linux 4.12 et ne doit pas être utilisé. Parmi les réglages du TIME_WAIT, `tcp_tw_reuse` est le seul sans effet de bord pour les clients derrière un NAT.

### File descriptors

HAProxy a besoin de 2 file descriptors par connexion, un côté client et un côté backend. Pour 100k connexions :

```bash
# /etc/security/limits.d/haproxy.conf
haproxy  soft  nofile  200000
haproxy  hard  nofile  200000
```

HAProxy calcule son `ulimit-n` à partir du `maxconn` et il n'y a pas besoin de le forcer. Il suffit de vérifier que les limites système suffisent.

## Garder les connexions backend idle plus longtemps

2 ratios fixent la part des file descriptors que HAProxy accepte de garder dans le pool de connexions idle. Ce sont 2 seuils indépendants exprimés en pourcentage du nombre total de FD, pas une paire de seuils haut et bas :

| Directive | Défaut | Ce qui se passe au-delà |
| --------- | ------ | ----------------------- |
| `tune.pool-low-fd-ratio` | 20 | HAProxy **arrête de mettre** de nouvelles connexions dans le pool idle |
| `tune.pool-high-fd-ratio` | 25 | HAProxy **ferme** des connexions idle quand il doit en ouvrir une neuve et ne peut pas en réutiliser |

Les valeurs par défaut sont très conservatrices, puisqu'à peine 1 FD sur 4 peut servir de connexion backend en pool. Sur du trafic à longs keep-alive (long-polling, streaming), les connexions du pool sont fermées bien avant toute pression sur les FD. Les reconnexions TCP qui en résultent ne servent à rien et consomment du CPU.

```haproxy
global
    tune.pool-low-fd-ratio 80
    tune.pool-high-fd-ratio 90
```

Monter à 80 et 90 conserve le pool beaucoup plus longtemps et ne le recycle qu'en cas de vrai manque de FD. Cela suppose un `nofile` correctement dimensionné, puisque le pool peut alors occuper 90 % des FD disponibles.

## Déployer HAProxy sur Kubernetes

### hostNetwork

Pour du trafic à très haut débit, le réseau overlay de Kubernetes (kube-proxy, iptables ou IPVS) ajoute de la latence. `hostNetwork: true` contourne le réseau du pod :

```yaml
spec:
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
```

`hostNetwork` fonctionne en Deployment comme en DaemonSet. Un Deployment cumule le gain réseau de `hostNetwork` et le scaling horizontal habituel (`replicaCount`).

!!! warning
    Avec `hostNetwork`, il faut `dnsPolicy: ClusterFirstWithHostNet`. Sans ce réglage, le pod utilise le DNS du node et ne résout plus les Services Kubernetes.

!!! note "Avec Cilium, le gain de hostNetwork se réduit"
    Le surcoût du réseau pod dépend du datapath. Avec le routage natif, le remplacement de kube-proxy et l'eBPF host routing, activé par défaut quand le kernel le permet, les paquets ne traversent plus les tables netfilter du node. Le [benchmark Cilium](https://docs.cilium.io/en/stable/operations/performance/benchmark/) mesure alors un débit pod à pod supérieur à celui de node à node. Le mode netkit (kernel 6.8+, beta) vise un surcoût nul pour le namespace réseau du pod. L'écart restant porte sur l'ouverture de connexions, où l'isolation réseau garde un coût CPU côté émetteur. C'est justement le profil d'un load balancer. En mode tunnel (VXLAN par défaut), l'encapsulation retire 50 octets de MTU et réduit le débit maximum.

### DaemonSet ou Deployment

- `DaemonSet` avec `hostNetwork` : un pod HAProxy par node, avec le trafic routé directement sur l'IP du node. Il convient à des nodes dédiés à HAProxy, dont on veut utiliser tout le CPU.
- `Deployment` avec `hostNetwork` : le même gain réseau, avec un `replicaCount` libre et une anti-affinity pour répartir les pods sur les nodes.

### Sysctls selon le mode réseau du pod

Les sysctls `net.*` s'appliquent à un namespace réseau. L'endroit où les poser dépend donc du mode réseau du pod.

#### Pod en hostNetwork : régler le node

Avec `hostNetwork: true`, le pod partage le namespace réseau du node. Le kubelet refuse alors tout sysctl `net.*` passé par `securityContext.sysctls` ([allowlist.go](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/sysctl/allowlist.go)). Un initContainer privileged qui lance `sysctl -w` modifie le node lui-même, pour tous les process en hostNetwork, et la valeur reste après la suppression du pod.

Ces sysctls se posent donc sur le node comme sur un serveur dédié, dans son image, son cloud-init ou la config système du node pool. Le pod en hérite sans container privileged. Sur un node Kubernetes, une plage éphémère qui démarre à 1024 chevauche aussi le kubelet (10250) et les NodePort (30000 à 32767), à ajouter à `ip_local_reserved_ports`.

#### Pod avec son propre namespace réseau

Sans hostNetwork, les valeurs du node ne s'appliquent pas au pod. Elles passent par le `securityContext` du pod, sans container privileged :

```yaml
spec:
  securityContext:
    sysctls:
      - name: net.ipv4.ip_local_port_range
        value: "1024 65023"
      - name: net.ipv4.tcp_fin_timeout
        value: "15"
      - name: net.ipv4.tcp_max_syn_backlog
        value: "262144"
```

`ip_local_port_range` et `tcp_fin_timeout` font partie des sysctls « safe », que le kubelet accepte sans configuration (`tcp_fin_timeout` depuis Kubernetes 1.29, avec un kernel 4.6+). `tcp_max_syn_backlog` est « unsafe ». Le kubelet doit l'autoriser avec `--allowed-unsafe-sysctls`, sinon il rejette le pod.

!!! warning
    Les Pod Security Standards `baseline` et `restricted` n'acceptent que les sysctls safe. Un namespace soumis à l'un d'eux refuse le pod qui demande `tcp_max_syn_backlog`, même si le kubelet l'autorise.

## Réutiliser les connexions backend

Sans réutilisation, chaque requête client vers un backend en HTTP/1.1 avec TLS coûte un handshake TCP et un handshake TLS, en latence comme en CPU. Par défaut, HAProxy est en mode `safe` : il réutilise les connexions idle, mais seulement à partir de la 2e requête d'une session.

`http-reuse` réutilise les connexions idle vers les backends :

```haproxy
backend app_servers
    http-reuse aggressive
```

| Mode | Comportement |
| ---- | ------------ |
| `never` | Aucune réutilisation, une connexion par session |
| `safe` | Réutilise à partir de la 2e requête d'une session (défaut, le plus sûr) |
| `aggressive` | Réutilise dès la 1re requête, mais seulement une connexion déjà réutilisée une fois, preuve que le serveur supporte la réutilisation |
| `always` | Réutilise dès la 1re requête n'importe quelle connexion idle |

La tentation est de passer directement à `always`, mais la doc HAProxy recommande l'inverse : « In most cases, this will lead to the same performance gains as `aggressive` but with more risks. It should only be used when it improves the situation over `aggressive`. » `always` suppose un chemin réseau qui ne coupe jamais une connexion juste après l'avoir relâchée, typiquement un groupe de serveurs de cache en LAN. On commence donc par `aggressive`, on mesure, puis on ne passe à `always` que si les chiffres changent vraiment.

Avec `aggressive` comme avec `always`, `timeout http-keep-alive` reste bas pour qu'aucune connexion morte ne reste dans le pool.

Le pool de connexions idle se règle par serveur :

```haproxy
backend app_servers
    http-reuse aggressive
    server web1 10.0.0.1:8080 pool-max-conn 100 pool-purge-delay 5s check
```

`pool-max-conn` limite le nombre de connexions idle gardées par serveur, pour ne pas accumuler des milliers de FD. `pool-purge-delay` recycle régulièrement les connexions idle.

## Tuning fin : splice, records TLS et scheduler

### Zero-copy (splice)

Sur Linux, HAProxy peut transférer des données d'un socket à l'autre sans les copier dans l'espace utilisateur, grâce à `splice()` :

```haproxy
defaults
    option splice-auto
```

HAProxy décide seul quand le splice est utile. Le gain se voit surtout sur du gros débit (vidéo, téléchargements) et beaucoup moins sur du trafic HTTP aux petites réponses.

!!! warning "Sans effet quand HAProxy termine TLS"
    `splice()` copie des octets bruts d'un socket à l'autre. Quand HAProxy déchiffre le TLS, les données passent forcément par l'espace utilisateur et le splice ne s'applique pas. La compression désactive aussi ce transfert direct.

### tune.ssl.maxrecord

`tune.ssl.maxrecord` limite la taille des records TLS envoyés au début d'une connexion. Par défaut, un record TLS fait jusqu'à 16 KB et le client ne peut le déchiffrer qu'après l'avoir reçu en entier.

```haproxy
global
    tune.ssl.maxrecord 1419
```

Avec 1419 octets, un record tient dans un seul segment TCP (MTU de 1500 moins les en-têtes IP, TCP et TLS). Le TTFB s'améliore sur les connexions à haute latence (mobile, intercontinental). HAProxy revient à des records de taille normale une fois la connexion établie.

### tune.listener.multi-queue

`tune.listener.multi-queue` décide comment les connexions entrantes se répartissent entre les threads :

```haproxy
global
    tune.listener.multi-queue fair
```

| Mode | Comportement |
| ---- | ------------ |
| `on` | Envoie vers le thread le moins chargé (défaut, adapté aux connexions longues) |
| `fair` | Round-robin entre tous les threads, depuis HAProxy 2.8 (adapté aux connexions courtes et aux machines à très nombreux threads) |
| `off` | Le thread qui accepte garde la connexion (risque de déséquilibre) |

### tune.sched.low-latency

`tune.sched.low-latency` est un seul flag, mais il change l'arbitrage entre latence et débit :

```haproxy
global
    tune.sched.low-latency on
```

Le scheduler traite alors en priorité les nouvelles connexions et requêtes, même au milieu d'un gros lot de tâches. La latence P99 baisse au détriment du débit global, si bien qu'on ne l'active que sur du trafic sensible à la latence (APIs temps réel, ad-tech).

### tune.notsent-lowat

`tune.notsent-lowat` réduit la quantité de données gardées dans les buffers des sockets kernel. Le kernel consomme moins de mémoire et le délai entre l'écriture applicative et l'envoi diminue :

```haproxy
global
    tune.notsent-lowat.client 65536
    tune.notsent-lowat.server 65536
```

Le réglage n'existe que sous Linux (`TCP_NOTSENT_LOWAT`). La valeur de `tune.bufsize` donne un premier point de départ.

## Servir un même contenu depuis le même cache

Devant des serveurs de cache, le round-robin dilue le cache. Chaque serveur reçoit toutes les clés et le hit ratio baisse à mesure qu'on ajoute des serveurs.

Le consistent hashing maximise le hit ratio en envoyant les requêtes d'un même contenu vers le même serveur, tant que l'ensemble des serveurs ne change pas.

```haproxy
backend cache_servers
    balance hdr(X-LB)
    hash-type consistent sdbm avalanche
    hash-balance-factor 140
```

`hash-type consistent sdbm avalanche` active le consistent hashing : ajouter ou retirer un serveur ne redistribue qu'une fraction des clés.

### Borner la charge de chaque serveur

Le consistent hashing pur concentre le trafic, car certains contenus sont beaucoup plus populaires que d'autres. Quelques serveurs reçoivent alors bien plus de trafic que les autres. L'autoscaling ne se déclenche pas pour autant, puisque la charge moyenne reste basse.

`hash-balance-factor 140` limite la charge d'un serveur à 140 % de la moyenne. Au-delà, les requêtes partent vers les autres serveurs du backend. Le cache reste utile et la charge reste répartie.

La bonne valeur dépend du workload. Elle se teste en charge, en surveillant le hit ratio du cache, les retries et la répartition de la charge entre serveurs.

## Retenter sur un autre serveur

Sur des backends qui peuvent se dégrader (réseau cloud limité, CPU saturé), HAProxy peut retenter la requête sur un autre serveur :

```haproxy
defaults
    timeout connect 20ms
    timeout server  2s
    retries 2
    retry-on 502 503 504 0rtt-rejected conn-failure empty-response response-timeout
    option redispatch 1

backend app_servers
    default-server inter 1s fall 1 rise 10 observe layer7 error-limit 3 on-error mark-down
    server web1 10.0.0.1:8080 check
    server web2 10.0.0.2:8080 check
```

| Paramètre | Rôle |
| --------- | ---- |
| `retry-on` | Liste des erreurs qui déclenchent un retry sur un autre serveur |
| `option redispatch 1` | Envoie chaque retry sur un autre serveur. Sans valeur, seul le dernier retry change de serveur |
| `retries 2` | Nombre maximum de tentatives |
| `observe layer7` | Surveille le trafic réel (codes HTTP, headers illisibles, timeouts) en plus des health checks |
| `error-limit 3` | Nombre d'erreurs consécutives qui déclenche `on-error` (défaut 10) |
| `on-error mark-down` | Action au-delà de `error-limit` (défaut `fail-check`, qui compte comme un check raté) |
| `fall 1` | Un seul échec suffit pour marquer le serveur DOWN |
| `rise 10` | 10 checks OK consécutifs pour le remettre UP et éviter les allers-retours |

!!! warning "`observe` seul ne fait rien d'immédiat"
    Sans autre réglage, `observe layer7` ne retire pas un serveur dès la première erreur. Il compte les erreurs et `error-limit` (défaut **10 erreurs consécutives**) déclenche `on-error` (défaut `fail-check`). Avec les valeurs par défaut et un `fall 1`, le serveur ne passe DOWN qu'après 10 erreurs d'affilée. Pour réagir plus tôt, on pose `error-limit` et `on-error` explicitement.

En layer7, les codes valides sont 100 à 499, 501 et 505. Un 500, 502, 503 ou 504 compte comme une erreur, alors qu'un 404 n'en est pas une.

!!! tip
    `timeout connect 20ms` est très agressif et ne convient que si HAProxy et les backends sont dans le même datacenter ou le même VPC. Un backend qui met plus de 20ms à accepter la connexion TCP est probablement limité ou saturé. Il vaut alors mieux redispatcher la requête tout de suite.

## Étaler les health checks

### spread-checks

Au démarrage, HAProxy étale déjà les premiers health checks sur l'intervalle. Ensuite, chaque serveur garde le même rythme et les checks de 500 backends peuvent se resynchroniser en pics de trafic.

```haproxy
global
    spread-checks 5
```

La valeur est un pourcentage d'aléa sur l'intervalle. Avec 5, chaque check part à ±5 % de son intervalle. L'étalement lisse les pics de CPU et de trafic réseau.

## Réduire le volume de logs

Sur les gros volumes, les logs peuvent devenir le goulot d'étranglement.

```haproxy
global
    log /dev/log local0 info
```

HAProxy émet les logs de requêtes au niveau `info`. Un plafond à `notice` ou `warning` ne réduit donc pas le volume, il supprime **tous** les logs de requêtes, erreurs comprises.

Sur les frontends à très haut débit, on désactive le log par requête pour ne garder que les erreurs :

```haproxy
frontend high_traffic
    option dontlog-normal
```

`dontlog-normal` ne journalise plus que les cas anormaux, c'est-à-dire les **5xx**, les erreurs, les timeouts, les retries et les redispatch. Les **4xx** n'en font pas partie, car un 404 ou un 403 servi proprement compte comme une connexion « normale » et disparaît des logs. Pour suivre les 4xx, on garde les logs complets. `option log-separate-errors` fait passer les erreurs, timeouts, retries, redispatch et 5xx du niveau `info` au niveau `err`. Le syslog peut alors les isoler dans un fichier à part.

## Compresser sans saturer le CPU

HAProxy peut compresser les réponses à la volée quand les backends ne le font pas.

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
| `gzip` | Le standard, supporté par tous les clients et le seul à utiliser en pratique |
| `deflate` | Ambigu et mal supporté par les navigateurs récents, à éviter |
| `raw-deflate` | Deflate sans enveloppe zlib, mieux supporté que `deflate` mais sans avantage sur gzip |
| `identity` | Aucune compression, utile seulement pour du debug |

HAProxy 3.3 ne supporte pas zstd. Pour servir du zstd, la compression se fait côté backend (nginx, application).

### Niveau de compression

`tune.comp.maxlevel` règle le niveau de compression gzip, de 1 (rapide, faible ratio) à 9 (lent, meilleur ratio). Le défaut est 1.

- `1` : presque gratuit en CPU, avec un ratio de compression modeste (environ 60 %)
- `4` ou `5` : bon compromis entre ratio et CPU pour la plupart des workloads
- `9` : ratio à peine meilleur qu'en 4 ou 5, pour une consommation CPU bien plus forte

Sur un HAProxy à forte charge, rester entre 1 et 4. Le gain de bande passante entre le niveau 4 et le niveau 9 justifie rarement le coût CPU.

!!! warning
    La compression consomme du CPU. Si les backends compressent déjà (nginx, CDN), l'activer côté HAProxy ne sert à rien. HAProxy détecte un `Content-Encoding` existant et ne recompresse pas la réponse.

## Exemple complet

Une config qui reprend les réglages ci-dessus sur un frontend TLS devant des backends HTTP :

```haproxy
global
    nbthread 4
    maxconn 300000
    maxsslconn 300000
    maxsslrate 300000
    spread-checks 5
    tune.ssl.cachesize 100000
    tune.ssl.lifetime 600
    ocsp-update.mode on
    log /dev/log local0 info

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
    bind *:443 ssl crt /etc/haproxy/certs/
    maxconn 150000
    default_backend app_servers

backend app_servers
    balance roundrobin
    http-reuse aggressive
    server web1 10.0.0.1:8080 maxconn 2000 check inter 3s fall 3 rise 2
    server web2 10.0.0.2:8080 maxconn 2000 check inter 3s fall 3 rise 2
```

Cette config ne pose pas `tune.bufsize` et garde le défaut de 16 KB. Avec `maxconn 300000`, passer à 64 KB demanderait environ 37 GB de RAM pour les seuls buffers. La doc HAProxy le dit explicitement : « At least the global maxconn parameter should be decreased by the same factor as this one is increased. » Monter le `bufsize` impose donc de baisser le `maxconn` du même facteur.

`tune.ssl.default-dh-param` n'y figure pas non plus, car il ne sert plus en ECDHE ni en TLS 1.3.

## Mesurer avant de tuner

Sans monitoring, le tuning se fait à l'aveugle. Un ensemble de recording rules et d'alertes Prometheus pour HAProxy est disponible sur [rules.jdelgado.fr](https://rules.jdelgado.fr/#alerts/haproxy.rules.yml) (40 alertes, 20 recording rules).

Ces alertes sont les plus utiles pour le tuning :

| Alerte | Seuil | Ce qu'elle détecte |
| ------ | ----- | ----------------- |
| `HAProxyProcessConnectionsSaturation` | >80% de maxconn | `maxconn` trop bas |
| `HAProxyProcessConnectionsCritical` | >90% de maxconn | Rejet de connexions imminent |
| `HAProxyFrontendSessionSaturation` | >70% des sessions | Frontend qui sature |
| `HAProxyProcessIdleLow` | <10% idle | CPU HAProxy saturé, ajouter des threads ou des replicas |
| `HAProxyProcessPoolFailures` | >0 | Échec d'allocation mémoire (OOM, `tune.bufsize` trop grand ou RAM insuffisante) |
| `HAProxyProcessSslConnectionsSaturation` | >80% de maxsslconn | `maxsslconn` trop bas |
| `HAProxyRetryHigh` | >10/s | Backends dégradés, `retry-on` et `redispatch` en action |
| `HAProxyBackendQueueTimeHigh` | >500ms | `maxconn` serveur trop bas ou backends lents |
| `HAProxyConnectionRateNearLimit` | >80% du rate limit | Pic de nouvelles connexions |
| `HAProxyProcessDroppedLogs` | >0 | Socket syslog saturé, passer en `dontlog-normal` |

Les recording rules précalculent les ratios d'erreurs (4xx et 5xx par backend), le trafic, les sessions et les retries, pour que les alertes s'évaluent vite sans surcharger Prometheus.

## Diagnostiquer un HAProxy qui sature

### Runtime

Le socket de runtime donne les paramètres effectifs :

```bash
echo "show info" | socat - /var/run/haproxy.sock | grep -iE 'maxconn|maxsock|nbthread|ulimit|pool'
```

### CPU binding

Depuis la 3.2, HAProxy affiche la répartition de ses threads sur les CPUs :

```bash
haproxy -c -dc -f /etc/haproxy/haproxy.cfg
```

La sortie liste les CPUs retenus et écartés, la topologie détectée, les thread groups et leurs CPU sets.

!!! warning
    Le `-c` est indispensable. `-dc` affiche son rapport **avant le démarrage** et, lancé seul, démarre réellement un second HAProxy qui échoue sur un conflit de bind. Avec `-c`, HAProxy vérifie la config puis quitte. On obtient ainsi le même rapport sans rien lancer.

### Contention CPU

`perf` montre où le CPU passe son temps :

```bash
sudo perf top
```

| Symptôme dans perf top | Cause probable | Action |
| ---------------------- | -------------- | ------ |
| `native_queued_spin_lock_slowpath` | Contention sur un lock kernel, souvent le listener socket sur de gros thread counts (symbole générique, vérifier la stack) | Ajouter `shards by-group` |
| `ksoftirqd` | Les IRQ de la NIC saturent des cœurs | Réserver des cœurs aux IRQ et les retirer du pool HAProxy |
| Fonctions SSL (`_bignum`, `_mont`) | Handshakes TLS intensifs | Séparer les threads SSL sur un NUMA node dédié |

## Voir aussi

- [HAProxy : Comportement d'une limite mémoire](memory_limit.md)
- [Reverse proxy: HAProxy](overview.md)
- [HAProxy : exploitation au quotidien](operations.md)
- [GOMEMLIMIT/GOMAXPROCS automatiques en Kubernetes](../../kubernetes/deployment/gomaxprocs_gomemlimit_kubernetes.md)
- [Règles Prometheus HAProxy](https://rules.jdelgado.fr/#alerts/haproxy.rules.yml) - alertes et recording rules pour suivre le tuning
