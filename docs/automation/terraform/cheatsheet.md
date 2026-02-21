---
description: Cheatsheet Terraform — commandes essentielles pour gérer l'infrastructure as code, les workspaces, l'état Terraform et les modules.
---

# Cheatsheet terraform

Quelques commandes importantes/utiles pour Terraform. Je n'ai rien
inventé, les commandes viennent d'une cheatsheet des internet mondiaux.
J'ai simplement repris les commandes qui me sont utiles de ce [magnifique PDF](https://justinoconnorcodes.files.wordpress.com/2021/09/terraform-cheatsheet-1.pdf)

* `terraform version` : Obtenir la version de terraform
* `terraform get -update=true` : Update les modules d'un projet
* `terraform validate` : Valide la syntaxe d'un Terraform
* `terraform fmt` : Formate notre terraform (très pratique pour avoir une uniformité entre collaborateurs)
* `terraform plan` : Montre les modifications
* `terraform apply` : Applique les modifications
  * `-auto-approve` applique automatiquement les modifs
