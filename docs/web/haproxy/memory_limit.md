---
description: Comprendre l'impact d'une limite mémoire sur les performances et la capacité de connexion de HAProxy
tags:
  - HAProxy
---

# HAProxy : Comportement d'une limite mémoire

Il y a peu, j'ai observé un comportement assez étonnant avec HAProxy. (mais pas si inattendu quand on y réfléchit)

Déployant des HAProxy sur K8s, j'ai décidé (à mauvais titre) de mettre une limite de RAM pour mieux maitriser le comportement.

Précision importante : HAProxy ne lit pas les cgroups, une limit mémoire K8s seule ne change rien au maxconn. Ce qui le change, c'est le flag `-m <MB>` (ou `HAPROXY_MEMMAX` à la compilation, 0 par défaut) passé à HAProxy avec la même valeur que la limit. Sans `-m`, un conteneur limité à 2500Mi garde un maxconn calculé sur `ulimit -n` (`Memmax_MB: 0`). On vérifie donc la ligne de commande réelle du process (`Memmax_MB` dans `show info`).

La documentation de HAProxy étant ce qu'elle est, voilà ce que j'ai vu au tout début dans celle-ci. Rien n'indiquant explicitement que cap la mémoire allait faire calculer le maxconn à partir de cette limite.

!!! note "-m parameter HAProxy"
    ```cfg
      -m <limit> : limit the total allocatable memory to <limit> megabytes across
        all processes. This may cause some connection refusals or some slowdowns
        depending on the amount of memory needed for normal operations. This is
        mostly used to force the processes to work in a constrained resource usage
        scenario. It is important to note that the memory is not shared between
        processes, so in a multi-process scenario, this value is first divided by
        global.nbproc before forking.
    ```

Ce texte est encore celui de HAProxy 2.8, avec sa mention de `global.nbproc` qui n'existe plus depuis la 2.5. La doc a été réécrite en 3.0 :

!!! note "-m parameter HAProxy 3.0+"
    ```cfg
      -m <limit> : limit allocatable memory, which is used to keep process's data,
        to <limit> megabytes. This may cause some connection refusals or some
        slowdowns depending on the amount of memory needed for normal operations.
        This is mostly used to force haproxy process to work in a constrained
        resource consumption scenario. It is important to note that the memory is
        not shared between haproxy processes and a child process created via fork()
        system call inherits its parent's resource limits. So, in a master-worker
        mode this memory limit is separately applied to the master and its forked
        worker process.
    ```

Aucune version de la doc n'explique le calcul. Il est dans le code (`set_global_maxconn()` dans `src/limits.c`) : quand `-m` est posé et `maxconn` absent, HAProxy fait `maxconn = mémoire x 0.97 / (coût d'un stream + 2 buffers + coût SSL par côté + 1 handshake SSL)`, arrondi à 2 chiffres significatifs (d'où les 13000 et 65000 bien ronds plus bas). Le `Ulimit-n` suit le maxconn.

Au départ, j'ai alloué une limite de **2500mi** de RAM ce qui nous a donné le comportement suivant :

```bash
/ $  echo "show info" | socat - /var/run/haproxy-runtime-api.sock   | egrep -i 'Ulimit-n|Maxsock|Maxconn|Nbthread|Nbproc'
Nbthread: 4
Nbproc: 1
Process_num: 1
PoolAlloc_MB: 41
Ulimit-n: 34848
Maxsock: 34848
Maxconn: 13000
Hard_maxconn: 13000
MaxConnRate: 778
PoolAlloc_bytes: 43437648
MaxconnReached: 0
```

Étant donné qu'on n'avait que 7 pods, on était sur une limit de 91K connexions simultanées (7 x 13000), pas énorme pour gérer les peaks. Attention, `MaxConnRate` (778 ici) n'est pas une limite : c'est le plus haut débit de connexions par seconde observé sur ce worker depuis son démarrage, il ne dit rien de la capacité. `Nbproc` et `Process_num` sont des champs historiques, toujours à 1.

Avec 12500mi, on a déjà des résultats un peu plus probants :

```bash
/ $  echo "show info" | socat - /var/run/haproxy-runtime-api.sock   | egrep -i 'Ulimit-n|Maxsock|Maxconn|Nbthread|Nbproc'
Nbthread: 4
Nbproc: 1
Process_num: 1
PoolAlloc_MB: 72
Ulimit-n: 130787
Maxsock: 130787
Maxconn: 65000
Hard_maxconn: 65000
MaxConnRate: 1621
PoolAlloc_bytes: 76254512
MaxconnReached: 0
```

65000 maxconn par pod (5x la RAM, 5x le maxconn), déjà un peu mieux pour gérer les peaks. Le `MaxConnRate` à 1621 est juste un pic de trafic vu par ce pod, pas un plafond gagné avec la RAM.

Pour garder la main, on fixe `maxconn` explicitement dans la section `global` plutôt que de le laisser dériver de `-m` : la capacité ne bouge plus au gré d'un changement de limit. Avec `-m` et SSL, HAProxy calcule alors `maxsslconn` sur la mémoire restante, et refuse de démarrer s'il ne reste plus rien pour le SSL :

```cfg
global
  maxconn 65000
```

!!! warning
    Ne pas négliger la mémoire allouée à HAProxy sous peine de surprises. S'assurer aussi que la documentation consultée correspond bien à la version de HAProxy en production.

## Voir aussi

* [HAProxy : performance tuning](performance_tuning.md)
* [Reverse proxy: HAProxy](overview.md)
