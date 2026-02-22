---
description: Créer une allowlist d'IP avec ipset et iptables pour restreindre l'accès à des services spécifiques
---

# Whitelister une série d'IP à l'aide d'IPset et iptables

Dans certains cas, il peut être utile de whitelister une série d'IP
comme par exemple lorsque nous souhaitons qu'une API ne soit
disponibles que pour certains utilisateurs...

Pour y parvenir, plusieurs méthodes sont disponibles :

* Ajout d'une règle par IP à whitelist au niveau d'IPTables
* Filtre IP au sein de l'API
* Filtre IP sur le reverse-proxy
* Ajout d'une règle IPTables et création d'une liste ipset

Dans ce tutoriel, nous allons appliquer la dernière règle qui est la
plus optimisée. iptables charge un module appelé *xt_conntrack* qui
s'occupe d'analyser les trames. Cependant, un trop grand nombre de
règle iptables entraine une **importante** dégradation de la stack
TCP/IP (Ce phénomène a été observé de nombreuses fois).

C'est pour cela que nous utilisons ipset qui nous permet de créer de
listes d'IP.

## Requirements

Il faut tout d'abord installer les pré-requis

```bash
apt-get install ipset iptables netfilter-persistent iptables-persistent
```

## Configuration initiale

Tout d'abord, nous commencons à créer notre liste ipset

```bash
ipset create whitelist hash:ip hashsize 4096
```

Nous créons une liste ipset s'appelant whitelist utilisant le principe
de hash par IP et non le hash par network (Dans notre cas, nous
autorisons que des IPs et non des réseaux de tailles différentes)

Puis nous créons nos règles iptables

```bash
iptables -A INPUT -p tcp -m tcp --dport 9001 -m set --match-set whitelist src -j ACCEPT
iptables -A INPUT -p tcp -m tcp --dport 9001 -j DROP
```

Nous autorisons certaines IPs vers le port 9001 en TCP puis nous
rejetons tout le reste, règles à adapter bien évidemment

**Pour faire du multiport**, nous utilisons un module dédié à ça dans
iptables

```bash
iptables -A INPUT -p tcp -m multiport --destination-ports 9000:9005,9006,9021,9041,9042,9099 -m set --match-set whitelist src -j ACCEPT
iptables -A INPUT -p tcp -m multiport --destination-ports 9000:9005,9006,9021,9041,9042,9099 -j DROP
```

## Configuration persistante

Pour rendre notre configuration permanente, nous utilisons le logiciel
**netfilter-persistent** ainsi qu'un plugin ipset disponible
[ici](https://github.com/freeyoung/netfilter-persistent-plugin-ipset)

```bash
cd ~ 
git clone https://github.com/freeyoung/netfilter-persistent-plugin-ipset
chmod +x netfilter-persistent-plugin-ipset/10-ipset
mv netfilter-persistent-plugin-ipset/10-ipset /usr/share/netfilter-persistent/plugins.d
```

Une fois le plugin installé, il faut activer le service au démarrage

```bash
systemctl enable netfilter-persistent
```

Et sauvegarder la configuration actuelle

```bash
/etc/init.d/netfilter-persistent save
```

Votre configuration est désormais persistent, penser à sauvegarder vos
modifications à chaque modification d'ipset/iptables
