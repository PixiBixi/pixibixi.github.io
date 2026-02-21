# Gérer ses users MySQL

Quelques trucs basiques pour les users MySQL :

## Créer son user

```sql
-- Mot de passe en clair dans la requête
CREATE USER user@localhost IDENTIFIED BY password;

-- Mot de passe passé sous un algorithme de Hash
SELECT PASSWORD(password); -- Création du Hash du mot de passe
CREATE USER user@localhost IDENTIFIED BY PASSWORD *2470C0C06DEE42FD1618BB9900DFG1E6Y89F4;
```

**Attention**, *localhost* et *127.0.0.1* n'ont pas la même définition
en MySQL. IL faut activer *skip-name-resolve* pour cela

Différentes méthodes d'authentification sont disponibles, par exemple,
**IDENTIFIED VIA unix_socket** nous permettra d'être authentifié via
son compte UNIX.

## Renommer son user

```sql
RENAME USER user@localhost TO user2@localhost;
```

## Changer de password

```sql
SET PASSWORD FOR user@localhost = PASSWORD(newpassword);
```

## Attribution de privilèges

Avant toute opération dattribution de privilèges sur une base de
données, commençons par créer cette dernière.

```sql
CREATE DATABASE `database` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
```

Maintenant, attribuons des privilèges à un utilisateur sur cette base de
données.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON `database`.* TO user@localhost;
```

Si vous voulez attribuer tout les droits sur une base de données à un
utilisateur, il vous suffit deffectuer la requête suivante :

```sql
GRANT ALL ON `database`.* TO user@localhost;
```

Maintenant, pour que les nouveaux droits attribués soient pris en
compte, il est nécessaire de lancer la requête FLUSH.

```sql
FLUSH PRIVILEGES;
```

## Révocation de privilèges

Après avoir attribuer des privilège, révoquons-les. Vous pouvez révoquer
lensemble des droits dun utilisateur avec la requêtes suivante.

```sql
REVOKE ALL PRIVILEGES, GRANT OPTION FROM user@localhost;
```

Vous pouvez également supprimer seulement certains privilèges.

```sql
REVOKE DELETE ON database.* FROM user@localhost;
```

## Suppression Utilisateur

La suppression dun utilisateur MySQL dépend de la version de MySQL. A
partir de la version 5.0.2, la commande suivante suffit à la suppression
de lutilisateur.

```sql
DROP USER user@localhost;
```
