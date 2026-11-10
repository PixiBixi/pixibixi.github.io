---
description: Restaurer la base de données système MySQL - recréer la structure initiale après une suppression accidentelle
tested_with:
  - "MySQL 8.4.3"
  - "MariaDB 11.4.4"
tags:
  - MySQL
---

# Restaurer la DB système MySQL

Si par très grosse inadvertance, vous effectuez un *rm -Rf /var/lib/mysql*, on peut recréer les tables système MySQL afin de le faire démarrer. Seules les tables système reviennent (users, grants...) : les bases applicatives sont perdues, seul un backup les restaure.

La commande dépend du moteur. Sur MySQL 8.0 et plus, `mysql_install_db` n'existe plus : c'est `mysqld --initialize-insecure`, sur un datadir vide ou absent (un sous-dossier `mysql/` créé à la main le fait refuser) :

```bash
systemctl stop mysql
mysqld --initialize-insecure --user=mysql
```

`--initialize-insecure` crée `root@localhost` sans mot de passe, à changer dans la foulée. Avec `--initialize` à la place, un mot de passe temporaire est écrit dans le log d'erreur.

Sur MariaDB, l'outil s'appelle `mariadb-install-db` (`mysql_install_db` n'est plus qu'un alias, absent par exemple de l'image Docker `mariadb:11.4`) :

```bash
systemctl stop mariadb
mariadb-install-db --user=mysql --datadir=/var/lib/mysql
```

Puis un `systemctl start mysql` (ou `mariadb`) et il est démarré !

## Voir aussi

* [Gérer ses users MySQL](users.md)
* [MySQL : Commandes avancées](advanced_commands.md)
* [Créer son cluster Galera](galera_gluster.md)
