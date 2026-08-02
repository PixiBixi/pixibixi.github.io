---
description: Outils essentiels Terraform — tfswitch, terraform-docs, tflint, tfsec, checkov et Infracost pour le versionning, la sécurité et le coût
tags:
  - Terraform
  - FinOps
---

# Tools Terraform indispensables

Terraform est un outil fabuleux permettant de faire du IaaS
(Infrastructure As A Service).

Cependant, nous pouvons encore améliorer son expérience avec quelques
outils :

* [`tfswitch`](https://github.com/warrensbox/terraform-switcher/) sélectionne
    automatiquement la bonne version de Terraform
* [`terraform-docs`](https://github.com/terraform-docs/terraform-docs) génère la
    documentation d'un module, à agrémenter évidemment
* [`tflint`](https://github.com/terraform-linters/tflint) attrape ce que
    `terraform validate` laisse passer : types d'instance qui n'existent pas, attributs
    dépréciés, conventions de nommage
* [`tfsec`](https://github.com/aquasecurity/tfsec) vérifie les bonnes pratiques de
    sécurité, avec possibilité de règles custom
* [`checkov`](https://github.com/bridgecrewio/checkov) est un équivalent générique, il
    scanne aussi les YAML K8S, les Dockerfile et les templates CloudFormation
* [`infracost`](https://github.com/infracost/infracost) chiffre le coût mensuel d'un
    `terraform plan` avant l'apply

Les commandes qui servent réellement :

```bash
# Se caler sur la version imposée par le bloc required_version
tfswitch

# Injecter la doc entre les marqueurs BEGIN_TF_DOCS / END_TF_DOCS du README
terraform-docs markdown table --output-file README.md .

tflint --init && tflint --recursive
tfsec .
checkov -d . --framework terraform
```

## Chiffrer un plan avec Infracost

C'est le seul du lot qui répond à « combien ça coûte » plutôt qu'à « est-ce que c'est
valide ». On part d'un plan au format JSON.

```bash
terraform plan -out tfplan.binary
terraform show -json tfplan.binary > plan.json

# Coût mensuel des ressources du plan
infracost breakdown --path plan.json

# Delta par rapport à l'état actuel : ce que la MR va coûter en plus ou en moins
infracost diff --path plan.json
```

Le `diff` est celui qui a de la valeur en revue : il sort le delta mensuel de la MR, pas
la facture totale. Branché en commentaire automatique sur une MR, il évite le classique
`n1-standard-16` mergé par erreur à la place d'un `n1-standard-4`.

!!! warning "Les ressources à l'usage ne sont pas chiffrées"
    Infracost calcule le coût des ressources provisionnées. Tout ce qui se facture à la
    consommation (egress réseau, requêtes S3, scans BigQuery) sort à zéro sauf à fournir
    des estimations d'usage. Le chiffre est un plancher, pas la facture.

## Voir aussi

* [Cheatsheet Terraform](cheatsheet.md) — commandes essentielles à connaître
* [Accélerer Terraform](speedup.md) — parallélisme et optimisations de performance
