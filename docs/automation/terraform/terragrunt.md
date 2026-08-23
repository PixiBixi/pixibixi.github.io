---
description: "Terragrunt en monorepo : arborescence par blast radius, génération du backend et du provider, dependency vs dependencies, run --all et filtres de CI."
tags:
  - Terragrunt
  - Terraform
  - GitOps
---

# Terragrunt : structure du monorepo, dépendances et orchestration en CI

Passé une dizaine d'environnements, un repo Terraform devient un exercice de copier-coller : le même bloc `backend`, le même `provider google`, les mêmes `required_providers` dupliqués partout et le jour où on change de bucket de state il faut ouvrir 40 fichiers. Terragrunt règle ce problème en générant ces fichiers et il en amène de nouveaux dès qu'on branche les units entre elles.

Les exemples ci-dessous sont sur Terragrunt 1.x, où la CLI a été refondue : `run-all` a disparu au profit de `terragrunt run --all` et `render-json` au profit de `terragrunt render`. Si on tombe sur un tutoriel qui parle encore de `run-all`, il date d'avant.

## Une arborescence par blast radius

Le découpage des dossiers, c'est le découpage des states, donc c'est le découpage du rayon de casse. Un dossier = une unit = un state = un lock. On sépare ce qui a des cycles de vie différents, pas ce qui a des noms qui se ressemblent.

```text
.
├── root.hcl                     # backend, provider, tout ce qui est commun
├── modules/                     # les modules Terraform, versionnés
└── live/
    ├── prod/
    │   ├── env.hcl              # project_id, region, labels de l'env
    │   ├── europe-west9/
    │   │   ├── region.hcl
    │   │   ├── vpc/
    │   │   │   └── terragrunt.hcl
    │   │   ├── gke-central/
    │   │   │   └── terragrunt.hcl
    │   │   └── dns/
    │   │       └── terragrunt.hcl
    │   └── europe-west1/
    └── dev/
```

Le VPC dans sa propre unit, c'est ce qui évite qu'un `apply` sur un cluster puisse toucher au réseau. C'est aussi ce qui force à ordonner les MR : le réseau d'abord, ce qui s'y branche ensuite.

Les fichiers `env.hcl` et `region.hcl` ne sont pas des units, juste des porteurs de variables qu'on va lire plus bas. Ils n'ont pas de `terragrunt.hcl` à côté, donc Terragrunt ne les prend pas pour des dossiers à appliquer.

## Sortir le backend et le provider du code

C'est le seul vrai argument de vente de Terragrunt : le `root.hcl` décrit une fois le backend et le provider et chaque unit les récupère par héritage.

```hcl title="root.hcl"
locals {
  env    = read_terragrunt_config(find_in_parent_folders("env.hcl")).locals
  region = read_terragrunt_config(find_in_parent_folders("region.hcl")).locals
}

remote_state {
  backend = "gcs"

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    bucket   = "tfstate-${local.env.env_name}"
    prefix   = path_relative_to_include()
    location = local.region.region
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "google" {
  project = "${local.env.project_id}"
  region  = "${local.region.region}"
}
EOF
}

inputs = merge(local.env, local.region)
```

Le `prefix = path_relative_to_include()` est la ligne qui fait tout le travail : le chemin de l'unit dans le repo devient le chemin de son state dans le bucket. Deux units ne peuvent pas se marcher dessus et on retrouve un state à partir de son dossier sans avoir à chercher.

Chaque unit se contente ensuite de pointer son module et de passer ses inputs :

```hcl title="live/prod/europe-west9/gke-central/terragrunt.hcl"
include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "git::ssh://git@github.com/org/modules.git//gke-cluster?ref=v1.4.0"
}

inputs = {
  cluster_name = "central-prod-ew9"
  node_count   = 6
}
```

!!! warning "Le double slash dans la source n'est pas décoratif"
    `//gke-cluster` marque la racine du module dans le repo. Sans lui, Terragrunt copie tout le repo et les chemins relatifs internes au module cassent, avec un message qui ne pointe jamais vers la vraie cause.

Le `ref=v1.4.0` est ce qui rend un apply reproductible. Une source sur `main` veut dire qu'un `apply` de rattrapage sur une unit qu'on n'a pas touchée depuis 3 mois va embarquer 3 mois de changements de module. C'est le genre de surprise qu'on découvre à 2h du matin.

