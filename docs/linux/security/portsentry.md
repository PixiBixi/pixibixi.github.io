# Installer et configuer PortSentry

portsentry est un programme de détection et de blocage de '"scan de
ports'" (Généralement programme qui scanne votre machine à le recherche
de ports ouverts, en général dans le but de préparer une attaque). Via
ce scan de port, un attaquant peut obtenir de nombreuses informations,
versions de SSH vulnérables ou autres'... il est donc important de se
prémunir de celui-ci

## Installation et Configuration

Une installation de base de portsentry se fera toujours via apt :

``` bash
$ apt update && apt install portsentry
```

Conrêtement, portsentry s'axe autour de 3 fichiers :

-   /etc/default/portsentry : Fichier où l'on indique dans quel mode
    portsentry doit démarrer
-   /etc/portsentry/portsentry.conf : Fichier où l'on indique les
    actions à effectuer quand au drop d'une connexion'...
-   /etc/portsentry/portsentry.ignore.static : Nous y plaçons les IPs
    que nous autorisons (whitelist)

De sorti d'installation, portsentry est inefficace, des réglages
s'imposent donc immédiatement.

Dans le fichier /etc/default/portsentry, il y a 2 variables :
**TCP_MODE** et **UDP_MODE**. Par défaut, celles-ci sont respectivement
en mode **tcp** et **udp**. Cela signifie que vous devez spécifier à la
main les ports à '"surveiller'". Nous préférons donc le mode **atcp** et
**audp** (**a** pour avancé).

Maintenant, nous allons configurer portsentry via le fichier
/etc/portsentry/portsentry.conf

La première directive à configurer est BLOCK_TCP (et son homologue UDP),
3 valeurs sont possibles :

-   **0** : Je détecte les scans de port mais je ne fais rien
-   **1** : Je bloque les scans UDP/TCP
-   **2** : Je lance uniquement la directive **KILL_RUN_CMD**

Dans cette partie du tutoriel, pour couvrir le plus de cas possible,
nous allons choisir l'option 1.

La valeur 1 de BLOCK_TCP nous indique 3 modes de bannissements :

-   Bloquage via route linux (Directive KILL_ROUTE)
-   Bloquage via fichier hosts.deny (Directive KILL_HOSTS_DENY)
-   Bloquage via règle custom (Directive KILL_RUN_CMD)

Les valeurs par défaut de KILL_ROUTE et KILL_HOSTS_DENY sont correctes
selon votre OS, il n'y a pas besoin d'y toucher.

Cependant, **KILL_RUN_CMD** demeure vide, voici une bonne valeur :

``` bash
KILL_RUN_CMD="/sbin/iptables -I INPUT -s $TARGET$ -j DROP && /sbin/iptables -I INPUT -s $TARGET$ -m limit --limit 3/minute --limit-burst 5 -j LOG --log-level debug --log-prefix Portsentry: dropping: "
```

## Bonus : Utilisation d'ipset

ipset va nous permettre de réduire le nombre dans iptables afin de ne
pas surcharger le kernel. Pour rappel, un trop grand nombres de lignes
iptables fait s'effondrer les performances de la stack network de
Linux.

Au lieu d'avoir une entrée/IP bannie dans iptables, nous aurons une
seule entrée.

Il faut installer ipset comme n'importe quel paquet (Mais également
iptables-persistent afin de rendre la config persistent):

``` bash
$ apt install ipset iptables-persistent
```

**Si vous êtes sous Debian 10, Ubuntu 19.04 ou supérieur**, alors il
existe un paquet permettant de rendre ipset persistent également :

``` bash
$ apt install ipset-persistent
```

Sinon, il vous faudra créer l'unit systemd manuellement (Fichier
/etc/systemd/system/ipset-persistent.service)

``` bash
[Unit]
Description=ipset persistent configuration
#
DefaultDependencies=no
Before=network.target

# ipset sets should be loaded before iptables
# Because creating iptables rules with names of non-existent sets is not possible
Before=netfilter-persistent.service

ConditionFileNotEmpty=/etc/iptables/ipset

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/sbin/ipset restore -file /etc/iptables/ipset
# Toggle comment to save (or not) changed sets on reboot
ExecStop=/sbin/ipset save -file /etc/iptables/ipset
ExecStop=/sbin/ipset flush
ExecStopPost=/sbin/ipset destroy

[Install]
WantedBy=multi-user.target

RequiredBy=netfilter-persistent.service
RequiredBy=ufw.service
```

Et on reload systemd + activation du service au démarrage

``` bash
$ systemctl daemon-reload
$ systemctl enable --now ipset-persistent.service
```

Il nous faut d'abord créer notre set ipset avec un timeout de 180s. Il
est inutile de bannir à vie ces IPs, un timeout de 3 minutes suffit
amplement à stopper l'attaquant.

``` bash
$ ipset create portsentry hash:ip timeout 180
```

Puis créer notre règle correspondante dans iptables

``` bash
$ iptables -I INPUT -m set --match-set portsentry src -j DROP
```

Maintenant, il faut spécifier à portsentry d'ajouter ces IPs bannies à
notre set ipset :

Nous allons spécifier la valeur 2 aux options BLOCK_TCP et BLOCK_UDP du
fichier '_/etc/portsentry/portsentry.conf'_, pour utiliser
**uniquement** la directive KILL_RUN_CMD.

Voici la KILL_RUN_CMD à définir (autour de la ligne 269) :

``` bash
KILL_RUN_CMD="/sbin/ipset add portsentry $TARGET$"
```
