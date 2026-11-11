---
article: docs/databases/redis/timeouts.md
checked: '2026-11-11'
commit: b4dcacb6ae46c5083af0fa1bab1380e31c189af6
sources:
  - repo: redis
    path: redis.conf
    lines: 159-177
    ref: origin/unstable
    commit: 5364030b8098bde4825239387bca932bd9e9194e
  - repo: redis
    path: src/config.c
    lines: 4322-4334
    ref: origin/unstable
    commit: 5364030b8098bde4825239387bca932bd9e9194e
  - repo: redis
    path: src/anet.c
    lines: 115-250
    ref: origin/unstable
    commit: 5364030b8098bde4825239387bca932bd9e9194e
  - repo: redis
    path: src/networking.c
    lines: 126-137
    ref: origin/unstable
    commit: 5364030b8098bde4825239387bca932bd9e9194e
  - repo: redis
    path: src/timeout.c
    lines: 37-60
    ref: origin/unstable
    commit: 5364030b8098bde4825239387bca932bd9e9194e
  - repo: phpredis
    path: library.c
    lines: 3176-3375
    ref: origin/develop
    commit: 7c186d94a5fbabbee14f79cdcc44398feb80b55f
  - repo: phpredis
    path: library.c
    lines: 3451-3460
    ref: origin/develop
    commit: 7c186d94a5fbabbee14f79cdcc44398feb80b55f
  - repo: phpredis
    path: redis.c
    lines: 99-104
    ref: origin/develop
    commit: 7c186d94a5fbabbee14f79cdcc44398feb80b55f
unpinned: 4
---

# docs/databases/redis/timeouts.md

## Findings

- L22 ERROR corrigé : le plancher de 10 secondes (intervalle N/3 à 10 s minimum, « en dessous de 10 secondes, Redis force 10 ») n'existe que dans la branche Solaris de `anetKeepAlive`. Sur Linux (et macOS), `TCP_KEEPIDLE` reçoit N tel quel et `TCP_KEEPINTVL` reçoit N/3, remonté à 1 seulement si le résultat vaut 0. Retirer la phrase sur les bornes ou la limiter à Solaris. Le reste de la phrase (3 probes, intervalle N/3, double de N pour fermer) est juste. Preuve : src/anet.c:141-200 (bloc `__sun`) et src/anet.c:213-247 (Linux) @ origin/unstable

## Unpinned

- L37 : mesure d'un tiers des commandes par seconde en `ECHO` sur un nœud, mesure locale non reproductible
- L58 : `timeout 1` retrouvé à la place de `timeout 300` et snapshots par défaut après reboot, retour d'expérience
- L74 : conseil Ansible (2 playbooks distincts), pratique et non comportement amont
- L78 : `age` court et `idle` qui plafonne au `timeout` dans `CLIENT LIST`, comportement déduit du cron des clients, non rejoué
