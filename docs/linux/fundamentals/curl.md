---
description: Utiliser cURL pour faire des requêtes HTTP avec en-têtes, authentification et métriques de performance
tags:
  - curl
---

# cURL: La commande à tout faire

* cURL détaillé

```bash
curl -I -v --trace-time https://www.google.com
```

## BONUS

### cURL détaillé

Nous pouvons personnaliser l'output de cURL pour avoir des détails
extrêmements intéressants tels que le temps de résolution DNS, de
négociation TLS...

Nous utilisons pour cela un fichier qui sera un template :

```bash
Fichier:
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
```

Et enfin, nous l'appelons :

```bash
curl -w "@curl-format.txt" -o /dev/null -s "https://wiki.jdelgado.fr"
    time_namelookup:  0,015000
       time_connect:  0,057639
    time_appconnect:  0,239148
   time_pretransfer:  0,239948
      time_redirect:  0,000000
 time_starttransfer:  0,281632
                    ----------
         time_total:  0,281707
```

Il est également possible d'avoir le retour de la commande cURL en
JSON, très facile à parser

```bash
curl --write-out %{json} https://google.com -o saved
```

Toutes les options de '--write-out sont disponibles
[ici](https://curl.se/docs/manpage.html#-w)

### Résolution DNS forcée

Pratique pour tester un backend avant propagation DNS, ou cibler un nœud précis derrière un load balancer sans toucher `/etc/hosts`.

`--resolve` force curl à mapper `host:port` vers une IP spécifique, tout en conservant le bon `Host` header et la validation SNI/TLS :

```bash
# Tester le nouveau serveur avant de changer le DNS
curl --resolve example.com:443:1.2.3.4 https://example.com

# Cibler un nœud précis derrière un LB (avec headers et statut HTTP)
curl -sI --resolve api.example.com:443:10.0.1.42 https://api.example.com/health
```

On peut enchaîner plusieurs `--resolve` dans la même commande pour des redirections cross-domaines :

```bash
curl --resolve origin.example.com:443:10.0.1.10 \
     --resolve cdn.example.com:443:10.0.1.11 \
     https://origin.example.com
```

Pour une variante sans port, `--connect-to` fait la même chose mais s'applique à tous les ports d'un coup :

```bash
# Redirige tout le trafic vers example.com vers staging.internal
curl --connect-to example.com::staging.internal: https://example.com
```

### Détails CRT

On peut avoir quelques détails sur le CRT en utilisant cURL et un peu de
magie :

```bash
λ Jeremy ~ → curl -vvI https://wiki.jdelgado.fr 2>&1 | awk BEGIN { cert=0 } /^'* Server certificate:/ { cert=1 } /^'*/ { if (cert) print }
* Server certificate:
*  subject: CN=*.jdelgado.fr
*  start date: Mar 21 03:47:50 2021 GMT
*  expire date: Jun 19 03:47:50 2021 GMT
*  subjectAltName: host "wiki.jdelgado.fr" matched certs "*.jdelgado.fr"
*  issuer: C=US; O=Lets Encrypt; CN=R3
*  SSL certificate verify ok.
* Using HTTP2, server supports multi-use
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* Using Stream ID: 1 (easy handle 0x7f845200ca00)
* Connection state changed (MAX_CONCURRENT_STREAMS == 250)!
* Connection #0 to host wiki.jdelgado.fr left intact
* Closing connection 0

```
