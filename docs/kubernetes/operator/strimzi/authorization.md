---
description: "Kafka authorization sur Strimzi : simple authorizer, KafkaUser et ACLs, piège allow.everyone.if.no.acl.found, superUsers, authentification des listeners (SCRAM, TLS) et credentials MirrorMaker 2."
tags:
  - Strimzi
  - Kafka
  - Security
---

# Kafka authorization sur Strimzi : ACLs, superUsers, listeners et deny-by-default

Sur un cluster Kafka partagé, `allow.everyone.if.no.acl.found: "true"` donne l'impression d'avoir une authorization alors que tout topic sans ACL reste ouvert à n'importe quel client, y compris anonyme. Cet article montre comment passer en deny-by-default sans casser les clients existants, MirrorMaker 2 compris. Il part de ce que le flag autorise vraiment et de la façon dont l'authentification des listeners fixe le principal que voit l'authorizer, puis déroule la bascule avec Strimzi.

## Activer l'authorization simple

Avec `authorization.type: simple`, Strimzi écrit `authorizer.class.name=org.apache.kafka.metadata.authorizer.StandardAuthorizer` dans la config des brokers. C'est l'authorizer natif de Kafka en KRaft (les anciennes versions sur ZooKeeper en utilisaient un autre). Les ACLs sont stockées dans les métadonnées du cluster et pilotées par le User Operator à partir des ressources `KafkaUser`.

Le bloc suivant active l'authorizer et déclare 2 super users.

```yaml
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: my-cluster
  namespace: my-namespace
spec:
  kafka:
    authorization:
      type: simple
      superUsers:
        - CN=ops-admin
        - platform-admin
```

Les `superUsers` contournent les ACLs, donc la liste doit rester très courte. Strimzi préfixe chaque entrée par `User:` et y ajoute lui-même les principals de ses composants internes (brokers, Entity Operator, Kafka Exporter, Cruise Control et cluster operator). Ils prennent la forme `CN=<composant>,O=io.strimzi` pour du TLS ou celle d'un service account Kubernetes sinon. Il n'y a donc rien à déclarer pour que le cluster fonctionne.

