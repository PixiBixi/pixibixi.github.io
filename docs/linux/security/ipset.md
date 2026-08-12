---
description: "ipset : créer et gérer des listes d'IP et de réseaux pour iptables, types de sets, persistance au reboot, rechargement atomique par swap, erreurs Hash is full et set in use, et l'équivalent natif sous nftables."
tags:
  - ipset
  - Firewall
---

# ipset : gérer des listes d'IP pour iptables et nftables

Bloquer 10 000 IP avec 10 000 règles iptables, ça marche jusqu'au jour où ça ne marche plus : le noyau parcourt la chaîne règle par règle, donc le coût par paquet croît linéairement avec la liste. ipset stocke les mêmes IP dans une table de hachage consultée en temps constant, et iptables n'a plus qu'**une seule** règle qui pointe dessus.

```bash
apt install ipset
```

## Créer un set et l'utiliser

Le type se choisit à la création et ne peut plus changer ensuite :

```bash
# Des réseaux (CIDR)
ipset create blocklist hash:net

# Des IP unitaires
ipset create bruteforce hash:ip
```

On y ajoute ce qu'on veut filtrer, en vrac ou par lot :

```bash
ipset add blocklist 14.144.0.0/12
ipset add blocklist 27.8.0.0/13
ipset add blocklist 58.16.0.0/15
```

Puis une règle iptables unique couvre tout le set. `src` désigne l'adresse source du paquet, `dst` la destination :

```bash
iptables -I INPUT -m set --match-set blocklist src -j DROP
```

## Les types de sets

| Type | Contient | Cas d'usage |
|---|---|---|
| `hash:ip` | Des IP unitaires | Bans temporaires, fail2ban |
| `hash:net` | Des réseaux CIDR | Blocklists, blocs pays |
| `hash:ip,port` | Couples IP + port | Autoriser une IP sur un port précis |
| `hash:net,iface` | Réseau + interface | Filtrage multi-homé |
| `bitmap:ip` | Une plage fixe d'IP | Très rapide, mais limité à un /16 |
| `list:set` | D'autres sets | Regrouper plusieurs listes sous une règle |

`list:set` est le type qu'on découvre trop tard : il permet de garder des listes séparées par origine (Spamhaus, blocage pays, bans maison) tout en n'ayant qu'une règle iptables au-dessus.

## La limite par défaut qui surprend

Un set de type hash accepte **65536 entrées par défaut**, et l'ajout au-delà échoue avec `Hash is full, cannot add more elements`. Une blocklist pays dépasse ce seuil sans difficulté, donc on dimensionne à la création :

```bash
ipset create blocklist hash:net maxelem 1000000
```

`maxelem` ne se change pas après coup. Pour agrandir un set existant, il faut en créer un neuf et basculer dessus, ce qui se fait proprement avec `swap` (plus bas).

## Bans temporaires avec timeout

Un set créé avec `timeout` expire ses entrées tout seul, ce qui évite d'écrire le nettoyage :

```bash
# Expiration par défaut à 1h
ipset create bruteforce hash:ip timeout 3600

# Cette IP-là sort dans 10 minutes
ipset add bruteforce 203.0.113.7 timeout 600
```

Le compte à rebours restant s'affiche dans le listing, et un `ipset add` sur une IP déjà présente remet le compteur à zéro.

## Les commandes du quotidien

```bash
ipset list                      # Tous les sets, avec leur contenu
ipset list blocklist            # Un seul set
ipset list -t                   # Les en-têtes seuls, sans dérouler 100k entrées
ipset test blocklist 1.2.3.4    # Cette IP est-elle dedans ?
ipset del blocklist 1.2.3.4     # Retirer une entrée
ipset flush blocklist           # Vider sans détruire
ipset destroy blocklist         # Détruire
```

`ipset list` sur un set d'un million d'entrées inonde le terminal : `-t` donne la taille et le nombre d'éléments sans le contenu, et c'est ce qu'on veut 9 fois sur 10.

## Recharger une liste sans ouvrir de fenêtre

Le réflexe `flush` puis ré-`add` laisse le set vide pendant toute la durée du rechargement, donc le trafic passe. La méthode correcte consiste à remplir un set temporaire puis à l'échanger : `swap` est atomique du point de vue du noyau, la règle iptables n'est jamais touchée.

```bash
ipset create blocklist_new hash:net maxelem 1000000
while read -r net; do ipset add blocklist_new "$net"; done < /tmp/liste.txt
ipset swap blocklist_new blocklist
ipset destroy blocklist_new     # contient maintenant l'ancien contenu
```

Pour un gros volume, `ipset restore` avale un fichier de commandes en une passe, bien plus vite qu'une boucle shell :

```bash
{ echo "create blocklist_new hash:net maxelem 1000000"
  sed 's/^/add blocklist_new /' /tmp/liste.txt
} | ipset restore
```

## Rendre les sets persistants

Les sets vivent en mémoire et disparaissent au reboot. Sur Debian et Ubuntu, le paquet `ipset-persistent` s'en charge, en compagnon de `iptables-persistent` :

```bash
apt install ipset-persistent
ipset save > /etc/iptables/ipsets      # sauvegarde manuelle
```

Sinon, `ipset save` et `ipset restore` suffisent à écrire une unité systemd, avec l'ordre qui compte : les sets doivent exister **avant** que les règles iptables ne les référencent, sinon la règle est rejetée au démarrage.

```ini title="/etc/systemd/system/ipset-restore.service"
[Unit]
Description=Restore ipset sets
Before=netfilter-persistent.service
DefaultDependencies=no

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/sh -c '/sbin/ipset restore < /etc/ipset.conf'
ExecStop=/bin/sh -c '/sbin/ipset save > /etc/ipset.conf'

[Install]
WantedBy=multi-user.target
```

## Les 2 erreurs qu'on rencontre

`Set cannot be destroyed: it is in use by a kernel component` veut dire qu'une règle iptables pointe encore dessus. On retire la règle d'abord, le set ensuite :

```bash
iptables -D INPUT -m set --match-set blocklist src -j DROP
ipset destroy blocklist
```

`The set with the given name does not exist` au démarrage signale l'inverse : les règles ont été restaurées avant les sets. C'est l'ordre du `Before=` de l'unité ci-dessus qui le règle.

## Bloquer des pays entiers

Des scripts comme [ipset-country](https://github.com/mkorthof/ipset-country) récupèrent les plages allouées à un pays et remplissent le set tout seuls. À dimensionner avec `maxelem` en conséquence, une allocation nationale se compte en dizaines de milliers de blocs CIDR.

## Sous nftables

nftables gère les listes nativement, il n'y a donc plus besoin d'ipset :

```bash
nft add table inet filter
nft add set inet filter blocklist '{ type ipv4_addr; flags interval; }'
nft add element inet filter blocklist '{ 14.144.0.0/12, 27.8.0.0/13 }'
nft add rule inet filter input ip saddr @blocklist drop
```

Le flag `interval` est l'équivalent de `hash:net` et autorise les CIDR ; sans lui, le set n'accepte que des adresses unitaires. Pour migrer une configuration existante, `ipset` sait traduire ses propres sauvegardes :

```bash
ipset save > sets.ipset
ipset-translate restore < sets.ipset
nft list ruleset
```

À noter que sur les distributions récentes, `iptables` est déjà un frontend sur nftables (`iptables-nft`), et ipset continue d'y fonctionner. La migration n'est donc pas urgente, mais un nouveau setup n'a pas de raison de commencer avec ipset.