## Chaîner les units avec dependency

Un `dependency` fait 2 choses en même temps : il lit les outputs d'une autre unit et il pose une arête dans le DAG qui garantit l'ordre d'exécution.

```hcl
dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    network_name = "mock-network"
    subnet_name  = "mock-subnet"
  }

  mock_outputs_allowed_terraform_commands = ["validate", "plan", "init"]
}

inputs = {
  network = dependency.vpc.outputs.network_name
  subnet  = dependency.vpc.outputs.subnet_name
}
```

Les `mock_outputs` existent parce qu'un `run --all plan` sur un environnement neuf lit les outputs d'units qui n'ont pas encore de state et échouerait sinon. On les cantonne à `validate`, `plan` et `init` : c'est ce que fait `mock_outputs_allowed_terraform_commands` et c'est ce qui empêche un `apply` de partir avec `mock-network` en dur dans la conf.

## Les mocks qui masquent une vraie erreur

Le piège arrive quand une unit est bien appliquée mais qu'un output a été renommé côté module. Terragrunt ne trouve plus `network_name`, retombe sur le mock et le `plan` sort propre avec une valeur bidon. On ne le voit qu'à l'apply, ou pire, jamais, si la ressource accepte la valeur.

La parade est `mock_outputs_merge_strategy_with_state`, qui fusionne le state réel avec les mocks au lieu de choisir l'un ou l'autre en bloc :

```hcl
dependency "vpc" {
  config_path                           = "../vpc"
  mock_outputs                          = { network_name = "mock-network" }
  mock_outputs_merge_strategy_with_state = "shallow"
}
```

En `shallow`, un output présent dans le state gagne toujours sur son mock et seuls les outputs réellement absents sont mockés. Un output disparu reste donc absent et fait échouer le plan, ce qui est le comportement qu'on veut.

## Ordonner sans lire d'output

Quand on a juste besoin qu'une unit passe avant une autre, sans en récupérer quoi que ce soit, `dependency` est le mauvais outil : il va faire tourner un `terraform output` pour rien à chaque parse. 2 options plus légères :

```hcl
# Ordre seul, pas de lecture d'output
dependencies {
  paths = ["../project-services", "../iam"]
}
```

```hcl
# Ou un dependency dont on coupe la lecture d'outputs
dependency "apis" {
  config_path  = "../project-services"
  skip_outputs = true
}
```

Le cas typique, c'est l'activation des API GCP : rien à en sortir, mais tout ce qui suit en dépend.

## Ne rejouer que ce que la MR touche

Sur un monorepo de plusieurs centaines d'units, un `run --all plan` complet en CI coûte des dizaines de minutes et tape les API du provider pour rien. Terragrunt 1.x sait calculer les units affectées par le diff Git :

```bash
# Plan des seules units touchées entre main et HEAD
terragrunt run --all --filter-affected -- plan

# Équivalent explicite, utile quand la branche cible n'est pas main
terragrunt run --all --filter '[origin/master...HEAD]' -- plan

# Restreindre à un sous-arbre
terragrunt run --all --filter './live/prod/...' -- plan
```

`--filter-affected` remonte aussi les units dépendantes de celles qui ont changé, ce qui est exactement le comportement voulu : toucher au VPC doit replanifier ce qui s'y branche.

Les autres flags qui servent réellement en CI :

- `--parallelism 8` plafonne le nombre d'units en vol. Le défaut est généreux et fait rapidement du `429` sur les API GCP
- `--fail-fast` arrête à la première unit en échec au lieu de dérouler la queue entière
- `--non-interactive` et `--no-color`, sinon les logs de pipeline sont illisibles
- `--provider-cache` monte un registry local et arrête de retélécharger le même provider pour chaque unit

!!! danger "run --all apply ajoute -auto-approve tout seul"
    C'est le comportement par défaut, sans confirmation par unit. Sur un monorepo de prod, on ne le lance qu'après avoir relu le plan et on garde `--no-auto-approve` sous la main pour les runs manuels.

Le flag à ne jamais mettre en CI, c'est `--queue-ignore-dag-order` : il applique tout en parallèle sans respecter les dépendances. Ça sert à débloquer une situation à la main, jamais dans un pipeline.

