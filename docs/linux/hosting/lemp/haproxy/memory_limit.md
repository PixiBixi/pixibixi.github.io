# HAproxy : Comportement d'une limite mémoire

Il y a peu, j'ai observé un comportement assez étonnant avec HAproxy. (mais pas si inattendu quand on y réfléchit)

Déployant des HAproxy sur K8S, j'ai décidé (à mauvais titre) de mettre une limite de RAM pour mieux maitriser le comportement.

La documentation de HAproxy étant ce qu'elle est, voilà ce que j'ai vu au tout début dans celle-ci. Rien n'indiquant explicitement que cap la mémoire allait hardcode le maxconn ou autre paramètre.

??? note "-m parameter HAproxy"
    ```cfg
      -m <limit> : limit the total allocatable memory to <limit> megabytes across
        all processes. This may cause some connection refusals or some slowdowns
        depending on the amount of memory needed for normal operations. This is
        mostly used to force the processes to work in a constrained resource usage
        scenario. It is important to note that the memory is not shared between
        processes, so in a multi-process scenario, this value is first divided by
        global.nbproc before forking.
    ```

Il y a un hic, il s'agissait d'une ancienne documentation HAproxy. En regardant de plus proche une documentation de HAproxy 2.8, j'aurais pu mieux troubleshoot mon probleme

Au départ, j'ai alloué une limite de **2500mi** de RAM ce qui nous a donné le comportement suivant :

```bash
/ $  echo "show info" | socat - /var/run/haproxy-runtime-api.sock   | egrep -i 'Ulimit-n|Maxsock|Maxconn|Nbthread|Nbpr
> oc'
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

Etant donné que je n'avais que 7 pods, nous étions sur une limit de 81K connections mais surtout d'un connrate à la seconde de 5446, pas énorme pour gérer les peaks :)

Avec 12500mi, on a déjà des résultats un peu plus probants :

```bash
/ $  echo "show info" | socat - /var/run/haproxy-runtime-api.sock   | egrep -i 'Ulimit-n|Maxsock|Maxconn|Nbthread|Nbpr
> oc'
Nbthread: 4
Nbproc: 1
Process_num: 1
PoolAhaproxy_frontend_connections_totallloc_MB: 72
Ulimit-n: 130787
Maxsock: 130787
Maxconn: 65000
Hard_maxconn: 65000
MaxConnRate: 1621
PoolAlloc_bytes: 76254512
MaxconnReached: 0
```

65000 maxconn avec un maxconnrate à 1600, déjà un peu mieux pour gérer les peaks.

Conclusion de ce bout de documentation :

* Ne négligez pas la mémoire allouée à HAproxy, vous risqueriez d'avoir des surprises inattendues.
* Soyez sur que la documentation que vous regardez est à jour par rapport à votre version de HAproxy
