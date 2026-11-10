---
description: Astuces Ansible - hostvars, groups, group_names et gestion des boucles sur plusieurs serveurs
tags:
  - Ansible
---

# Ansible : Tips

Quelques tips où j'ai perdu beaucoup de temps dessus

```jinja
{% for SERVER in groups['web'] -%}
{{ hostvars[SERVER].ansible_host | default(SERVER) }},
{%- endfor %}
```

Plusieurs cas concrêts ici :

* Nous l'avons l'utilisation d'une [variable spéciale](https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html) d'ansible.
  * `group_names` nous indique l'ensemble des groupes où appartient notre serveur
  * `groups` liste ici l'ensemble des groupes dont l'inventaire est constitué et chaque groupe contient les hosts qu'il possède.

!!! warning "Multi group"
    `group_names` est triée par ordre alphabétique (sans `all`) et contient aussi les groupes parents (`children`). `group_names[0]` ou `group_names[-1]` donnent donc le premier ou le dernier groupe par ordre alphabétique, pas le groupe dont le serveur dépend directement. Dès qu'un serveur appartient à plusieurs groupes, on nomme le groupe explicitement : `groups['web']`.

Cette boucle parcourt l'intégralité des serveurs du groupe `web`.

`hostvars` est également une variable spéciale. Celle-ci contient l'ensemble des serveurs de notre inventaire ainsi que chaque variable qui lui est associé. Concrêtement, ici, nous listons toutes les adresses IPs de tous les serveurs du groupe `web`. Un serveur sans `ansible_host` dans l'inventaire fait planter le template (variable undefined), d'où le `default(SERVER)` qui retombe sur son nom d'inventaire.

MAIS C'EST PAS FINI: vous voyez le petit `-%}` dans le for et le `{%-`. Le - n'est pas là par hasard, celui-ci supprime le retour à la ligne après chaque item de notre for, plutôt pratique pour faire une liste d'adresse IP ou autre. Plus d'infos sont disponibles [ici](https://jinja.palletsprojects.com/en/3.0.x/templates/#whitespace-control)
