---
description: Exporter et réimporter les indexes MongoDB avec mongosh — cloner de prod vers staging, migrer entre clusters.
tags:
  - MongoDB
  - Index
---

# MongoDB — Dump et import d'indexes

Pas de commande native `mongodump` pour les indexes seuls. On passe par `mongosh` avec un script JS pour les extraire en JSON, puis on les réinjecte sur la cible.

Cas d'usage typiques : cloner les indexes de prod vers staging, migrer entre clusters, sauvegarder avant une opération destructive.

## Dump des indexes

### Collection unique

```js
// mongosh "mongodb://host:27017/mydb"
const indexes = db.myCollection.getIndexes();
print(JSON.stringify(indexes, null, 2));
```

### Toutes les collections d'une base

```js
// mongosh "mongodb://host:27017/mydb"
const dump = {};
db.getCollectionNames().forEach(collName => {
  dump[collName] = db.getCollection(collName).getIndexes();
});
print(JSON.stringify(dump, null, 2));
```

### Sauvegarder dans un fichier

Le flag `--quiet` supprime la bannière de connexion — sans lui le JSON est invalide.

```bash
mongosh "mongodb://host:27017/mydb" --quiet --eval '
  const dump = {};
  db.getCollectionNames().forEach(collName => {
    dump[collName] = db.getCollection(collName).getIndexes();
  });
  print(JSON.stringify(dump, null, 2));
' > indexes_dump.json
```

## Réimport des indexes

`mongosh` ne supporte pas le module `fs` de Node — on injecte le JSON via une variable shell et `--eval` :

```bash
INDEXES=$(cat /tmp/indexes_dump.json)

mongosh "mongodb://target-host:27017/mydb" --quiet --eval "
  const dump = $INDEXES;
  Object.entries(dump).forEach(([collName, indexes]) => {
    indexes.forEach(idx => {
      if (idx.name === '_id_') return;
      const key = idx.key;
      const opts = { name: idx.name };
      if (idx.unique)                     opts.unique                  = idx.unique;
      if (idx.sparse)                     opts.sparse                  = idx.sparse;
      if (idx.expireAfterSeconds != null) opts.expireAfterSeconds      = idx.expireAfterSeconds;
      if (idx.partialFilterExpression)    opts.partialFilterExpression = idx.partialFilterExpression;
      if (idx.collation)                  opts.collation               = idx.collation;
      if (idx.weights)                    opts.weights                 = idx.weights;
      if (idx['default_language'])        opts['default_language']     = idx['default_language'];
      try {
        db.getCollection(collName).createIndex(key, opts);
        print('[OK] ' + collName + '.' + idx.name);
      } catch(e) {
        print('[SKIP] ' + collName + '.' + idx.name + ' — ' + e.message);
      }
    });
  });
"
```

## Ce qui est préservé (et ce qui est ignoré)

| Propriété | Comportement |
| --------- | ------------ |
| `_id` index | Toujours ignoré — MongoDB le crée automatiquement |
| `unique`, `sparse` | Préservés |
| `expireAfterSeconds` (TTL) | Préservé |
| `partialFilterExpression` | Préservé |
| `collation` | Préservée |
| `weights`, `default_language` (texte) | Préservés |
| Index wildcard (`$**`) | Supporté tel quel |
| Index hashé | Supporté tel quel |
| Conflit d'index existant | Affiche `[SKIP]` et continue sans écraser |

Pour MongoDB Atlas ou une instance avec auth, ajouter `--username --password --authenticationDatabase admin` à la commande `mongosh`.

## Voir aussi

* [Postgres : les commandes qui servent](../postgres/commands.md)
* [MySQL : Commandes avancées](../mysql/advanced_commands.md)

## Exemple complet

```bash
# 1. Dump depuis la source
mongosh "mongodb://source-host:27017/mydb" --quiet --eval '
  const dump = {};
  db.getCollectionNames().forEach(c => { dump[c] = db.getCollection(c).getIndexes(); });
  print(JSON.stringify(dump));
' > /tmp/indexes_dump.json

# 2. Réimport sur la cible
INDEXES=$(cat /tmp/indexes_dump.json)
mongosh "mongodb://target-host:27017/mydb" --quiet --eval "
  const dump = $INDEXES;
  Object.entries(dump).forEach(([collName, indexes]) => {
    indexes.forEach(idx => {
      if (idx.name === '_id_') return;
      const key = idx.key;
      const opts = { name: idx.name };
      if (idx.unique)                     opts.unique                  = idx.unique;
      if (idx.sparse)                     opts.sparse                  = idx.sparse;
      if (idx.expireAfterSeconds != null) opts.expireAfterSeconds      = idx.expireAfterSeconds;
      if (idx.partialFilterExpression)    opts.partialFilterExpression = idx.partialFilterExpression;
      if (idx.collation)                  opts.collation               = idx.collation;
      if (idx.weights)                    opts.weights                 = idx.weights;
      if (idx['default_language'])        opts['default_language']     = idx['default_language'];
      try {
        db.getCollection(collName).createIndex(key, opts);
        print('[OK] ' + collName + '.' + idx.name);
      } catch(e) {
        print('[SKIP] ' + collName + '.' + idx.name + ' — ' + e.message);
      }
    });
  });
"
```
