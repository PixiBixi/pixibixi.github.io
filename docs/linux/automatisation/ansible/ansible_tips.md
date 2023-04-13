# Ansible : Tips

Quelques tips où j'ai perdu beaucoup de temps dessus

```jinja
{% for SERVER in  groups[group_names[0]] -%}
{{ hostvars[SERVER].ansible_host }},
{%- endfor %}
```

Plusieurs cas concrêts ici :
  * Nous l'avons l'utilisation d'une [variable spéciale](https://docs.ansible.com/ansible/latest/reference_appendices/special_variables.html) d'ansible.
    * `group_names` nous indique l'ensemble des groupes où appartient notre serveur
	* `groups` liste ici l'ensemble des groupes dont l'inventaire est constitué, et chaque groupe contient les hosts qu'il possède.

Cette boucle parcout l'intégralité des serveurs dont est constitué le premier groupe parent [0] de notre serveur

hostvars est également une variable spéciale. Celle-ci contient l'ensemble des serveurs de notre inventaire ainsi que chaque variable qui lui est associé. Concrêtement, ici, nous listons toutes les adresses IPs de tous les serveurs qui constituent le premier groupe parent de notre serveur.

MAIS C'EST PAS FINIT, vous voyez le petit `-%}` dans le for et le `{%-`. Le - n'est pas là par hasard, celui-ci supprime le retour à la ligne après chaque item de notre for, plutôt pratique pour faire une liste d'adresse IP ou autre. Plus d'infos sont dispoibles [ici](https://jinja.palletsprojects.com/en/3.0.x/templates/#whitespace-control)
