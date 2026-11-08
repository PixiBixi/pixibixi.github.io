---
description: "Gérer les comptes utilisateurs MySQL et MariaDB : créer, renommer, changer le mot de passe, authentification socket, privilèges et révocation"
tags:
  - MySQL
  - MariaDB
tested_with:
  - "MySQL 8.4"
  - "MariaDB 11.8"
---

# Gérer ses users MySQL

Quelques trucs basiques pour les users MySQL. Les commandes marchent sur MySQL 8.4 et MariaDB, sauf mention contraire : les 2 ont divergé sur les mots de passe et l'authentification.

## Créer son user

Le mot de passe est une chaîne, donc entre quotes :

```sql
CREATE USER 'user'@'localhost' IDENTIFIED BY 'password';
```

Sur MySQL 8.4, le compte prend `caching_sha2_password`. `mysql_native_password` est désactivé par défaut depuis la 8.4 et disparaît en 9.x, on n'en dépend plus.

Pour recréer un compte sans connaître son mot de passe (migration vers un autre serveur), on reprend le hash existant :

```sql
-- MySQL : le hash sort en hexa, la ligne se recopie telle quelle sur l'autre serveur
SET print_identified_with_as_hex = ON;
SHOW CREATE USER 'user'@'localhost';
-- CREATE USER `user`@`localhost` IDENTIFIED WITH 'caching_sha2_password' AS 0x2441... REQUIRE NONE ...

-- MariaDB : PASSWORD() et IDENTIFIED BY PASSWORD existent encore
SELECT PASSWORD('password');
CREATE USER 'user'@'localhost' IDENTIFIED BY PASSWORD '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19';
```

`PASSWORD()` et `IDENTIFIED BY PASSWORD` ont été supprimés de MySQL en 8.0.11.

!!! warning "localhost n'est pas 127.0.0.1"
    `'user'@'localhost'` correspond aux connexions par socket Unix (`mysql -h localhost` ou sans `-h`). Une connexion TCP `mysql -h 127.0.0.1` arrive en `'user'@'127.0.0.1'` et se fait refuser si seul le compte `localhost` existe : pour une appli qui se connecte en TCP, on crée aussi `'user'@'127.0.0.1'`.

### Authentification par socket

Le compte s'authentifie avec l'utilisateur Unix qui lance le client, sans mot de passe. La syntaxe diffère :

```sql
-- MariaDB
CREATE USER 'backup'@'localhost' IDENTIFIED VIA unix_socket;

-- MySQL : le plugin n'est pas chargé dans les builds officiels
INSTALL PLUGIN auth_socket SONAME 'auth_socket.so';
CREATE USER 'backup'@'localhost' IDENTIFIED WITH auth_socket;
```

## Renommer son user

```sql
RENAME USER 'user'@'localhost' TO 'user2'@'localhost';
```

## Changer de password

```sql
ALTER USER 'user'@'localhost' IDENTIFIED BY 'newpassword';
```

`SET PASSWORD ... = PASSWORD('...')` ne marche plus que sur MariaDB.

## Attribution de privilèges

Avant toute opération d'attribution de privilèges sur une base de données, on crée cette dernière. `utf8` est un alias de `utf8mb3`, déprécié : on prend `utf8mb4`, sa collation par défaut suffit (`utf8mb4_0900_ai_ci` sur MySQL 8, `utf8mb4_uca1400_ai_ci` sur MariaDB 11). `database` est un mot réservé, d'où les backticks :

```sql
CREATE DATABASE `database` DEFAULT CHARACTER SET utf8mb4;
```

On attribue ensuite des privilèges à un utilisateur sur cette base :

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON `database`.* TO 'user'@'localhost';
```

Pour tous les droits sur une base de données :

```sql
GRANT ALL ON `database`.* TO 'user'@'localhost';
```

Pas besoin de `FLUSH PRIVILEGES` : `GRANT`, `REVOKE`, `CREATE USER` et `ALTER USER` rechargent eux-mêmes les droits. Il ne sert qu'après un `INSERT` ou `UPDATE` à la main dans les tables `mysql.*`.

On vérifie le résultat :

```sql
SHOW GRANTS FOR 'user'@'localhost';
```

`GRANT` ne crée plus de compte sur MySQL 8 (`ERROR 1410`) : on passe d'abord par `CREATE USER`.

## Révocation de privilèges

On révoque l'ensemble des droits d'un utilisateur avec la requête suivante :

```sql
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'user'@'localhost';
```

Ou seulement certains privilèges :

```sql
REVOKE DELETE ON `database`.* FROM 'user'@'localhost';
```

## Suppression Utilisateur

```sql
DROP USER 'user'@'localhost';
```

## Voir aussi

- [MySQL : Commandes avancées](advanced_commands.md)
- [Créer son cluster Galera](galera_gluster.md)
