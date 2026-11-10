---
description: Générer des requêtes INSERT INTO depuis une sélection MySQL avec mysqldump pour extraire des lignes filtrées
tags:
  - MySQL
---

# Générer des INSERT INTO depuis un SELECT

Une commande est vraiment magique avec mysqldump et permet de générer
des INSERT INTO depuis un WHERE assez simple

```bash
mysqldump -t DB Table --where="champ in (280, 172);" > ~/Req.sql
```

Cet SQL dump va simplement générer les INSERT INTO selon la condition que
nous lui avons donnée, MAGIQUE !

Par défaut (`--extended-insert`, inclus dans `--opt`), on obtient un seul INSERT multi-lignes entouré de `LOCK TABLES` / `UNLOCK TABLES` et des `DISABLE KEYS` :

```sql
LOCK TABLES `Table` WRITE;
INSERT INTO `Table` VALUES (1,280,'a'),(2,172,'b');
UNLOCK TABLES;
```

Pour avoir un INSERT par ligne avec le nom des colonnes, plus facile à relire ou à rejouer sur une table au schéma différent, on ajoute `--skip-extended-insert --complete-insert`. `--compact` retire en plus les locks, les commentaires et les `SET` :

```bash
mysqldump -t --skip-extended-insert --complete-insert --compact DB Table --where="champ in (280, 172)" > ~/Req.sql
```

Sans le privilège `PROCESS`, mysqldump affiche `Access denied; you need (at least one of) the PROCESS privilege(s)` en essayant de dumper les tablespaces (le dump des lignes se fait quand même) : on ajoute `--no-tablespaces`.

## Voir aussi

* [MySQL : Commandes avancées](../advanced_commands.md)
* [Debug d'une réplication primaire/réplica](replication_slave.md)
