---
article: docs/web/haproxy/memory_limit.md
checked: '2026-11-10'
commit: ac7c47c46f80e2c38f3d5cbb32a319c852b0dce6
sources: []
unpinned: 6
---

# docs/web/haproxy/memory_limit.md

## Findings

- L45 ERROR corrigé : 81K devient 91K (7 x 13000), et phrase ajoutée : MaxConnRate est le pic observé depuis le démarrage, pas une capacité. Preuve : src/stats.c@v3.4.0:128 "Highest ConnRate reached on this worker process since started (in connections per second)".
- L64 ERROR corrigé : "maxconnrate à 1600 ... mieux pour gérer les peaks" remplacé par "5x la RAM, 5x le maxconn", MaxConnRate présenté comme un pic de trafic. Preuve : même ligne src/stats.c@v3.4.0:128.
- L17 OUTDATED corrigé : la citation d'origine est gardée (c'est ce que l'auteur a lu), suivie de la mention que nbproc n'existe plus depuis 2.5 et de la citation 3.0+. Preuve : doc/management.txt@v3.0.0:422-430 et @v3.4.0:477 "separately applied to the master and its forked worker process" ; src/cfgparse-global.c@v2.5.0:575 "nbproc is not supported any more since HAProxy 2.5".
- L11 IMPRECISE corrigé : paragraphe ajouté : HAProxy ne lit pas les cgroups, c'est `-m` (ou HAPROXY_MEMMAX, 0 par défaut) qui fait calculer maxconn ; "hardcode" remplacé par "faire calculer". Preuve : include/haproxy/defaults.h@v3.4.0:485-486, src/limits.c@v3.4.0:285 et :317-324, `git grep -i cgroup v3.4.0 -- src include` vide ; test haproxy:3.2.4 : conteneur `--memory=2500m` sans -m -> Memmax_MB 0, Maxconn 524261 (dérivé de ulimit) ; avec `-m 2500` -> Memmax_MB 2500, Maxconn 71000 (config sans SSL).
- L26 IMPRECISE corrigé : "en regardant une doc 2.8 j'aurais pu mieux troubleshoot" retiré, remplacé par : le texte cité est celui de 2.8, réécrit en 3.0, et aucune version n'explique le calcul (formule résumée depuis le code, avec l'arrondi à 2 chiffres qui explique 13000/65000). Preuve : doc/management.txt@v2.8.0:405-411 identique à la citation ; src/limits.c@v3.4.0:308 et :317-324 (MEM_USABLE_RATIO 0.97 dans include/haproxy/defaults.h@v3.4.0:481, round_2dig dans src/tools.c:688).
- L32 IMPRECISE corrigé : phrase ajoutée, Nbproc et Process_num sont historiques et valent toujours 1. Preuve : src/stats.c@v3.4.0:100 "(historical, always 1)".

## En plus

- Aucun.

## Modernisation

- Citer la doc 3.0 : appliqué (deuxième bloc note).
- Fixer maxconn explicitement dans global : appliqué avec un exemple, et le comportement avec -m + SSL (maxsslconn calculé sur le reste, exit si plus de place). Preuve : src/limits.c@v3.4.0:337-365.

## Tests

- Docker haproxy:3.2.4 + alpine/socat:1.8.0.0 (`show info` via socket) : sans -m sous cgroup 2500m, avec -m 2500. Conteneurs et volume supprimés.

## À signaler

- L'article ne dit pas qui passait `-m` dans le setup d'origine (image, chart ou controller). Rien trouvé dans les clones locaux haproxytech-helm-charts, helm/haproxy, helm/kubernetes-ingress. À compléter par l'auteur : si le conteneur ne passait pas `-m`, l'explication de l'article ne tient pas.
- 13000 pour 2500Mi (et 71000 dans mon test sans SSL) suggère une config SSL côté frontend dans le setup d'origine, non vérifiable.
