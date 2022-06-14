# Upgrade sa version de PostgreSQL

Upgrade PostreSQL, c'est vraiment une plaie. Petit tuto du coup sur
comment faire.

Il faut installer les 2 versions de postgresql et stop les 2, puis
passer sur l'utilisateur postgres

``` bash
su - postgres
```

Puis on exporte les variables d'environnement qui vont bien. Par
exemple pour une upgrade de 11 à 13 :

``` bash
export PGDATAOLD=/var/lib/postgresql/11/main
export PGDATANEW=/var/lib/postgresql/13/main
export PGBINOLD=/usr/lib/postgresql/11/bin/
export PGBINNEW=/usr/lib/postgresql/13/bin/
```

Puis on passe pg_upgrade avec l'option **'--check** afin de ne pas
appliquer les modifications

``` bash
/usr/lib/postgresql/13/bin/pg_upgrade --check --old-options -config_file=/etc/postgresql/11/main/postgresql.conf --new-options -config_file=/etc/postgresql/13/main/postgresql.conf
```

!!! warning "Note"
Il est important d'utiliserl le fullpath pour la commande pg_ugprade, sous peine que le mauvais pg_upgrade soit sélectionné

Si tout est OK, repassez la commande en supprimant **'--check**.

Enfin, on pense à modifier la configuration de la nouvelle version de
postgresql afin d'écouter sur le bon port :

``` bash
sed -i "s/5433/5432/g" /etc/postgresql/13/main/postgresql.conf
```

Enfin, on clean l'ancienne configuration, toujours en tant que postgres
:

``` bash
cd ; ./analyze_new_cluster.sh ; ./delete_old_cluster.sh
```

Puis on supprime tout ce qui concerne l'ancienne version de postgresql