## Lire le DAG avant de le subir

Quand un `run --all` fait des choses inattendues, l'ordre est presque toujours l'explication. Terragrunt sait le sortir sans rien appliquer :

```bash
# Les units découvertes, groupées par étage du DAG
terragrunt find --dag

# Le graphe en DOT, pour le regarder en vrai
terragrunt dag graph | dot -Tsvg > dag.svg

# La conf finale d'une unit, includes et fonctions résolus
terragrunt render --format json | jq .
```

`terragrunt render` est l'outil à sortir dès qu'un input n'a pas la valeur attendue : il montre le résultat après héritage du `root.hcl` et évaluation des `locals`, là où lire les fichiers un par un ne dit pas qui gagne.

Pour un `destroy`, Terragrunt inverse l'ordre du DAG tout seul. Ce qu'il ne fait pas par défaut, c'est vérifier que personne ne dépend de ce qu'on détruit, d'où `--destroy-dependencies-check` sur les units qui portent du réseau ou de l'IAM.

## Générer les units répétitives avec un stack

Quand la même grappe d'units se répète à l'identique, par exemple un cluster avec son DNS et ses buckets pour chaque nouveau client, les recopier à la main finit par produire des divergences silencieuses. Les stacks génèrent ces dossiers depuis une déclaration unique.

```hcl title="live/prod/clients/terragrunt.stack.hcl"
unit "acme_cluster" {
  source = "../../../units/gke-cluster"
  path   = "acme/cluster"

  values = {
    cluster_name = "acme-prod"
    node_count   = 4
  }
}

unit "acme_dns" {
  source = "../../../units/dns-zone"
  path   = "acme/dns"

  values = {
    zone = "acme.example.com"
  }
}
```

```bash
terragrunt stack generate      # matérialise .terragrunt-stack/
terragrunt stack run -- plan
terragrunt stack output
terragrunt stack clean
```

Les units générées atterrissent dans `.terragrunt-stack/`, qui est un artefact : on le gitignore et on ne l'édite jamais à la main. Côté unit, les valeurs se lisent avec `values.cluster_name` au lieu de passer par des `locals` recopiés.

C'est puissant et c'est aussi une couche d'indirection en plus. Sur 3 environnements qui se ressemblent, le gain ne paye pas la complexité. Sur 30 clients au même schéma, il la paye largement.

## Les pièges qui coûtent une heure

- **Le `root.hcl` ne s'appelait pas comme ça avant.** L'ancienne convention mettait la conf racine dans un `terragrunt.hcl` à la racine et `find_in_parent_folders()` sans argument le trouvait. C'est déprécié : on nomme le fichier `root.hcl` et on passe le nom explicitement. Sinon Terragrunt peut remonter jusqu'à un `terragrunt.hcl` qui n'était pas prévu pour ça.
- **Le `.terragrunt-cache` grossit sans fin.** Chaque unit garde sa copie du module et de ses providers. Sur un monorepo, ça se compte en dizaines de Go. `--provider-cache` règle la partie providers et un `find . -type d -name ".terragrunt-cache" -prune -exec rm -rf {} +` règle le reste quand la CI commence à se plaindre du disque.
- **Un state par unit veut dire un lock par unit.** C'est l'avantage recherché, mais 2 pipelines qui tournent sur la même branche vont se bloquer proprement sur une unit et pas sur les autres, donc un `run --all` peut échouer à moitié. C'est là que `--fail-fast` évite un état bancal.
- **`inputs` n'est pas `variables`.** Terragrunt passe les `inputs` en variables d'environnement `TF_VAR_*`. Une variable non déclarée dans le module est ignorée en silence, sans erreur : une faute de frappe dans un nom d'input ne se voit que par la valeur par défaut qui s'applique.

## Voir aussi

- [Cheatsheet Terraform](cheatsheet.md) - les commandes Terraform sous-jacentes
- [Accélerer Terraform](speedup.md) - cache des providers et parallélisme, valable sous Terragrunt
- [Tools Terraform indispensables](tools.md) - tflint, tfsec et Infracost à brancher sur les units
- [GKE Workload Identity](../../cloud/gcloud/workload_identity.md) - un exemple de ce qu'on déploie avec
