---
description: Créer et configurer des unités systemd (services) avec les bonnes pratiques pour le démarrage automatique
tags:
  - Systemd
---

# Créer son service systemd

## Quelques explications

Depuis quelques années, systemd s'est imposé comme étant l'init de
beaucoup de distributions, gérant ainsi les démarrages systemd est voué
à remplacer de nombreux composants systèmes historiques tels que cron,
network...

systemd a été implémenté de différentes manières selon les OS (et
rarement de la bonne manière) et les mainteneurs de paquets n'ont
toujours les bonnes pratiques. Officiellement, voici les bonnes
pratiques à faire quand on parle d'unit systemd. Une unit est un
service en jargon systemd.

* `/usr/lib/systemd/system/` : Units installées par les paquets
* `/etc/systemd/system/` : Units créés par l'administrateur
    système.

Malheureusement, quelques units de packages se trouvent encore dans
`/etc/systemd/system`. Historiquement, les scripts de démarrages se
trouvaient dans `/etc/init.d`.

## Cas pratique

Concrètement, voici un exemple type d'unit :

<!-- markdownlint-disable MD034 -->
```bash title="Simple unit file : /etc/systemd/system/prometheus.service"
[Unit]
Description=Prometheus
Documentation=https://prometheus.io/docs/guides/
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=prometheus
WorkingDirectory=/etc/prometheus
EnvironmentFile=/etc/default/prometheus
ExecStart=/usr/bin/prometheus --storage.tsdb.path=/var/lib/prometheus
Restart=always

[Install]
WantedBy=multi-user.target
```
<!-- markdownlint-enable MD034 -->

Il s'agit d'une unit extrêmement simple.

Nous pouvons constater 3 blocs principaux : Unit, Service et Install. Il
s'agit simplement de mots clefs afin de rendre plus lisible un unit.

