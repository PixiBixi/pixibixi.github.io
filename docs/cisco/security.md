# Accroitre la sécurité

Etant donner que le routeur est au coeur d'un réseau, il est très
important de ne pas négliger la sécurité de celui-ci, et voici comment
le sécurité au maximum

## Désactivation des interfaces inutilisées

N'importe qui ayant un accès physique à votre routeur peut s'y
connecter si vous ne désactivez pas les interfaces inutilisées

    Comm1(config)#interface range fastEthernet 0/12-23
    Comm1(config-if-range)#shutdown

## ACL

Il est préférable de définir uniquement certaines IP ayant accès au
routeur via SSH, pour cela, nous utilisons les ACL

Admettons que notre adresse IP soit *192.168.1.20*

    Router(config)# access-list 25 permit host 192.168.1.20
    Router(config)# access-list 25 deny any log
    Router(config)# line vty 15
    Router(config-line)# access-class 25 in

Comme cela, nous limitons la 15eme ligne VTY (telnet) à se connecter
uniquement via l'adresse IP 192.168.1.20

Nous pouvons également faire ceci pour SSH...

Nous loggons également les tentatives non-autorisées d'accès

## Tentatives Maximale

Pour eviter le BruteForce, nous pouvons définir une politique de
tentative d'accès sur une plage de temps donné :

    Router(config)# login block-for 120 attempts 3 within 60

Cette ligne de commande désactivera pour une durée de 2 minutes (**120**
secondes) au bout de **3** essaie dans une période d'1 minute (**60**
secondes)

## Taille de mots de passe minimum

Afin d'éviter le bruteforce, et de casser un mot de passe à cause
d'une complexité trop faible, nous pouvons limiter le nomre de
caractères minimum d'un passwords (8 étant pas mal)

    Router(config)# security passwords min-length 8

## Timeout

En cas d'oubli de déconnexion, il se peut que votre interface reste
active, c'est pour cela que nous allons définir une durée de timeout :

    Router(config)# line vty 0 4
    Router(config-vty)# exec-timeout 10

Au bout de **10 minutes** d'inactivité sur l'interface **VTY**,
celle-ci sera automatiquement desactivée

## DHCP Snooping

Le DHCP Snooping consiste à une attaque MITM, et un serveur DHCP pirate
va se faire passer pour un serveur legit, afin de fournir des
informations étonnées (Mauvaise passerelle, mauvais DNS..)

    switch(config)#ip dhcp snooping

A partir de ce moment, tous les ports seront considérés comme étant
'"untrust'", et donc aucun ne sera capable de fournir du DHCP. Il nous
faut donc placer un port comme étant '"trust'"

    switch(config)#interface fa0/1
    switch(config-if)#ip dhcp snooping trust

On peut également limiter le nombre de requête par seconde (limit-rate)

    switch(config-if)#ip dhcp snooping limit rate 100

## Limitation d'adresse MAC

On peut limiter le nombre d'adresse MAC utilisable par port

    Comm1(config-if)#switchport port-security maximum 1

## Sécurité en cas de violation

Il existe différents mode de violation de droits

![](/cisco/port-security-violations.png){.align-center}

Par défaut, les ports sont en protect, pas très utile donc.

Il conviendrait plus de placer les ports en restrict voir en shutdown en
fonction de l'importance de celui-ci

    Comm1(config)#interface fastEthernet 0/18
    Comm1(config-if)#switchport port-security violation shutdown

## Affectation d'adresse MAC statique

Afin d'améliorer au maximum la sécurité, nous pouvons attribuer de
manière statique, ou bien en mode '"apprentissage'" une adresse MAC sur
un port défini.

Cela empêche de se connecter à un port, même si celui-ci est activé

### En mode apprentissage

En mode apprentissage, le switch mettra en whitelist la première adresse
MAC qui essaiera de se connecter au port

    Comm1(config)#interface fastEthernet 0/18
    Comm1(config-if)#switchport port-security mac-address sticky

### En mode statique

En mode statique, seule l'adresse MAC enregistrée pourra se connecter
au port

    Comm1(config)#interface fastEthernet 0/18
    switchport port-security mac-address 0002.16E8.C285

## Désactiver les services inutiles

Un service utilisé représente toujours une potentielle faille, ainsi
qu'une charge CPU inutile.

Si nous ne nous en servons pas, il est toujours de bonne pratique de les
désactivés.

    Comm1(config)# no ip http server
