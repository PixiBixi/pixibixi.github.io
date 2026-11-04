---
description: Déployer son cloud personnel avec Nextcloud - installation, configuration occ, tâches de fond, cache APCu et Redis, gros uploads
tags:
  - Nextcloud
---

# Nextcloud, son cloud personnel

Nextcloud est une solution de stockage et de partage de fichiers en ligne. Il s'agit d'un logiciel gratuit écrit en PHP, qui tourne sur MariaDB, PostgreSQL ou MySQL (et accessoirement Redis).

!!! danger
    Nextcloud n'est **pas** une solution de backup. Répliquer ses données sur un autre support de stockage et a minima installer Nextcloud sur un RAID1 pour se prémunir d'une défaillance hardware.

Au moment d'écrire ces lignes, la dernière version stable est la 35, qui demande PHP 8.3 à 8.5. Le [changelog](https://nextcloud.com/changelog/) liste les versions encore maintenues : une version EOL ne reçoit plus de correctifs de sécurité, on ne l'expose pas sur Internet.

## Pré-requis

Nextcloud étant un logiciel écrit en PHP, on a besoin d'une stack LEMP fonctionnelle : [l'article dédié](../web/nginx/installation.md) installe nginx, PHP-FPM et MariaDB sur Debian 13 (PHP 8.4). Nextcloud demande en plus `php-apcu` pour le cache local :

```bash
apt install php-apcu
```

## Installation de Nextcloud

<div class="steps" markdown>

1. Il faut dans un premier temps télécharger l'archive de release. Pas le zip des tags GitHub : c'est le code source brut, sans les dépendances `3rdparty` ni les apps livrées, il ne s'installe pas tel quel.

    ```bash
    cd /var/www
    wget https://download.nextcloud.com/server/releases/latest.zip
    wget https://download.nextcloud.com/server/releases/latest.zip.sha256
    sha256sum -c --ignore-missing latest.zip.sha256
    ```

2. Et on unzip ! L'archive se décompresse dans `/var/www/nextcloud/`.

    ```bash
    unzip latest.zip
    ```

3. Et on fix les privilèges

    ```bash
    sudo chown www-data:www-data /var/www/nextcloud/ -R
    ```

4. On crée la database associée à Nextcloud, en remplaçant `<db_password>` par un vrai mot de passe

    ```bash
    mysql -u root <<-EOF
    CREATE DATABASE nextcloud;
    CREATE USER 'nextcloud'@'localhost' IDENTIFIED BY '<db_password>';
    GRANT ALL PRIVILEGES ON nextcloud.* TO 'nextcloud'@'localhost';
    EOF
    ```

