# NextCloud, son cloud personnel

![](/linux/selfhost/endtoend-server-nw.png){.align-center width="1000"}

Nextcloud est une solution de stockage et de partage de fichiers en
ligne. Il s'agit d'un logiciel gratuit se basant sur MySQL / PHP (et
accessoirement redis). Attention, si beaucoup d'entre vous se servent
de NextCloud en tant que sauvegarde '"cloud'", il ne faut pas oublier de
répliquer ses données sur un autre support de stockage et à minima
installer NextCloud sur un RAID1 afin de se prémunir d'éventuels
problèmes hardware.

Nous sommes à ce jour à la version 23, vous pouvez consulter le
[changelog](https://nextcloud.com/changelog/)

## Pré-requis

NextCloud étant un logiciel écrit en PHP, nous devons avoir une stack
LAMP fonctionnelle. Pour cela, je vous invite à aller consulter
[l'article
adéquate](https://wiki.jdelgado.fr/doku.php?id=linux:hosting:lemp:installation).

## Installation de NextCloud

Il faut dans un premier temps télécharger nextcloud

```bash
cd /var/www ; wget https://github.com/nextcloud/server/archive/refs/tags/v23.0.3.zip
```

Et on unzip !

```bash
unzip v23.0.3.zip
```

Et on fix les privilèges

```bash
sudo chown www-data:www-data /var/www/nextcloud/ -R
```

On créé la database associée à nextcloud

```sql
mysql -u root <<-EOF
CREATE DATABASE nextcloud;
CREATE USER nextcloud@localhost IDENTIFIED BY mae8WiapaefohLaeb1am;
GRANT ALL PRIVILEGES ON nextcloud.* TO "nextcloud"@"localhost";
FLUSH PRIVILEGES;
EOF
```

(Pensez à modifier le password évidemment)

Enfin, le vhost NGINX adéquate à NextCloud, disponible
[ici](https://paste.jdelgado.fr/?3660056e57032240#d0OxuhjFWsyISwO83uoAjpe8935L/M9Q13STRFvCzzA=)

Une fois tout ceci fait, on se rend sur notre server_name, et on remplit
les infos comme il demande, vous avez désormais un NextCloud utilisable

## Configuration de NextCloud

Toute la configuration que nous faisons s'effectue via la ligne de
commande **occ** pour un gain de temps, il est également possible de
tout effectuer via l'interface graphique.

occ dispose désormais d'une auto-completion :

```bash
source <(/var/www/nextcloud/occ _completion --generate-hook)
```

Pour disposer automatiquement de l'auto-completion, nous pouvons
ajouter cette commande à notre .bashrc ou .zshrc (ou tout autre shell)

Toutes les options de occ sont disponible dans la [documentation
officielle](https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/occ_command.html).

Voici quelques options particulièrement intéressantes :

  * **Numéro de téléphone FR par défaut**

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:set '
default_phone_region --value="FR"
```

------------------------------------------------------------------------

  * '*'*Suppression des fichiers par défaut '*'*

```bash
rm -r "/var/www/nextcloud/core/skeleton/Documents/"
rm -r "/var/www/nextcloud/core/skeleton/Photos/"
rm "/var/www/nextcloud/core/skeleton/Nextcloud intro.mp4"
rm "/var/www/nextcloud/core/skeleton/Nextcloud.png"
```

------------------------------------------------------------------------

  * '*'*Gestion du stockage externe '*'*

Nous permet de connecter notre NextCloud à des Samba, FTP ou autre

```bash
sudo -u www-data php /var/www/nextcloud/occ app:install files_external
sudo -u www-data php /var/www/nextcloud/occ app:enable files_external
```

  * '*'*Mise à jour des applications NextCloud '*'*

```bash
sudo -u www-data php /var/www/nextcloud/occ app:update --all
```

------------------------------------------------------------------------

  * '*'*Gestion des tâches de fond '*'*

Sur serveur dédié, il est préférable d'utiliser le system de cron ou de
timers systemd. Comme nous sommes en 2022, nous allons utiliser les
timers systemd :

'*'* -'> Service systemd'*'*

```bash
cat > /etc/systemd/system/nextcloudcron.service << EOF
[Unit]
Description=Nextcloud Cron Job

[Service]
User=www-data
ExecStart=/usr/bin/php -f /var/www/owncloud/cron.php
EOF
```

**-'> Timer systemd**

```bash
cat > /etc/systemd/system/nextcloudcron.timer << EOF
[Unit]
Description=Run Nextcloud cron.php every minute

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
Unit=nextcloudcron.service

[Install]
WantedBy=timers.target
EOF
```

Petit reload de systemd + activation du timer :

```bash
systemctl daemon-reload ; systemctl enable --now nextcloudcron.timer
```

Une fois l'étape côté serveur effectué, on va indiquer à NextCloud
d'utiliser cette méthode de cron

```bash
sudo -u www-data php occ background:cron
```

------------------------------------------------------------------------

  * **Chiffrer ses documents**

Si vous êtes paranos, il est possible d'activer le chiffrement de tous
vos documents :

```bash
sudo -u www-data php occ maintenance:mode --on
sudo -u www-data php occ encryption:enable
sudo -u www-data php occ occ encryption:encrypt-all
sudo -u www-data php occ maintenance:mode --off
```

# Bonus

### Installation de redis

Redis vous permettra l'optimisation des performances de votre NextCloud
via la mise en cache de quelques éléments. Nous allons configurer Redis
avec un socket local afin de ne pas exposer un port supplémentaire,
nécessitants quelques modifications.

Redis va également nous permettre de gérer plus efficacement les locks
de manière plus optimisée ([plus
d'informations](https://docs.nextcloud.com/server/15/admin_manual/configuration_files/files_locking_transactional.html))

Tout d'abord, nous allons installer les paquets nécessaires

```bash
apt install php-redis redis-server
```

Puis nous faisons les modifications de configuration de Redis

```bash
usermod -a -G redis www-data
sed -i -e "s/^#* *port +*6379$/port 0/g" /etc/redis/redis.conf
sed -i -e "s/^#* *unixsocket +*.*$/unixsocket '/var'/run'/redis'/redis-server.sock/g" /etc/redis/redis.conf
sed -i -e "s/^#* *unixsocketperm+*.*$/unixsocketperm 770/g" /etc/redis/redis.conf
```

Comme nous allons également utiliser redis pour le locking, nous devons
activer le session locking côté PHP, sans quoi, notre locking n'aura
aucun intérêt :

```bash
cat >> /etc/php/7.4/fpm/conf.d/20-redis.ini << EOF
redis.session.locking_enabled=1
redis.session.lock_retries=-1
redis.session.lock_wait_time=10000
EOF
```

On n'oublie pas de restart redis :

```bash
systemctl restart redis-server
```

Enfin, on configure tout ça côté NextCloud avec le fabuleux utilitaire
qu'est occ

```bash
# Filelocking
sudo -u www-data php /var/www/nextcloud/occ config:system:set filelocking.enabled --value="true"

# Redis
sudo -u www-data php /var/www/nextcloud/occ config:system:set redis host --value="/var/run/redis/redis-server.sock"
sudo -u www-data php /var/www/nextcloud/occ config:system:set redis port --value="0"
sudo -u www-data php /var/www/nextcloud/occ config:system:set redis timeout --value="0.0"

# Memcahed distributed
sudo -u www-data php /var/www/nextcloud/occ config:system:set memcache.distributed --value="'OC'Memcache'Redis"
# Locking & Local
sudo -u www-data php /var/www/nextcloud/occ config:system:set memcache.local --value="'OC'Memcache'Redis"
sudo -u www-data php /var/www/nextcloud/occ config:system:set memcache.locking --value="'OC'Memcach
```

### Edition de documents

Nous pouvons link NextCloud à OnlyOffice afin de modifier directement
les documents docx odt ou autre format.

```bash
sudo -u www-data php /var/www/nextcloud/occ app:install documentserver_community
sudo -u www-data php /var/www/nextcloud/occ app:install onlyoffice
```

Hopla, 2 petites commandes pour avoir un super nextoffice sur son
serveur

### Upload de gros fichiers

Par défaut, vous ne pourrez pas upload de gros fichiers. Pour cela, il
faut modifier des options dans votre pool FPM ainsi que dans NGINX.

Pour les options de votre pool FPM, ajoutez ceci :

```php
php_value upload_max_filesize 16G
php_value post_max_size 16G
```

Côté NGINX, dans votre nginx.conf :

```nginx
client_max_body_size 17G;
```

Vous pouvez désormais upload des fichiers jusqu'à 16G
