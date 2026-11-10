---
description: Référence des commandes AWS CLI - requêtes et filtres EC2, paramètres RDS modifiés
tags:
  - AWS
  - CLI
variables:
  - name: parameter_group
    default: my-mysql8-params
  - name: region
    default: eu-west-1
---

# AWS : CLI

## EC2

### Infos basiques

Nous allons partir d'une query assez simple pour lister quelques éléments basiques

```bash
aws ec2 describe-instances \
--query "Reservations[*].Instances[*].{PublicIP:PublicIpAddress,Type:InstanceType,Name:Tags[?Key=='Name']|[0].Value,Status:State.Name}"  \
--filters "Name=instance-state-name,Values=running" "Name=tag:Name,Values='*'"  \
--output table
----------------------------------------------------------------------------------------
|                                   DescribeInstances                                  |
+----------------------------------------+-----------------+----------+----------------+
|                  Name                  |    PublicIP     | Status   |     Type       |
+----------------------------------------+-----------------+----------+----------------+
|  tools-gitlab-us8-1                    |  54.211.83.90   |  running |  m6i.2xlarge   |
|  tools-exporter-us8-1                  |  34.72.143.122  |  running |  m6a.large     |
|  worker-backend-us8-1                  |  52.1.189.213   |  running |  m6i.12xlarge  |
|  manage-lol-us8-11                     |  44.207.28.28   |  running |  m6i.16xlarge  |
|  manage-lol-us8-12                     |  5.212.172.162  |  running |  m6i.16xlarge  |
+----------------------------------------+-----------------+----------+----------------+
```

Comme nous utilisons souvent les VPC (& privatez IP) sur AWS, nous pouvons également les afficher via la query suivante

```bash
 aws ec2 describe-instances \
 --query "Reservations[*].Instances[*].{PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress,Name:Tags[?Key=='Name']|[0].Value,Type:InstanceType,Status:State.Name,VpcId:VpcId}" \
 --filters Name=instance-state-name,Values=running \
--output table
-------------------------------------------------------------------------------------------------------------------------
|                                                   DescribeInstances                                                   |
+----------------------------------------+----------------+-----------------+----------+---------------+----------------+
|                  Name                  |   PrivateIP    |    PublicIP     | Status   |     Type      |     VpcId      |
+----------------------------------------+----------------+-----------------+----------+---------------+----------------+
|  tools-gitlab-us8-1                    |  172.21.2.12   |  54.211.83.90   |  running |  m6i.2xlarge  |  vpc-ddd373b8  |
|  tools-exporter-us8-1                  |  172.21.254.12 |  34.72.143.122  |  running |  m6a.large    |  vpc-ddd373b8  |
|  worker-backend-us8-1                  |  172.21.5.11   |  52.1.189.213   |  running |  m6i.12xlarge |  vpc-ddd373b8  |
|  manage-lol-us8-11                     |  172.21.12.31  |  44.207.28.28   |  running |  m6i.16xlarge |  vpc-ddd373b8  |
|  manage-lol-us8-12                     |  172.21.12.32  |  5.212.172.162  |  running |  m6i.16xlarge |  vpc-ddd373b8  |
+----------------------------------------+----------------+-----------------+----------+---------------+----------------+
```

### Filtrage

Il est également possible d'ajouter des filtres sur le gabarit. Par exemple, si nous souhaitons que les `m6i.16xlarge`

```bash
aws ec2 describe-instances \
--query "Reservations[*].Instances[*].{PublicIP:PublicIpAddress,Type:InstanceType,Name:Tags[?Key=='Name']|[0].Value,Status:State.Name}"  \
--filters "Name=instance-state-name,Values=running" "Name=instance-type,Values='m6i.16xlarge'" \
--output table
----------------------------------------------------------------------------------------
|                                   DescribeInstances                                  |
+----------------------------------------+-----------------+----------+----------------+
|                  Name                  |    PublicIP     | Status   |     Type       |
+----------------------------------------+-----------------+----------+----------------+
|  manage-lol-us8-11                     |  44.207.28.28   |  running |  m6i.16xlarge  |
|  manage-lol-us8-12                     |  5.212.172.162  |  running |  m6i.16xlarge  |
+----------------------------------------+-----------------+----------+----------------+
```

Les filtres ne prennent pas de regex, seulement 2 jokers : `*` (zéro ou plusieurs caractères) et `?` (un caractère). Si nous souhaitons toutes les m6i, nous allons donc utiliser le filtre suivant : `Name=instance-type,Values='m6i.*'`. Un motif façon regex comme `m6[ia].*` ne matche rien, sans erreur. Pour plusieurs familles, on liste les valeurs (OR) : `Name=instance-type,Values='m6i.*','m6a.*'`.

Pour un vrai filtrage par regex, on passe côté client avec `--query` (JMESPath, qui a `starts_with` et `contains` mais pas de regex non plus) ou on pipe la sortie JSON dans `jq` et son `test()`.

Beaucoup d'autres exemples sont [disponibles ici](https://www.middlewareinventory.com/blog/aws-cli-ec2/)

## RDS

Petite query pour lister les options qui ont été modifiées au sein d'un parameter group. `--source user` filtre côté API sur les valeurs posées à la main (les autres sources sont `system` et `engine-default`). Pas de `ApplyMethod` dans le filtre : il dit quand une modif s'applique (`immediate` ou `pending-reboot`), pas si le paramètre a été modifié.

```bash
aws rds describe-db-parameters --db-parameter-group-name <parameter_group> --region <region> --source user --query "Parameters[].[ParameterName,ParameterValue]" --output text
```
