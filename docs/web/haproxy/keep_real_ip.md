---
description: Conserver l'IP réelle du client avec HAproxy en amont d'un backend web via la directive forwardfor
tags:
  - HAProxy
---

# Conserver l'IP de son visiteur sur un reverse-proxy

Si on n'a aucune notion sur HAproxy, le [guide HAproxy](./overview.md) est un bon point de départ.

Dans le cadre de l'utilisation d'un reverse-proxy, il est très facile de logger la mauvaise IP. Plus important, certains sites autorisent ou non l'accès à certaines pages selon l'IP — il est donc important de conserver la bonne IP tout au long du process.

Pour ça, rien de plus simple côté HAproxy, il suffit d'ajouter cette option dans un frontend :

```haproxy
frontend proxy
    ...
    option forwardfor
    ...
```

Cette option va override un quelconque header `X-Forwarded-For` existant et y mettre l'adresse IP du client.
