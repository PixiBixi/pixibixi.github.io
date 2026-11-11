---
article: docs/kubernetes/operator/strimzi/authorization.md
checked: '2026-11-11'
commit: 32ecac1bdb1b36ced25900cdec85ee9c7e1d217c
sources:
- repo: strimzi-kafka-operator
  path: cluster-operator/src/main/java/io/strimzi/operator/cluster/model/KafkaBrokerConfigurationBuilder.java
  lines: 567-630
  ref: 1.3.1
  commit: 555c3e0f07c203911bc3cb7d13ac085bfaa81b50
- repo: strimzi-kafka-operator
  path: cluster-operator/src/main/resources/default-logging/KafkaCluster.properties
  lines: 55-59
  ref: 1.3.1
  commit: 555c3e0f07c203911bc3cb7d13ac085bfaa81b50
- repo: strimzi-kafka-operator
  path: api/src/main/java/io/strimzi/api/kafka/model/user/acl/StrimziAclOperation.java
  lines: 1-60
  ref: 1.3.1
  commit: 555c3e0f07c203911bc3cb7d13ac085bfaa81b50
- repo: strimzi-kafka-operator
  path: api/src/main/java/io/strimzi/api/kafka/model/mirrormaker2/KafkaMirrorMaker2TargetClusterSpec.java
  lines: 23-70
  ref: 1.3.1
  commit: 555c3e0f07c203911bc3cb7d13ac085bfaa81b50
- repo: strimzi-kafka-operator
  path: documentation/modules/security/con-internal-cluster-security.adoc
  lines: 72-75
  ref: 1.3.1
  commit: 555c3e0f07c203911bc3cb7d13ac085bfaa81b50
- repo: kafka
  path: metadata/src/main/java/org/apache/kafka/metadata/authorizer/StandardAuthorizerData.java
  lines: 245-310
  ref: 4.4.0
  commit: 1156b2752aaa28eafc0b4c4d387e63356793268d
- repo: kafka
  path: metadata/src/main/java/org/apache/kafka/metadata/authorizer/StandardAuthorizerData.java
  lines: 570-596
  ref: 4.4.0
  commit: 1156b2752aaa28eafc0b4c4d387e63356793268d
unpinned: 3
---

# docs/kubernetes/operator/strimzi/authorization.md

## Findings

- L98 IMPRECISE corrigé : "Les refus sortent en `INFO` et les autorisations seulement en `DEBUG`" n'est vrai que pour les requêtes explicites (`logIfDenied` et `logIfAllowed`). Sinon (listing filtré, calcul des opérations autorisées) la ligne sort en `TRACE`. Ajouter "pour les accès réellement demandés" suffit. Preuve : metadata/src/main/java/org/apache/kafka/metadata/authorizer/StandardAuthorizerData.java:283-308 @ 4.4.0
- L73 IMPRECISE corrigé : "aucune ACL n'existe sur la ressource" omet que les ACLs `prefix` et le wildcard `*` qui matchent le topic comptent aussi. Un topic sans ACL propre mais couvert par un prefix d'un autre `KafkaUser` n'est donc plus ouvert. Preuve : metadata/src/main/java/org/apache/kafka/metadata/authorizer/StandardAuthorizerData.java:395-430,570-596 @ 4.4.0

Les autres affirmations sont confirmées : authorizer `StandardAuthorizer` (KafkaAuthorizationSimple.KRAFT_AUTHORIZER_CLASS_NAME), préfixe `User:` des superUsers et liste des principals internes (CN=...,O=io.strimzi en mTLS, service accounts sinon), warning `ANONYMOUS` quand l'authentification interne est à none, logger `kafka.authorizer.logger` à `INFO` par défaut, format du log et `DefaultAllow`, `deny` prioritaire, `Write` implique `Describe`, 11 opérations ACL, défauts `allow` et `host: *`, types d'authentification listener (`tls`, `scram-sha-512`, `custom`) et KafkaUser (`tls`, `tls-external`, `scram-sha-512`), principal `CN=<user>`, Secret avec clé `password`, structure `target` et `mirrors[].source` de KafkaMirrorMaker2 en v1 avec `groupId` et 3 topics internes obligatoires côté target, `passwordSecret.secretName` et `password`. Le flag n'est pas dans les préfixes interdits de `spec.kafka.config`. La doc Kafka décrit bien le flag comme réglage de dev, test ou migration et recommande `false` en production.

## Unpinned

- L82 : le chart et le commentaire "à retirer quand les clients passent en SCRAM" sont un cas vécu, sans source amont.
- L165 : les brokers redémarrent en rolling update au retrait du flag (le flag n'est pas dynamique côté Kafka, non relu dans le diff de config de Strimzi).
- L116 : conseil de couvrir les jobs batch et clients mensuels pendant la collecte, pratique et non vérifiable.
