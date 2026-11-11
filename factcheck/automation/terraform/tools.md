---
article: docs/automation/terraform/tools.md
checked: '2026-11-11'
commit: 36ab3164f5e036246da0c2a1b2dd861292243631
sources:
- repo: cli
  path: README.md
  lines: 13-19
  ref: origin/HEAD
  commit: 736c68f674113337685e3eb1f908602a03b8f99b
- repo: cli
  path: README.md
  lines: 33-75
  ref: origin/HEAD
  commit: 736c68f674113337685e3eb1f908602a03b8f99b
- repo: infracost
  path: internal/output/table.go
  lines: 279-283
  ref: origin/HEAD
  commit: 93b9a2d921f19966b09a3d84d2e63bd86f8587d0
- repo: terraform-switcher
  path: CHANGELOG.md
  lines: 430,458
  ref: v1.20.0
  commit: 7f8cf2c8c1e995d3793eab4da120264981695192
unpinned: 0
---

# docs/automation/terraform/tools.md

## Findings

- L23 OUTDATED corrigé : la puce `tfsec` devient `trivy` (`trivy config`, règles custom en Rego) avec une mention que tfsec ne sort plus de release depuis 2025 ; `tfsec .` remplacé par `trivy config .` dans le bloc de commandes ; `description` mise à jour (Trivy au lieu de tfsec). Preuve : tfsec README.md:13-19 @origin/HEAD ("tfsec to Trivy Migration", "encourage the tfsec community to transition over to Trivy") ; dernier tag v1.28.14 daté 2025-05-01 ; `aquasec/trivy:0.66.0 config .` sur un main.tf de test sort 11 failures (AVD-AWS-0086...). Règles custom : trivy docs/guide/scanner/misconfiguration/custom/ @origin/main.
- L54 IMPRECISE corrigé : phrase ajoutée avant le bloc Infracost, les commandes sont celles du CLI historique v0.10 (`infracost/infracost`) ; le CLI v2 (`infracost/cli`) mis en avant par le README fait `infracost scan` sur le dossier, et son `diff` compare à un scan précédent sans `--path plan.json`. Preuve : infracost README.md:33-75 @origin/HEAD ; infracost-cli internal/cmds/deprecated.go @v2.18.3 (`breakdown` est un shim vers `scan`, `--path X` devient le dossier cible) ; internal/cmds/diff.go:47-48,151 (`diff [path]`, "between a saved baseline and your current code", `--compare-to`). v0.10.47 est toujours publié (2026-10-21), donc les commandes de l'article restent valides avec ce CLI.
- L65 IMPRECISE corrigé : "sort à zéro" remplacé par "sort avec un prix unitaire (`Monthly cost depends on usage`) mais reste hors du total, sauf fichier d'usage (`--usage-file`)". Preuve : infracost internal/output/table.go:279-283 @origin/HEAD (MonthlyCost nil -> ligne "Monthly cost depends on usage: &lt;prix&gt; per &lt;unité&gt;") ; cmd/infracost/run.go:55 (flag `--usage-file`).

## En plus

- L10 "faire du IaaS (Infrastructure As A Service)" corrigé en "faire de l'IaC (Infrastructure as Code)" : Terraform est un outil d'IaC, l'IaaS est un modèle de cloud.

## Modernisation

- Trivy à la place de tfsec : appliqué.
- tfswitch et OpenTofu : appliqué (`--product opentofu`). Preuve : terraform-switcher CHANGELOG.md:430,458 @v1.20.0.
- Nouveau CLI Infracost : mentionné, sans réécrire les commandes (la v0.10 est encore publiée et sa sortie reste celle que décrit l'article).

## Tests

- Docker `aquasec/trivy:0.66.0 config .` sur un Terraform de test (S3 + security group ouvert) : OK.
- Infracost non lancé (clé API nécessaire), vérification sur le code seulement.

## À signaler

- Si l'auteur préfère pousser le CLI v2 d'Infracost, il faut réécrire la section (`infracost scan`, `infracost diff --compare-to`), non testé ici.
