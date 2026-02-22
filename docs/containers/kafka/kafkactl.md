---
description: Administrer un cluster Kafka avec kafkactl — topics, partitions, réplication et opérations de maintenance
---

# Kafkactl, un outil magique

Manageant quelques clusters Kafka, je devais effectuer quelques opérations de maintenance sur notre cluster, ajuster le nombre de replicas des topics...

Si vous êtes familiers avec l'univers Kafka, vous savez à quel point ces opérations sont chiantes.

Il y'a peu, j'ai découvert un outil changeant ma manière de travailler avec Kafka, [kafkactl](https://github.com/deviceinsight/kafkactl). Son nom n'est pas sans vous rappeler le binary `kubectl`, et c'est normal. Tout comme ce dernier, il est écrit en go et possède les même notions (Utilisation de contexts, keyword get/describe)...

Sous mac, l'installer est d'une simplicité enfantine

```bash
# install tap repostory once
brew tap deviceinsight/packages
# install kafkactl
brew install deviceinsight/packages/kafkactl
```

Et son utilisation l'est tout autant. Tout se passe dans un seul fichier de configuration :

```bash
➜  ~ \cat ~/.config/kafkactl/config.yml
contexts:
    cluster1:
        brokers:
          - cluster1-eu3-1.mydomain.tld:9092
          - cluster1-eu3-2.mydomain.tld:9092
          - cluster1-eu3-3.mydomain.tld:9092
    cluster2:
        brokers:
          - cluster2-eu5-1.mydomain.tld:9092
          - cluster2-eu5-2.mydomain.tld:9092
          - cluster2-eu5-3.mydomain.tld:9092

current-context: cluster1
```

Beaucoup d'autres paramètres sont disponibles, n'hésitez pas à consulter la documentation

Et tout comme kubectl, il ne faut pas oublier de source l'autocompletion, à ajouter dans ton .zshrc (ou tout autre)

```bash
echo "source <(kafkactl completion zsh)" >> .zshrc"
```

L'utilisation des contextes est comme sur Kube

```bash
➜  ~ kafkactl config get-contexts
ACTIVE     NAME
*          cluster1
           cluster2
➜  ~ kafkactl config use-context cluster2
➜  ~ kafkactl config get-contexts
ACTIVE     NAME
           cluster1
*          cluster2
```

Une fois tout configuré, voici les principales fonctionnalités dont je me sers :

```bash
kafkactl alter topic "$TOPIC" --replication-factor 3 --validate-only
```

Afin de voir les futures modifications (--validate-only). Si elles vous conviennent, enlever le paramètre

```bash
kafkactl get consumer-groups
```

Et pour avoir les détails d'un consumer group

```bash
kafkactl describe consumer-group "my-consumer-group"
CLIENT_HOST       CLIENT_ID     TOPIC  ASSIGNED_PARTITIONS
/1.2.3.21     rdkafka       topica     44,45,46,47,48,49,50,51,52,53
/1.2.3.21     rdkafka       topicb     44,45,46,47,48,49,50,51,52,53
/1.2.3.16     rdkafka       topica     22,23,24,25,26,27,28,29,30,31,32
/1.2.3.16     rdkafka       topicb     22,23,24,25,26,27,28,29,30,31,32
/1.2.3.39     rdkafka       topica     0,1,2,3,4,5,6,7,8,9,10
/1.2.3.39     rdkafka       topicb     0,1,2,3,4,5,6,7,8,9,10
/1.2.3.34     rdkafka       topica     11,12,13,14,15,16,17,18,19,20,21
/1.2.3.34     rdkafka       topicb     11,12,13,14,15,16,17,18,19,20,21
/1.2.3.26     rdkafka       topica     54,55,56,57,58,59,60,61,62,63
/1.2.3.26     rdkafka       topicb     54,55,56,57,58,59,60,61,62,63
/1.2.3.20     rdkafka       topica     33,34,35,36,37,38,39,40,41,42,43
/1.2.3.20     rdkafka       topicb     33,34,35,36,37,38,39,40,41,42,43
```

Le gain de temps par rapport a une WebUI est phénoménale
