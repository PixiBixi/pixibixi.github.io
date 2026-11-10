---
description: Mettre à jour PostgreSQL vers une nouvelle version majeure avec pg_upgrade - migration des données et configuration
tags:
  - PostgreSQL
tested_with:
  - "PostgreSQL 17 vers 18 (Debian 13, paquets PGDG)"
variables:
  - name: old
    default: "17"
  - name: new
    default: "18"
---

# Upgrade sa version de PostgreSQL

Upgrade PostreSQL, c'est vraiment une plaie. Petit tuto du coup sur
comment faire.

<div class="steps" markdown>

1. Il faut installer les 2 versions de postgresql et stop les 2, puis
    passer sur l'utilisateur postgres

    ```bash
    su - postgres
    ```

    Sur Debian, le paquet de la nouvelle version crée un cluster vide sur le port 5433, puisque l'ancien occupe déjà 5432. Depuis PostgreSQL 18, `initdb` active les data checksums par défaut : si l'ancien cluster n'en a pas, `pg_upgrade --check` s'arrête sur `old cluster does not use data checksums but the new one does`. On recrée alors le nouveau cluster sans checksums (en root) :

    ```bash
    pg_dropcluster <new> main
    pg_createcluster <new> main -- --no-data-checksums
    ```

2. Puis on exporte les variables d'environnement qui vont bien. Par
    exemple pour une upgrade de 17 à 18 :

    ```bash
    export PGDATAOLD=/var/lib/postgresql/<old>/main
    export PGDATANEW=/var/lib/postgresql/<new>/main
    export PGBINOLD=/usr/lib/postgresql/<old>/bin/
    export PGBINNEW=/usr/lib/postgresql/<new>/bin/
    ```

3. Puis on passe pg_upgrade avec l'option **--check** afin de ne pas appliquer les modifications. Sur Debian, `postgresql.conf` est dans `/etc` et pas dans le data directory, donc on le passe à chaque `postgres` avec `-c config_file=...`, entre quotes. On met aussi le mode qu'on utilisera pour de vrai (ici `--link`, voir l'étape suivante) : `--check` ne fait les contrôles propres au mode que s'il est présent.

    ```bash
    /usr/lib/postgresql/<new>/bin/pg_upgrade --check --link \
      --old-options '-c config_file=/etc/postgresql/<old>/main/postgresql.conf' \
      --new-options '-c config_file=/etc/postgresql/<new>/main/postgresql.conf'
    ```

    !!! warning "Note"
        Il est important d'utiliser le fullpath pour la commande `pg_upgrade`, sous peine que le mauvais `pg_upgrade` soit sélectionné.

4. Si tout est OK, repassez la commande en supprimant **--check**. `--jobs=N` parallélise la copie ou le link sur plusieurs CPU.

    !!! warning "Données"
        Par défaut, les données sont copiées, l'ancien cluster reste intact et on peut y revenir. Avec `--link` (ou `-k`), les fichiers sont partagés par hard links : c'est quasi instantané, mais dès que le nouveau cluster a démarré, l'ancien n'est plus utilisable et le rollback n'est plus possible. `--clone` (PostgreSQL 12+, reflinks, sur XFS ou Btrfs par exemple) est aussi rapide que `--link` en laissant l'ancien cluster intact.

5. Enfin, on pense à modifier la configuration de la nouvelle version de postgresql afin d'écouter sur le bon port (5432 au lieu de 5433), puis on démarre le nouveau cluster. L'ancien reste configuré sur 5432 : on ne le redémarre plus, surtout après un `--link`.

    ```bash
    sed -i "s/5433/5432/g" /etc/postgresql/<new>/main/postgresql.conf
    ```

6. Les statistiques de l'optimiseur sont transférées par pg_upgrade depuis PostgreSQL 18 (`--no-statistics` pour s'en passer), mais pas toutes. On complète, toujours en tant que postgres, avant de remettre la prod dessus. `--missing-stats-only` n'existe que depuis PostgreSQL 18 : avant, on lance seulement `vacuumdb --all --analyze-in-stages`.

    ```bash
    /usr/lib/postgresql/<new>/bin/vacuumdb --all --analyze-in-stages --missing-stats-only
    /usr/lib/postgresql/<new>/bin/vacuumdb --all --analyze-only
    ```

7. Enfin, une fois le nouveau cluster validé, on clean l'ancienne configuration, toujours en tant que postgres. `analyze_new_cluster.sh` n'est plus généré depuis PostgreSQL 14, seul `delete_old_cluster.sh` reste, et il est irréversible :

    ```bash
    cd && ./delete_old_cluster.sh
    ```

    Puis on supprime tout ce qui concerne l'ancienne version de postgresql (`pg_dropcluster 17 main` pour la config dans `/etc`, puis les paquets).

</div>

Sur Debian, `pg_upgradecluster 17 main` fait tout ça d'un coup (ports, config, upgrade), c'est l'alternative la plus simple si on n'a pas besoin de contrôler chaque étape.

## Voir aussi

* [Postgres : les commandes qui servent](commands.md)
* [PostgreSQL Replication](postgresql_replication.md)