!!! warning "Authentification interne désactivée"
    Si l'authentification interne du cluster est à `none`, les composants se connectent avec le principal `ANONYMOUS`. Activer l'authorization oblige alors à déclarer `ANONYMOUS` en super user, ce qui ouvre tout accès passant par un listener sans authentification ([doc Strimzi](https://strimzi.io/docs/operators/latest/configuring.html#con-internal-cluster-security-str)).

## Le listener décide du principal

L'authorizer ne voit que le principal que le listener a établi. Chaque listener déclare son authentification dans `spec.kafka.listeners[].authentication` (types `tls`, `scram-sha-512` ou `custom`) et un listener sans bloc `authentication` laisse tout le monde entrer sous `ANONYMOUS`.

Voici un cluster qui expose les 3 cas.

```yaml
spec:
  kafka:
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: scram
        port: 9093
        type: internal
        tls: true
        authentication:
          type: scram-sha-512
      - name: mtls
        port: 9094
        type: internal
        tls: true
        authentication:
          type: tls
```

Le listener `plain` donne `ANONYMOUS` à tout client qui se connecte, `scram` donne `User:<nom du KafkaUser>` après un login SCRAM et `mtls` donne `User:CN=<nom du KafkaUser>` d'après le certificat client. Les 2 dernières formes sont aussi celles qu'on écrit dans `superUsers` (`platform-admin` d'un côté, `CN=ops-admin` de l'autre).

Un listener non authentifié est le vrai problème d'un cluster partagé. Tant qu'il existe, toute ACL écrite pour un `KafkaUser` ne protège que les ressources que le principal `ANONYMOUS` n'a pas le droit de toucher.

## Ce que allow.everyone.if.no.acl.found autorise vraiment

Le flag est à `false` quand il est absent. À `true`, il change le résultat par défaut de l'authorizer, mais pas pour toutes les requêtes : ce verdict par défaut ne s'applique que lorsqu'**aucune ACL n'existe sur la ressource** (une ACL de préfixe ou un wildcard `*` qui couvre le topic compte aussi), quel que soit le principal ou l'opération visés. Dès qu'une ACL existe sur un topic, y compris pour un autre utilisateur, les principals qui ne matchent aucune règle sont refusés.

La [doc Apache Kafka](https://kafka.apache.org/documentation/#security_authz) le décrit comme un réglage de développement, de test ou de migration par phases et recommande `false` en production. Les conséquences sur un cluster partagé :

- tout topic créé sans `KafkaUser` ni ACL associée est lisible, écrivable et supprimable par n'importe quel principal, `ANONYMOUS` compris
- les groups de consumers et les `transactionalId` suivent la même règle, donc un client anonyme peut lire en tant que n'importe quel group sans ACL
- un topic protégé aujourd'hui redevient ouvert le jour où on supprime sa dernière ACL (un `KafkaUser` supprimé emporte ses ACLs)
- chaque nouveau topic démarre ouvert et l'ACL s'écrit après coup

Le cas qui a motivé cet article est typique. Le chart qui déploie le `Kafka` active toujours l'authorization simple, mais les clients historiques se connectent en anonyme sur un listener `plain`. Sans `KafkaUser` il n'y a aucune ACL, donc le flag est mis à `true` pour ne rien casser, avec un commentaire « à retirer quand les clients passent en SCRAM ».

Dans le chart, la config ressemble à ceci.

```yaml
config:
  # Temporaire : clients anonymes sur plain, aucune ACL. A retirer quand ils utilisent SCRAM.
  allow.everyone.if.no.acl.found: "true"
```

C'est une dette de sécurité assumée, qu'un scanner de diff remonte à chaque fois comme un contournement d'authorization. Il faut la traiter comme telle, avec un ticket, un propriétaire et une date.

## Inventorier avant de basculer

Passer le flag à `false` d'un coup refuse toute requête sans ACL, donc tous les clients anonymes en même temps. L'inventaire se fait sur l'état réel et pas sur ce que les équipes déclarent.

L'authorizer logue chaque décision sur le logger `kafka.authorizer.logger`. Pour les requêtes explicites, les refus sortent en `INFO` et les autorisations seulement en `DEBUG` (le reste passe en `TRACE`). Le fichier de logging par défaut de Strimzi met ce logger à `INFO`, donc pour voir qui passe grâce au flag on le monte en `DEBUG` sur les brokers le temps de la collecte.

```yaml
spec:
  kafka:
    logging:
      type: inline
      loggers:
        logger.authorizer.level: DEBUG
```

Chaque ligne contient le principal, l'opération, l'host source et la ressource. Un extrait des logs d'un broker donne la liste des tuples dont on a besoin.

```console
$ kubectl logs -n my-namespace my-cluster-broker-0 | rg 'Principal = User:ANONYMOUS is Allowed' | head -3
Principal = User:ANONYMOUS is Allowed operation = WRITE from host = 10.1.2.3 on resource = Topic:LITERAL:events-raw for request = PRODUCE with resourceRefCount = 1 based on rule DefaultAllow
```

La règle `DefaultAllow` est la signature : cet accès n'existe que grâce au flag. Pour chaque ligne de ce type on retient 3 choses : le topic ou le group, l'opération (produce, fetch, group join) et l'host source, qui permet de remonter à l'équipe propriétaire. La collecte doit couvrir les jobs batch et les clients mensuels, pas une heure creuse.

Le `DEBUG` est verbeux sur un cluster chargé : on le garde le temps de la collecte, puis on le remet à `INFO`.

## KafkaUser et ACLs

Un `KafkaUser` porte l'authentification du client (`scram-sha-512`, `tls` ou `tls-external`) et ses règles `authorization.acls`. Chaque règle vise une ressource (`topic`, `group`, `cluster` ou `transactionalId`) en `literal` ou en `prefix`, avec une liste d'opérations, un `type` `allow` (défaut) ou `deny` et un `host` qui vaut `*` par défaut. Les opérations supportées sont `Read`, `Write`, `Create`, `Delete`, `Alter`, `Describe`, `ClusterAction`, `AlterConfigs`, `DescribeConfigs`, `IdempotentWrite` et `All`.

Ce `KafkaUser` lit tous les topics préfixés par `events-` avec le group `events-consumer`.

```yaml
apiVersion: kafka.strimzi.io/v1
kind: KafkaUser
metadata:
  name: events-consumer
  namespace: my-namespace
  labels:
    strimzi.io/cluster: my-cluster
spec:
  authentication:
    type: scram-sha-512
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: events-
          patternType: prefix
        operations: [Read, Describe]
      - resource:
          type: group
          name: events-consumer
          patternType: literal
        operations: [Read]
```

Un consumer a besoin de `Read` sur le topic et sur son group. Un producer a besoin de `Write` sur le topic, qui implique déjà `Describe`. Un `deny` l'emporte sur tous les `allow` qui matchent, puisque la recherche s'arrête au premier `deny` trouvé.

Pour un `scram-sha-512`, le User Operator crée un `Secret` du même nom que le `KafkaUser`, avec le mot de passe dans la clé `password` ([doc Strimzi](https://strimzi.io/docs/operators/latest/configuring.html#con-securing-client-authentication-str)). Les équipes montent ce Secret dans leurs pods au lieu de recopier un mot de passe dans un values.

Un `KafkaUser` ne rend pas un client anonyme obsolète tout seul : tant que le listener `plain` existe, l'ancien client passe encore par `ANONYMOUS`. Ce que la bascule change, c'est que l'ACL sur le topic protège enfin contre lui.

## Basculer en deny-by-default

Chaque étape est réversible tant que le flag est encore à `true`, mais l'ordre compte.

1. Inventorier les tuples (principal, topic ou group, opération) comme ci-dessus.
2. Créer un `KafkaUser` par client ou par équipe avec les ACLs minimales correspondantes. Dès qu'une ACL existe sur un topic, les clients anonymes y perdent l'accès, donc on commence par les topics dont on connaît la liste complète des clients.
3. Migrer chaque client vers le listener authentifié (`scram` ou `mtls`) avec son Secret, puis vérifier dans les logs qu'il n'apparaît plus en `ANONYMOUS`.
4. Quand plus aucune ligne `DefaultAllow` ne sort pendant une période représentative, retirer le flag. Les brokers redémarrent en rolling update.
5. Retirer le listener `plain` ou lui ajouter une `authentication`, pour qu'`ANONYMOUS` ne soit plus un principal possible.

Le rollback consiste à remettre le flag à `true`, ce qui rouvre uniquement les ressources sans ACL. Un client qui échoue après la bascule affiche `TopicAuthorizationException` ou `GroupAuthorizationException`. Le refus correspondant est dans les logs de l'authorizer au niveau `INFO`, donc visible même sans `DEBUG`.

!!! warning "Un topic sans ACL est fermé, pas ouvert"
    Une fois le flag retiré, un nouveau topic n'est accessible qu'aux super users tant qu'on n'a pas écrit une ACL. Les topics créés par un outil ou un job doivent passer par le même chart que leur `KafkaUser`.

## Donner à MirrorMaker 2 ses credentials

MirrorMaker 2 se connecte à chaque cluster avec des credentials qui doivent exister dans un Secret. Le cluster cible se déclare dans `spec.target` et chaque cluster source dans `spec.mirrors[].source`. Les 2 portent `alias`, `bootstrapServers`, `tls` et `authentication`. L'authentification référence le mot de passe par `passwordSecret` (`secretName` et le nom de la clé `password`). Le `target` exige en plus le `groupId` et les 3 topics internes de Kafka Connect.

Cet exemple réplique un cluster source distant vers le cluster local.

```yaml
apiVersion: kafka.strimzi.io/v1
kind: KafkaMirrorMaker2
metadata:
  name: my-mirror
  namespace: my-namespace
spec:
  target:
    alias: target
    bootstrapServers: my-cluster-kafka-bootstrap:9093
    groupId: my-mirror
    configStorageTopic: my-mirror-config
    offsetStorageTopic: my-mirror-offset
    statusStorageTopic: my-mirror-status
    tls:
      trustedCertificates:
        - secretName: my-cluster-cluster-ca-cert
          pattern: "*.crt"
    authentication:
      type: scram-sha-512
      username: mirror-target
      passwordSecret:
        secretName: mirror-target
        password: password
  mirrors:
    - source:
        alias: source
        bootstrapServers: source-kafka-bootstrap.other-namespace.svc:9093
        tls:
          trustedCertificates:
            - secretName: source-cluster-ca-cert
              pattern: "*.crt"
        authentication:
          type: scram-sha-512
          username: mirror-source
          passwordSecret:
            secretName: mirror-source-credentials
            password: password
      topicsPattern: ".*"
      groupsPattern: ".*"
```

Pour le cluster local géré par Strimzi, on réutilise le Secret généré par le `KafkaUser` (`mirror-target` ici). Pour un cluster distant, personne ne génère le Secret : il doit être créé à côté, sans jamais passer en clair dans le repo. Un chart générique de Secrets alimenté par un External Secrets (voir [le suivi de la synchronisation des ExternalSecrets](../external-secrets/sync_alerting.md)) évite de recopier le mot de passe et le fait tourner avec sa source.

Chaque côté a besoin de ses propres ACLs. Il faut au minimum de la lecture sur le cluster source, ainsi que de l'écriture et de la création de topics sur le cluster cible, topics internes de MirrorMaker 2 compris. La liste exacte dépend des connectors activés, donc on la tire du même inventaire en `DEBUG` en laissant MirrorMaker 2 tourner.

Le piège est de créer les ACLs d'un cluster et d'oublier l'autre. MirrorMaker 2 passe alors de « ça réplique » à `TopicAuthorizationException` sur le cluster dont on a retiré le flag, parce que c'est son `ANONYMOUS` qui était autorisé jusque-là.

## Vérifier l'état final

Une fois le flag retiré, 3 contrôles confirment que le cluster est fermé. Les 2 premiers se lisent sur la ressource `Kafka`.

```console
$ kubectl get kafka my-cluster -n my-namespace -o jsonpath='{.spec.kafka.config.allow\.everyone\.if\.no\.acl\.found}'

$ kubectl get kafka my-cluster -n my-namespace -o jsonpath='{range .spec.kafka.listeners[*]}{.name}{" "}{.authentication.type}{"\n"}{end}'
scram scram-sha-512
mtls tls
```

La première commande ne doit rien renvoyer et la seconde ne doit lister aucun listener sans type d'authentification. Le 3e contrôle est dans les logs de l'authorizer, qui ne doivent plus contenir `DefaultAllow`. Les alertes sur l'état des `KafkaUser` et des brokers sont décrites dans [l'article sur l'alerting Strimzi](alerting.md).
