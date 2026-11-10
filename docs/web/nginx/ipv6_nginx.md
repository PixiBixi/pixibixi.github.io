---
description: Configurer nginx pour écouter en IPv6 - directives listen, entrées DNS AAAA et vérification
tags:
  - nginx
  - IPv6
tested_with:
  - "nginx 1.27.3"
---

# Configurer nginx pour utiliser IPv6

Configurer l'IPv6 et nginx est un vrai casse-tête et je ne vous parle
même pas lorsque l'on a plusieurs vhosts.

Tout d'abord, on vérifie que l'hôte a bien l'IPv6 d'activée :

```bash
ping6 google.com
```

Si cela ping, nous sommes déjà sûr que votre hôte dispose d'une
**connexion IPv6**.

Côté **nginx**, plus rien à vérifier : depuis nginx 1.11.5 (2016), le support IPv6 est compilé automatiquement et l'option `--with-ipv6` a disparu de `nginx -V`. Ne pas la voir ne veut donc rien dire. Sur un très vieux binaire, on la cherche comme ceci (`nginx -V` écrit sur stderr) :

```bash
nginx -V 2>&1 | grep -- --with-ipv6
```

Dans **un seul** block nginx, celui qui doit répondre par défaut, nous ajoutons cette ligne :

```nginx
listen [::]:80 default_server;
```

Dans cette ligne, nous pouvons observer plusieurs éléments :

* `listen` l'instruction **nginx** qui nous indique que nous devons
    « écouter »
* `[::]` qui nous indique sur quelles interfaces écouter (Ici, sur
    toutes)
* `default_server` désigne le server block qui répond quand aucun `server_name` ne correspond, pour cette paire adresse:port. Il ne peut y en avoir qu'un par adresse:port, sinon `nginx -t` refuse (`a duplicate default server for [::]:80`)

On croise souvent `ipv6only=on` et `deferred` sur cette ligne. Ces options de socket ne se posent qu'une fois par adresse:port (sinon `duplicate listen options for [::]:80`), d'où le « un seul block » :

* `ipv6only=on` limite la socket `[::]:80` à l'IPv6, l'IPv4 restant servie par `listen 80;`. C'est déjà la valeur par défaut de nginx, inutile de l'écrire
* `deferred` active `TCP_DEFER_ACCEPT` (Linux seulement) : nginx n'est réveillé qu'à l'arrivée des premières données. Aucun lien avec l'IPv6, c'est une option facultative

Sur les autres servers blocks qui doivent répondre en IPv6, nous ajoutons

```nginx
listen [::]:80;
```

On valide la configuration puis un reload suffit, il ouvre aussi la nouvelle socket `[::]:80` sans couper les connexions en cours :

```bash
nginx -t && systemctl reload nginx
```

Et voilà, nous avons désormais nos serveurs utilisant l'IPv6 o/

Afin d'être sur que l'IPv6 fonctionne, nous pouvons faire un `curl -6
ndd.tld` à partir d'une machine tierce.

N'oubliez également pas de faire vos entrées DNS AAAA afin de match
IPv6 et NDD, sans cela, même avec une configuration nginx au poil, nous
ne pourrons communiquer en IPv6 avec le client.

## Voir aussi

* [Installer son Serveur Web : nginx, PHP-FPM et MariaDB](installation.md) - Installation de nginx
