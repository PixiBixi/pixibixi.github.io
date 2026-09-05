---
description: "Exploitation HAProxy au quotidien : socket d'admin, stats, mise en maintenance d'un node, IP réelle du visiteur et intégration Cloudflare"
tags:
  - HAProxy
  - Cloudflare
---

# HAProxy : exploitation au quotidien

Tout ce qu'on fait sur un HAProxy en production sans le redémarrer : lire les stats, sortir
un node du pool et récupérer la vraie IP du client quand il y a un CDN devant.

## Le socket d'admin

Tout ce qui suit passe par le socket d'administration, à déclarer dans la
[section global](overview.md#global). Il y a 3 niveaux et le défaut est `operator`, pas
`user` : en `user` on n'a que la lecture non sensible, et `show sess` comme `show errors`
sont déjà refusés. `operator` autorise la lecture complète et les modifications anodines.
Toutes les commandes de mutation de cet article, `set server ... state`, `disable health`,
`set weight`, exigent `admin`.

```haproxy
global
    stats socket /run/haproxy/admin.sock mode 600 level admin
    stats timeout 30s
```

`mode 600` et pas `660` : sans `user`/`group`, le socket appartient à `root:root` et le bit
groupe ne donne accès à personne de plus. Si on veut vraiment déléguer, il faut ajouter
`user haproxy group haproxy`. Et pas de `expose-fd listeners` ici : la doc précise
qu'*in master-worker mode, it does not need "expose-fd listeners"*, or tous les units
systemd distribués lancent HAProxy en master-worker.

## Lire les stats

`show stat` sort du CSV, donc on filtre sur les colonnes qui nous intéressent.

```bash
echo "show stat" | socat stdio /run/haproxy/admin.sock | cut -d "," -f 1-2,5-10,34-36 | column -s, -t
# pxname                svname              scur  smax  slim     stot        bin          bout          rate  rate_lim  rate_max
cluster_analytics       custfront1          0     6     119151   117985796   1458531881   2             15
cluster_analytics       custfront2          0     4     54427    36461337    715425308    0             9
cluster_analytics       BACKEND             0     9     3277     287818      269535559    3593163041    2     22
cluster_bo              custbo1             0     11    605      1294617     5522403      0             22
```

## Mettre un node en maintenance

Les 2 états ne font pas ce que leur nom laisse croire, et c'est l'erreur qui coûte le plus
cher sur ce socket. `drain` retire le serveur du load balancing mais, dit la doc,
*still allows it to accept new persistent connections* : tout ce qui porte un cookie de
persistance, une entrée de stick-table ou un `use-server` continue d'arriver. `maint` coupe
le trafic entrant et les health checks, mais ne ferme pas les sessions déjà établies.

```bash
echo "set server backend_name/svc_name state drain" | socat stdio /run/haproxy/admin.sock
echo "set server backend_name/svc_name state maint" | socat stdio /run/haproxy/admin.sock
echo "set server backend_name/svc_name state ready" | socat stdio /run/haproxy/admin.sock
```

Pendant un drain les health checks continuent de partir. Pour les couper aussi :

```bash
echo "disable health backend_name/svc_name" | socat stdio /run/haproxy/admin.sock
echo "enable health backend_name/svc_name"  | socat stdio /run/haproxy/admin.sock
```

Ces commandes se tapent aussi directement dans HAtop.

!!! warning "Aucune des 2 commandes n'attend quoi que ce soit"
    `set server ... state drain` est instantané, c'est la vidange des sessions qui ne l'est
    pas. Sur du WebSocket ou du long-polling elles durent des heures. Donc ne jamais
    enchaîner un `drain` et un arrêt du service en se fiant au nom de la commande.

Pour couper vraiment, on passe en `maint`, on ferme ce qui reste, puis on attend que le
serveur soit réellement libérable. HAProxy fournit la barrière, ça évite de deviner :

```bash
socat -t60 /run/haproxy/admin.sock - <<< "
  set server backend_name/svc_name state maint
  shutdown sessions server backend_name/svc_name
  wait 30s srv-removable backend_name/svc_name
"
```

`wait srv-removable` ne rend la main que quand le serveur est en maintenance et n'a plus
aucune connexion, les connexions idle réutilisables comprises. Le `-t60` de socat n'est pas
cosmétique : sans lui, socat ferme le socket avant la fin du `wait`. L'unité par défaut du
délai est la milliseconde, d'où le `30s` explicite.

À défaut, on peut regarder le compteur de sessions courantes, en sachant qu'il ne dit rien
des connexions idle :

```bash
echo "show stat" | socat stdio /run/haproxy/admin.sock \
  | awk -F, '$1=="backend_name" && $2=="svc_name" {print "sessions restantes:", $5}'
```

## Autres commandes du socket

Celles qui servent en incident, plus une pour ajuster un poids à chaud :

```bash
# Sessions en cours, avec leur âge - pour trouver ce qui traîne
echo "show sess" | socat stdio /run/haproxy/admin.sock

# Dernières erreurs vues par HAProxy (requêtes malformées, réponses backend invalides)
echo "show errors" | socat stdio /run/haproxy/admin.sock

# Contenu d'une stick-table : utile pour du rate limiting ou de la persistance
echo "show table" | socat stdio /run/haproxy/admin.sock
echo "show table st_src_global" | socat stdio /run/haproxy/admin.sock

# Ajuster le poids d'un serveur à chaud, pour un canary par exemple
echo "set weight backend_name/svc_name 10" | socat stdio /run/haproxy/admin.sock

# Vider une entrée de stick-table (débloquer une IP rate-limitée à tort)
echo "clear table st_src_global key 203.0.113.4" | socat stdio /run/haproxy/admin.sock
```

## Conserver l'IP du visiteur

Derrière un reverse-proxy on logge très vite la mauvaise IP. Plus gênant, certaines ACL
applicatives autorisent ou non des pages selon l'IP source, donc il faut la propager
jusqu'au backend. Une ligne dans le frontend suffit.

```haproxy
frontend proxy
    ...
    option forwardfor
    ...
```

L'option renseigne `X-Forwarded-For` avec l'adresse du client.

!!! warning "X-Forwarded-For est un header empilable"
    S'il y a déjà un proxy devant, le header contient une liste (`client, proxy1, proxy2`)
    et n'importe qui peut en forger un. Ne jamais faire confiance à un `X-Forwarded-For`
    entrant sur un frontend exposé : soit on l'écrase avec
    `http-request set-header X-Forwarded-For %[src]`, soit on ne l'accepte que depuis les
    IP du CDN, comme ci-dessous.

## Derrière Cloudflare

Cloudflare passe l'IP d'origine dans `CF-Connecting-IP`. On réécrit la source avec, mais
**uniquement** si la connexion vient bien de chez eux, sinon n'importe qui usurpe son IP
en envoyant le header.

```haproxy
frontend https
    bind 0.0.0.0:443 ssl crt /etc/haproxy/acme-certs/ alpn h2,http/1.1 allow-0rtt

    mode http

    acl from_cf src -f /etc/haproxy/acl/cloudflare_ips.lst
    http-request set-src req.hdr(CF-Connecting-IP) if from_cf
    option forwardfor
```

Cloudflare publie ses préfixes, qui changent de temps en temps. Un cron hebdomadaire évite
de bloquer du trafic légitime le jour où ils en ajoutent un.

```bash
#!/usr/bin/env bash
set -euo pipefail

LST=/etc/haproxy/acl/cloudflare_ips.lst
TMP=$(mktemp)

# Les 2 fichiers Cloudflare n'ont pas de saut de ligne final : sans les echo, le dernier
# préfixe v4 et le premier v6 se retrouvent collés sur la même ligne et disparaissent tous
# les deux de l'ACL, ce qui fait refuser le pattern au reload.
{ curl -fsS https://www.cloudflare.com/ips-v4; echo
  curl -fsS https://www.cloudflare.com/ips-v6; echo
} > "$TMP"

# On ne remplace que si le fichier est non vide et a changé
if [[ -s "$TMP" ]] && ! cmp -s "$TMP" "$LST"; then
    install -m 0644 "$TMP" "$LST"
    haproxy -c -f /etc/haproxy/haproxy.cfg
    systemctl reload haproxy
fi
rm -f "$TMP"
```

`install` plutôt que `mv` : `mktemp` crée son fichier en `0600` et `mv` conserve ce mode,
donc un `mv` depuis `/tmp` laisse une ACL illisible par le process et traverse en prime une
frontière de système de fichiers. Le `haproxy -c` avant le reload attrape ce qui aurait
échappé au reste.

Le même principe marche pour les autres CDN, seul le header change : `True-Client-IP` chez
Akamai, `Fastly-Client-IP` chez Fastly.

## Voir aussi

- [Reverse proxy : HAProxy](overview.md) - la configuration de base
- [HAProxy : performance tuning](performance_tuning.md) - nbthread, maxconn, TLS et sysctls
- [Limiter un DDoS applicatif](../../linux/advanced/lock_ddos.md) - rate limiting et stick-tables en situation
