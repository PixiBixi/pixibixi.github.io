---
description: Configurer Nginx pour écouter en IPv6 — directives listen, entrées DNS AAAA et vérification
---

# Configurer nginx pour utiliser IPv6

Configurer l'IPv6 et nginx est un vrai casse-tête, et je ne vous parle
même pas lorsque l'on a plusieurs vhosts.

Tout d'abord, **2 vérifications** sont à faire au préalable pour être
sur que nous avons l'IPv6 d'activée, mais également que nginx la
supporte.

Pour vérifier que nous avons l'IPv6 :

```bash
ping6 google.com
```

Si cela ping, nous sommes déjà sûr que votre hôte dispose d'une
**connexion IPv6**.

Maintenant, pour être sur que **nginx**, nous affichons les options de
compilation nginx, et nous devons apercevoir `--with-ipv6`

```bash
nginx -V | grep --with-ipv6
```

Si nous avons la ligne, nous sommes prêts à modifier la configuration
afin d'y ajouter l'IPv6

Dans **un seul** block nginx, nous devons y ajouter cette ligne :

```nginx
listen [::]:80 ipv6only=on deferred default_server;
```

Dans cette ligne, nous pouvons observer plusieurs éléments :

* `listen` l'instruction **nginx** qui nous indique que nous devons
    '"écouter'"
* `[::']` qui nous indique sur quelles interfaces écouter (Ici, sur
    toutes)
* `ipv6only=on` signifie que cette ligne listen ne concerne uniquement
    l'IPv6
* `deferred` peut accélerer la communication TCP, mais est tout de
    même **indispensable** en IPv6
* `default_server` signifie que nous voulons que cette configuration
    soit chargée avant les autres

Sur les autres servers blocks, nous devons ajouter

```nginx
listen [::]:80;
```

Un petit coup de restart

```bash
service nginx restart
```

Et voilà, nous avons désormais nos serveurs utilisant l'IPv6 o/

Afin d'être sur que l'IPv6 fonctionne, nous pouvons faire un `curl -6
ndd.tld` à partir d'une machine tierce.

N'oubliez également pas de faire vos entrées DNS AAAA afin de match
IPv6 et NDD, sans cela, même avec une configuration nginx au poil, nous
ne pourrons communiquer en IPv6 avec le client.
