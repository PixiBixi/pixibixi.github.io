# Apprendre à se servir d'ipset 
 
ipset est un produit magique qui va vous permettre de build des hashmap 
d'IP. Bien plus efficace que des multiples entrées sur iptables. 
 
``` bash 
ipset create drop hash:net 
``` 
 
Il existe 2 types de tables, à adapter selon son usage : 
 
-   hash:net pour les subnets 
-   has:ip pour les IPs 
 
On commence par créer une map où l'on va ajouter les différents ranges 
d'IPs 
 
``` bash 
ipset add drop 14.144.0.0/12 
ipset add drop 27.8.0.0/13 
ipset add drop 58.16.0.0/15 
ipset add drop 1.1.1.0/24  
``` 
 
Enfin, nous pouvons ajouter notre règle iptables correspondante : 
 
``` bash 
iptables -I INPUT -m set --match-set drop src -j DROP 
``` 
 
Nous allons drop tous les subnets inclus dans la table drop. 
 
Différentes commandes existent autour de ipset. 
 
``` bash 
ipset -L # Lister les tables 
ipset destroy drop # Drop la table drop 
``` 
 
## Bonus 
 
### Drop de pays 
 
Il existe différents scripts tels que 
[ipset-country](https://github.com/mkorthof/ipset-country) permettant 
d'automatiser de nombreuses choses. Par exemple, via ce script, nous 
pouvons automatiser le drop de pays entier via des listes prédéfinies. 
 
### Persistent 
 
Pour rendre persitent ipset. Il existe le package ipset-persistent. 
 
### nftables 
 
Sous nftables (inclus dans Debian 11), nous n'avons plus besoin 
d'ipset. La notion de liste est directement gérée dans nftables. 
 
Pour l'import dans nftables, une seule commande suffit : 
 
``` bash 
ipset-translate restore < sets.ipset 
``` 
 
Si vous voulez regarder le résultat nft : 
 
``` bash 
nft list ruleset 
``` 
