---
description: Ansible, Terraform et Makefile — outils d'automatisation pour provisionner et configurer l'infra.
tags:
  - Ansible
  - Terraform
  - Automation
---

# Automation

Écrire les choses à la main une seule fois, c'est acceptable. Deux fois, c'est un script. Trois fois, c'est de l'infra as code. Cette section regroupe Ansible pour la config management, Terraform pour le provisioning, et Makefile pour coller tout ça ensemble.

## Contenus

- [Ansible](ansible/ansible.md) — introduction, playbooks et modules essentiels
- [Ansible Tips](ansible/ansible_tips.md) — astuces et patterns du quotidien
- [Ansible — Réutiliser les variables](ansible/ansible_reuse_variable.md) — partage de variables entre plays
- [Terraform Cheatsheet](terraform/cheatsheet.md) — commandes et patterns courants
- [Terraform — Accélérer les plans](terraform/speedup.md) — optimisations pour les gros states
- [Terraform Tools](terraform/tools.md) — outillage autour de Terraform
- [Makefile](misc/makefile.md) — automatiser les tâches projet avec make
