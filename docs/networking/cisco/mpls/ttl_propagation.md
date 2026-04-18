---
description: Désactiver la propagation du TTL en MPLS sur Cisco pour masquer la topologie interne aux traceroutes
tags:
  - Cisco
  - MPLS
---

# Désactiver la propagation du TTL en MPLS

Lorsque l'on fait un grand réseau MPLS, il peut être utile de
désactiver la propagation du TTL. D'une part pour ne pas avoir un trop
grand nombre de hop sur un traceroute, ou ne pas dévoiler tous les
routeurs de son infra.

    no mpls ip propagate-ttl

!!! warning
    Si on fait la commande sur un routeur de la chaîne MPLS, il faut la faire sur toute la chaîne pour garder une cohérence.
