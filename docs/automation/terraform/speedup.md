---
description: Accélérer Terraform — parallélisme, cache des providers et optimisations CI pour des déploiements plus rapides
tags:
  - Terraform
---

# Accélerer Terraform

Pour accélerer Terraform, quelques bonnes pratiques. Complémentaire aux [commandes essentielles](cheatsheet.md) et aux [outils disponibles](tools.md).

## Parallélisme

Par défaut, si on dispose d'un large nombre de ressources, le parallélisme de Terraform est seulement de 10 — Terraform ne va pas effectuer plus de 10 opérations en parallèle.

Pour ça, augmenter le `-parallelism` à une valeur supérieure.

!!! warning "Danger"
    Attention à ne pas spam les API provider et provoquer d'autres bugs

## Réutilisation des providers

Un comportement pas vraiment intelligent de Terraform est le pull systématique des providers.

Imaginons qu'on a 10 repos utilisant les mêmes 4 providers, Terraform va les pull 10 fois alors qu'il s'agit des mêmes. Ça peut être également coûteux en terme d'espace disque.

Pour ça, la bonne pratique est de définir la variable `TF_PLUGIN_CACHE_DIR`. Cette variable va indiquer à Terraform de se référer à un dossier pour les providers plutôt que de les re-télécharger à chaque fois.

En pratique, il existe 2 manières d'effectuer cette opération.

Dans la configuration de la CLI Terraform :

```ini
plugin_cache_dir = "${HOME}/.terraform.d/plugin-cache"
```

La seconde manière, conseillée, est d'ajouter directement une variable d'environnement :

```bash
export TF_PLUGIN_CACHE_DIR="${HOME}/.terraform.d/plugin-cache"
```

## Bonus : Gitlab-CI

Il est également possible de setup du cache sur une pipeline Gitlab.

Comme pour Terraform en local, il est nécessaire de définir la même variable puis on va utiliser le keyword cache de Terraform pour activer ce dernier :

```yaml
.terraform:
  image:
    name: terraform:latest
  variables:
    TF_INPUT: "false"
    TF_IN_AUTOMATION: "true"
    TF_PLUGIN_CACHE_DIR_RELPATH: .terraform.d/plugin-cache
    TF_PLUGIN_CACHE_DIR: ${CI_PROJECT_DIR}/${TF_PLUGIN_CACHE_DIR_RELPATH}
  artifacts:
    expire_in: 3 hours
  before_script:
    - mkdir -p "${TF_PLUGIN_CACHE_DIR}"
  cache:
    key: terraform-plugins-cache
    paths:
      - ${TF_PLUGIN_CACHE_DIR_RELPATH}
    when: always
```

Puis sur les étapes suivantes, on étend ce template :

```yaml
terraform-init:
  extends: .terraform
```

On dispose maintenant d'un cache commun aux différentes stages.

Pour confirmer que l'init est correctement load depuis le cache, on devrait avoir l'output suivant :

```bash
time terraform init

Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 4.45.0"...
- Finding hashicorp/random versions matching "~> 3.4.3"...
- Finding hashicorp/googleworkspace versions matching "~> 0.6.0"...
- Finding hashicorp/time versions matching "~> 0.7.2"...
- Finding hashicorp/google versions matching "~> 4.20.0"...
- Finding hashicorp/local versions matching "~> 2.2.2"...
- Finding hashicorp/archive versions matching "~> 2.2.0"...
- Finding hashicorp/external versions matching "~> 2.2.2"...
- Finding hashicorp/tls versions matching "~> 3.3.0"...
- Finding hashicorp/null versions matching "~> 3.1.1"...
- Using hashicorp/aws v4.45.0 from the shared cache directory
- Using hashicorp/external v2.2.3 from the shared cache directory
- Using hashicorp/local v2.2.3 from the shared cache directory
- Using hashicorp/archive v2.2.0 from the shared cache directory
- Using hashicorp/tls v3.3.0 from the shared cache directory
- Using hashicorp/null v3.1.1 from the shared cache directory
- Using hashicorp/random v3.4.3 from the shared cache directory
- Using hashicorp/googleworkspace v0.6.0 from the shared cache directory
- Using hashicorp/time v0.7.2 from the shared cache directory
- Using hashicorp/google v4.20.0 from the shared cache directory

terraform init  0.35s user 0.12s system 15% cpu 3.078 total
```

## Voir aussi

* [Cheatsheet Terraform](cheatsheet.md) — commandes essentielles (plan, apply, etc.)
* [Tools Terraform indispensables](tools.md) — tfswitch, tfsec et checkov
