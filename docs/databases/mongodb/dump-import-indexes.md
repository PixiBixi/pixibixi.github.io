---
description: Exporter et réimporter les indexes MongoDB avec mongosh - cloner de prod vers staging, migrer entre clusters.
tested_with:
  - "MongoDB 8.0"
  - "mongosh 2.3"
tags:
  - MongoDB
  - Index
---

# MongoDB : dumper et réimporter les indexes seuls

Pas de flag `mongodump` dédié aux indexes seuls. `mongodump` écrit bien les indexes dans les `metadata.json` et `mongorestore` les recrée, mais l'astuce du dump vide ne marche que collection par collection (voir plus bas). Pour une base entière, on passe par `mongosh` avec un script JS pour les extraire en JSON, puis on les réinjecte sur la cible.

On s'en sert pour cloner les indexes de prod vers staging, pour migrer entre clusters ou pour garder une copie avant une opération destructive.

## Dump des indexes

### Collection unique

`getIndexes()` rend la définition complète : une fois retirés `v` et `ns`, c'est déjà le format que prend la commande `createIndexes` en face :

```js
// mongosh "mongodb://host:27017/mydb"
const indexes = db.myCollection.getIndexes();
print(JSON.stringify(indexes, null, 2));
```

### Toutes les collections d'une base

On boucle sur `getCollectionInfos()` filtré sur les vraies collections. `getCollectionNames()` renvoie aussi les views, et `getIndexes()` sur une view lève une erreur qui arrête tout le script. Le filtre sur le nom écarte `system.views` et les autres collections système :

```js
// mongosh "mongodb://host:27017/mydb"
const dump = {};
db.getCollectionInfos({ type: "collection", name: { $not: /^system\./ } }).forEach(({ name }) => {
  dump[name] = db.getCollection(name).getIndexes();
});
print(JSON.stringify(dump, null, 2));
```

### Sauvegarder dans un fichier

Le flag `--quiet` supprime la bannière de connexion - sans lui le JSON est invalide.

```bash
mongosh "mongodb://host:27017/mydb" --quiet --eval '
  const dump = {};
  db.getCollectionInfos({ type: "collection", name: { $not: /^system\./ } }).forEach(({ name }) => {
    dump[name] = db.getCollection(name).getIndexes();
  });
  print(JSON.stringify(dump, null, 2));
' > /tmp/indexes_dump.json
```

## Réimport des indexes

`mongosh` sait charger les modules natifs de Node, dont `fs` : le script lit le dump directement, sans injecter le JSON dans la ligne de commande (limite de taille des arguments, JSON visible dans `ps`). On l'enregistre dans `restore_indexes.js` :

```js
const dump = JSON.parse(require('fs').readFileSync(process.env.DUMP_FILE, 'utf8'));
Object.entries(dump).forEach(([collName, indexes]) => {
  indexes.forEach(({ v, ns, ...spec }) => {
    if (spec.name === '_id_') return;
    try {
      const res = db.runCommand({ createIndexes: collName, indexes: [spec] });
      const status = res.numIndexesBefore === res.numIndexesAfter ? '[EXISTE] ' : '[OK] ';
      print(status + collName + '.' + spec.name);
    } catch (e) {
      print('[ERREUR] ' + collName + '.' + spec.name + ' - ' + e.message);
    }
  });
});
```

Chaque index est rejoué avec sa spec brute (seuls `v` et `ns` sont retirés), via la commande `createIndexes` plutôt que `createIndex(key, opts)` : aucune option n'est perdue. On le lance en passant le chemin du dump en variable d'environnement :

```bash
DUMP_FILE=/tmp/indexes_dump.json mongosh "mongodb://target-host:27017/mydb" --quiet --file restore_indexes.js
```

## Ce qui est préservé (et ce qui est ignoré)

| Propriété | Comportement |
| --------- | ------------ |
| `_id` index | Toujours ignoré - MongoDB le crée automatiquement |
| Views, collections `system.*` | Ignorées au dump |
| Options d'index (`unique`, `sparse`, TTL, `partialFilterExpression`, `collation`, `hidden`...) | Préservées, la spec est rejouée telle quelle |
| Index texte (`weights`, `default_language`) | Préservé |
| Index wildcard (`$**`) et sa `wildcardProjection` | Préservé |
| Index hashé, 2dsphere | Préservés |
| Index identique déjà présent | Affiche `[EXISTE]`, rien n'est modifié |
| Conflit (même nom, options différentes) ou autre erreur | Affiche `[ERREUR]` avec le message du serveur et continue sans écraser |

Pour MongoDB Atlas ou une instance avec auth, ajouter `--username --password --authenticationDatabase admin` à la commande `mongosh`.

## Alternative native, collection par collection

Un `mongodump` avec une query qui ne matche aucun document donne un dump sans données mais avec le `metadata.json`, et `mongorestore` recrée les indexes avec leur spec brute. `--query` exige `--collection` : sans lui, `mongodump` refuse (`cannot dump using a query without a specified collection`).

```bash
mongodump --uri "mongodb://source-host:27017/mydb" --collection myCollection \
  --query '{"_id":{"$exists":false}}' --out /tmp/indexes_only
mongorestore --uri "mongodb://target-host:27017/" /tmp/indexes_only
```

## Exemple complet

Le dump et le réimport enchaînés, en passant par un fichier (avec `restore_indexes.js` de la section précédente) :

```bash
# 1. Dump depuis la source
mongosh "mongodb://source-host:27017/mydb" --quiet --eval '
  const dump = {};
  db.getCollectionInfos({ type: "collection", name: { $not: /^system\./ } }).forEach(({ name }) => {
    dump[name] = db.getCollection(name).getIndexes();
  });
  print(JSON.stringify(dump, null, 2));
' > /tmp/indexes_dump.json

# 2. Réimport sur la cible
DUMP_FILE=/tmp/indexes_dump.json mongosh "mongodb://target-host:27017/mydb" --quiet --file restore_indexes.js
```

## Voir aussi

- [Postgres : les commandes qui servent](../postgres/commands.md)
- [MySQL : Commandes avancées](../mysql/advanced_commands.md)
