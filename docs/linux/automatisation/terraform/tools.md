# Tools Terraform indispensables

Terraform est un outil fabuleux permettant de faire du IaaS
(Infrastructure As A Service).

Cependant, nous pouvons encore améliorer son expérience avec quelques
outils :

  * `tfswitch` nous permettra de sélectionner automatiquement la bonne
    version de Terraform :
    [tfswitch](https://github.com/warrensbox/terraform-switcher/)
  * `terraform-docs` nous permettra de simplement générer une
    documentation pour votre projet Terraform, à agrémenter évidemment :
    [terraform-docs](https://github.com/terraform-docs/terraform-docs)
  * `tfsec` nous permettra de vérifier les bonnes pratiques en terme
    de sécurité, il est également possible de créer ses règles
    custom... : [tfsec](https://github.com/aquasecurity/tfsec)
  * `checkov` est un équivalent à tfsec mais est générique, il peut
    également scanner les YAML K8S...
    [checkov](https://github.com/bridgecrewio/checkov)
