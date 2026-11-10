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

Sans mot-clé, la commande masque le cœur MPLS pour tout le trafic, y compris les traceroutes lancés depuis le routeur lui-même :

    no mpls ip propagate-ttl

Le plus souvent, on veut juste cacher le cœur aux clients et garder ses propres traceroutes de diagnostic depuis les PE. Le mot-clé `forwarded` limite la commande au trafic transité (`local` fait l'inverse, seulement le trafic généré par le routeur) :

    no mpls ip propagate-ttl forwarded

!!! warning
    C'est le routeur d'entrée du LSP qui copie (ou non) le TTL IP dans le label. La commande compte donc sur les routeurs de bordure : on l'applique sur tous les PE pour garder une cohérence, sinon le cœur reste visible selon le PE par lequel le trafic entre.