Tout d'abord, dans la partie Unit nous pouvons voir la directive
*Description*. Comme son nom l'indique, il s'agit simplement d'une
description lorsque nous souhaitons obtenir le status d'un service. La
directive Documentation nous sert juste à apporter une documentation
(comme son nom l'indique). *After* est une directive importante,
celle-ci indique que nous devrons lancer notre unit après celle
indiquée, ici, network-online (logique étant donner que notre logiciel
écoutera sur un port). *After* ne fait qu'ordonner : sans *Wants=network-online.target*, la target n'est pas tirée au boot et l'ordre ne sert à rien, d'où les 2 lignes.

Par la suite, nous avons la partie qui nous concerne réellement,
Service.

Dans cette partie, nous commencons par la directive *Type=Simple*. Il
existe de nombreux types, celui-ci nous indique simplement que notre
processus va démarrer immédiatement :

* `Simple` : Il s'agit du type par défaut. C'est un service qui ne doit pas fork. systemd le considère démarré juste après le fork, avant même que le binaire soit lancé : un binaire ou un user manquant n'est pas remonté comme un échec de démarrage, et les units qui viennent après ne l'attendent pas.
* `exec` : Comme *Simple*, mais systemd attend que le binaire soit réellement exécuté, donc les erreurs de lancement sont remontées. C'est le type que systemd recommande pour les services longue durée (systemd 240 et plus).
* `idle` : Le service est identique au type *Simple*, mais son lancement est retardé jusqu'à ce que les autres jobs en cours soient dispatchés, pour éviter de mélanger sa sortie avec celle du boot sur la console. Ce n'est pas un outil d'ordonnancement : au bout de 5 s, le programme est lancé quoi qu'il arrive.
* `Forking` : Considère le service comme lancé une fois que le
    processus père à exit après démarrage complet de son fork. Il est
    utile d'y combiner l'option *PIDFile* afin que systemd identifie le processus enfant, qui devient le processus principal du service
* `Oneshot` : Contrairement à *Simple*, systemd attend la fin du processus avant de considérer l'unit démarrée et de lancer les units qui viennent après. Il est par exemple très utile dans l'exécution d'un script qui fait un seul job et se termine. Sans `RemainAfterExit=yes`, l'unit ne passe jamais `active` : elle retombe directement en `dead` une fois le script fini.

D'autres services sont également disponibles mais sont très peu
utilisés. Je vous renvoie vers la section Type de la [page
man](https://www.freedesktop.org/software/systemd/man/systemd.service.html#Type=)
de systemd afin d'obtenir toutes les explications.

L'User avec lequel sera exécuté sera prometheus. (La directive Group
est également disponible).

La directive WorkingDirectory est assez importante. Toutes les
directives des fichiers de configuration faisant référence à des chemins
relatifs seront donc basés par rapport à celui-ci. Exemple, si dans mon
fichier de configuration je précise un chemin relatif vers fichier.json
par exemple, alors le fichier comprit par le logiciel sera
`/etc/prometheus/fichier.json`.

`EnvironmentFile` est un autre fichier également important. Il sera
utilisé pour charger des variables d'environnement au fichier. Il
existe une autre alternative qui consiste à utiliser la directive
Environment afin de charger directement la variable d'environnement.
Par exemple `Environment=FOO=bar` va charger la variable FOO contenant
la valeur bar.

Enfin, la directive la plus importante est l'ExecStart qui indique tout
simplement la commande à charger. Dans notre exemple, nous lançons juste
prometheus en lui indiquant où stocker ses données. Enfin, nous lui
indiquons de toujours relancer le service. La même directive existe pour
ExecStop. Si aucun ExecStop n'est spécifié, le comportement par défaut
de systemd est d'envoyer un SIGTERM (15) sur tous les processus lancés
par ce service, après un timeout, un SIGKILL (9) est envoyé.

De plus, il est posssible de préciser des commandes pre-start ou
post-start (ainsi que pour stop) grâces aux directives ExecStartPre et
ExecStartPost

Dernier block de notre unit systemd et pas le moins important,
`Install`. La directive `WantedBy=multi-user.target` indique à quelle target rattacher l'unit lors du `systemctl enable` (multi-user correspond à peu près aux anciens runlevels 2, 3, 4 et 5) : elle est alors lancée à chaque boot, mais `enable` seul ne la démarre pas tout de suite (`systemctl enable --now` pour ça). Concrêtement, nous allons toujours utiliser cette target.

## Service Modèle

Un service template est appelé ainsi car il s'agit d'un service
pouvant être utilisé :

<!-- markdownlint-disable MD034 -->
```bash title="Simple unit file : /etc/systemd/system/openvpn@.service"
[Unit]
Description=OpenVPN service for %I
After=syslog.target network-online.target
Wants=network-online.target
Documentation=man:openvpn(8)
Documentation=https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
Documentation=https://community.openvpn.net/openvpn/wiki/HOWTO

[Service]
Type=notify
PrivateTmp=true
WorkingDirectory=/etc/openvpn/client/%i/
ExecStart=/usr/sbin/openvpn --status %t/openvpn-server/status-%i.log --status-version 2 --suppress-timestamps --data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305 --config /etc/openvpn/client/%i/%i.conf
CapabilityBoundingSet=CAP_IPC_LOCK CAP_NET_ADMIN CAP_NET_BIND_SERVICE CAP_NET_RAW CAP_SETGID CAP_SETUID CAP_SYS_CHROOT CAP_DAC_OVERRIDE
TasksMax=20
DeviceAllow=/dev/null rw
DeviceAllow=/dev/net/tun rw
ProtectSystem=true
ProtectHome=true
KillMode=process
RestartSec=5s
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
<!-- markdownlint-enable MD034 -->

Comme nous pouvons déjà l'observer dans le nom de l'unit, celle-ci
contient un **@**. Celui-ci signifie qu'il s'agit d'un template.

L'exemple est un peu plus compliqué que le précédent.

* `PrivateTmp` donne au service ses propres */tmp* et */var/tmp*, dans un namespace privé : ce qu'il y écrit n'est pas visible des autres processus (le */tmp* partagé est accessible par tout le monde) et est supprimé à l'arrêt du service.

* `WorkingDirectory`
contient ici un %i indiquant une variable systemd. Ici, le %i signifie
que nous prenons tous les caractères tapés après l'@ lors du start du
service.

  * Par exemple `systemctl start openvpn@toto.service`, notre variable `%i` contiendra toto.

* `%t` contenu dans la directive ExecStart est le répertoire d'exécution. Il existe une tonne de variables de ce genre, une liste complète est disponible sur [la documentation](https://www.freedesktop.org/software/systemd/man/systemd.unit.html#Specifiers) du projet.

* `CapabilityBoundingSet` nous permet de définir à quelles
capabilities aura accès le binaire, seules les capabilities listées dans
la liste seront autorisées et aucune autre.

* `TasksMax` borne le nombre de tâches (processus et threads) du service. On ne prend pas `LimitNPROC`, que l'on voit encore dans de vieilles units : c'est une limite par UID réel, cumulée avec tous les processus du même user, et elle n'est pas appliquée si le service tourne en root.

* `--data-ciphers` liste les ciphers négociables (OpenVPN 2.5 et plus). Il remplace `--ncp-ciphers`, encore accepté comme alias, et on n'y met plus de CBC ni BF-CBC. C'est d'ailleurs le défaut depuis la 2.6 quand ChaCha20-Poly1305 est disponible.

* `DeviceAllow` nous permet d'accéder à un device spécifique en lecture
et écriture.

* `ProtectSystem` est une directive très utile. Ici, mise à true, les
répertoires /usr et /boot seront accessible en lecture uniquement pour
le processus invoquée par notre unit. Si cette directive est définie à
*full*, le répertoire /etc sera également en read-only. Enfin, définie à
*strict*, tout le système est en read-only sauf /dev, /proc et /sys.

* `ProtectHome`, définie à *true*, nous permettra de rendre les
répertoires /home, /root et /run/user `vides` pour le processus.
