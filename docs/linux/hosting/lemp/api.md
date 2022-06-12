# HAproxy : Utiliser son API

HAproxy est un puissant load-balancer pouvant être controlé via une API,
je vais noter ici les principales fonctions de son API

``` bash
echo "show stat" | socat stdio /run/haproxy/monitoring.sock | cut -d "," -f 1-2,5-10,34-36 | column -s, -t
# pxname                svname              scur  smax  slim     stot        bin          bout          rate  rate_lim  rate_max
cluster_analytics       custfront1        0     6     119151   117985796   1458531881   2             15
cluster_analytics       custfront2        0     4     54427    36461337    715425308    0             9
cluster_analytics       custfront3        0     9     114021   114945537   1419205852   0             13
cluster_analytics       BACKEND             0     9     3277     287818      269535559    3593163041    2     22
cluster_avatar          avatarpub           0     0     0        0           0            0             0
cluster_avatar          avatarpriv          0     0     0        0           0            0             0
cluster_avatar          BACKEND             0     0     1        0           0            0             0     0
cluster_bo              custbo1           0     11    605      1294617     5522403      0             22
```

On obtient les principales stats de HAproxy (On filtre sur les colonnes
pour garder ce qu'on souhaite)