5. Enfin, le vhost nginx adéquat à Nextcloud : la [configuration officielle](https://docs.nextcloud.com/server/latest/admin_manual/installation/nginx.html) est maintenue à jour, on part de celle-ci

6. Une fois tout ceci fait, on se rend sur notre `server_name` et on remplit les infos comme il demande, on a désormais un Nextcloud utilisable

</div>

## Configuration de Nextcloud

Toute la configuration que nous faisons s'effectue via la ligne de commande **occ** pour un gain de temps, il est également possible de tout effectuer via l'interface graphique.

occ dispose désormais d'une auto-completion :

```bash
source <(/var/www/nextcloud/occ _completion --generate-hook)
```

Pour disposer automatiquement de l'auto-completion, nous pouvons ajouter cette commande à notre .bashrc ou .zshrc (ou tout autre shell)

Toutes les options de occ sont disponibles dans la [documentation officielle](https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/occ_command.html).

Voici quelques options particulièrement intéressantes :

* **Numéro de téléphone FR par défaut**

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:set default_phone_region --value="FR"
```

------------------------------------------------------------------------

* **Suppression des fichiers par défaut**

Supprimer les fichiers de `core/skeleton` ne sert à rien : ils font partie du core et reviennent à chaque mise à jour. On vide plutôt `skeletondirectory`, les nouveaux comptes démarrent alors sans aucun fichier :

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:set skeletondirectory --value=""
```

------------------------------------------------------------------------

* **Gestion du stockage externe**

Nous permet de connecter notre Nextcloud à des Samba, FTP ou autre. L'app `files_external` est livrée avec Nextcloud mais désactivée, un `app:enable` suffit :

```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable files_external
```

* **Mise à jour des applications Nextcloud**

```bash
sudo -u www-data php /var/www/nextcloud/occ app:update --all
```

------------------------------------------------------------------------

* **Gestion des tâches de fond**

Sur serveur dédié, il est préférable d'utiliser le système de cron ou de timers systemd. On part sur les timers systemd :

* **Service systemd**

```bash
cat > /etc/systemd/system/nextcloudcron.service << EOF
[Unit]
Description=Nextcloud Cron Job

[Service]
User=www-data
ExecStart=/usr/bin/php -f /var/www/nextcloud/cron.php
EOF
```

* **Timer systemd**

```bash
cat > /etc/systemd/system/nextcloudcron.timer << EOF
[Unit]
Description=Run Nextcloud cron.php every 5 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min
Unit=nextcloudcron.service

[Install]
WantedBy=timers.target
EOF
```

Petit reload de systemd + activation du timer :

```bash
systemctl daemon-reload ; systemctl enable --now nextcloudcron.timer
```

Une fois l'étape côté serveur effectuée, on indique à Nextcloud d'utiliser cette méthode de cron

```bash
sudo -u www-data php /var/www/nextcloud/occ background:cron
```

------------------------------------------------------------------------

* **Chiffrer ses documents**

Si on est parano, il est possible d'activer le chiffrement de tous ses documents. L'app `encryption` est livrée désactivée, on l'active d'abord :

```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable encryption
sudo -u www-data php /var/www/nextcloud/occ encryption:enable
sudo -u www-data php /var/www/nextcloud/occ encryption:encrypt-all
```

Pas besoin de passer en `maintenance:mode` avant : `encryption:encrypt-all` refuse de tourner si le mode maintenance est déjà actif, il l'active et le coupe lui-même.

## Bonus

### Cache APCu et Redis

La doc recommande APCu pour le cache local (le plus rapide, en mémoire partagée de PHP-FPM) et Redis pour le cache distribué et les locks ([plus d'informations](https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/caching_configuration.html)). On configure Redis avec un socket local afin de ne pas exposer un port supplémentaire.

Redis gère aussi les locks de fichiers bien plus efficacement que la base de données ([plus d'informations](https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/files_locking_transactional.html)).

Tout d'abord, on installe les paquets nécessaires

```bash
apt install php-redis redis-server
```

Puis on fait les modifications de configuration de Redis : plus de port TCP, un socket accessible au groupe `redis`, dont `www-data` devient membre.

```bash
usermod -a -G redis www-data
sed -i -E 's/^#? *port +6379$/port 0/' /etc/redis/redis.conf
sed -i -E 's|^#? *unixsocket .*$|unixsocket /run/redis/redis-server.sock|' /etc/redis/redis.conf
sed -i -E 's/^#? *unixsocketperm .*$/unixsocketperm 770/' /etc/redis/redis.conf
```

On n'oublie pas de restart Redis, et PHP-FPM pour qu'il prenne le nouveau groupe :

```bash
systemctl restart redis-server php8.4-fpm
```

`occ` et `cron.php` tournent en CLI, où APCu est désactivé par défaut : Nextcloud y bascule sur un cache vide au lieu de planter, pas besoin du `apc.enable_cli=1` des vieux tutos.

Enfin, on configure tout ça côté Nextcloud avec le fabuleux utilitaire qu'est occ. Le file locking est actif par défaut, il suffit de lui donner Redis comme backend :

```bash
# Redis
sudo -u www-data php /var/www/nextcloud/occ config:system:set redis host --value="/run/redis/redis-server.sock"
sudo -u www-data php /var/www/nextcloud/occ config:system:set redis port --value="0" --type=integer
sudo -u www-data php /var/www/nextcloud/occ config:system:set redis timeout --value="0.0" --type=double

# Local
sudo -u www-data php /var/www/nextcloud/occ config:system:set memcache.local --value="\OC\Memcache\APCu"
# Distributed & Locking
sudo -u www-data php /var/www/nextcloud/occ config:system:set memcache.distributed --value="\OC\Memcache\Redis"
sudo -u www-data php /var/www/nextcloud/occ config:system:set memcache.locking --value="\OC\Memcache\Redis"
```

Les options `redis.session.*` de phpredis (`locking_enabled`, `lock_retries`...) ne concernent que les sessions PHP stockées dans Redis (`session.save_handler = redis`). Elles n'ont aucun lien avec le file locking de Nextcloud, inutile de les toucher ici.

### Edition de documents

Nous pouvons link Nextcloud à OnlyOffice afin de modifier directement les documents docx, odt ou autre format.

```bash
sudo -u www-data php /var/www/nextcloud/occ app:install documentserver_community
sudo -u www-data php /var/www/nextcloud/occ app:install onlyoffice
```

Hopla, 2 petites commandes pour avoir un super nextoffice sur son serveur. Le Community Document Server se configure tout seul si le champ "Document Editing Service address" de l'app onlyoffice est vide. Si l'autoconfiguration échoue, on renseigne `https://<nextcloud_server>/apps/documentserver_community/` dans Paramètres > ONLYOFFICE. Il reste limité (pas de support commercial, pensé pour un petit nombre d'utilisateurs) : au-delà, on passe sur un vrai serveur ONLYOFFICE Docs.

### Upload de gros fichiers

Par défaut, vous ne pourrez pas upload de gros fichiers. Pour cela, il faut modifier des options dans votre pool FPM ainsi que dans nginx.

Pour les options de votre pool FPM (`/etc/php/8.4/fpm/pool.d/www.conf`), ajoutez ceci. La syntaxe `php_value nom valeur` est celle d'Apache, PHP-FPM refuse de démarrer avec :

```ini
php_value[upload_max_filesize] = 16G
php_value[post_max_size] = 16G
```

Côté nginx, dans votre nginx.conf :

```nginx
client_max_body_size 17G;
```

Vous pouvez désormais upload des fichiers jusqu'à 16G
