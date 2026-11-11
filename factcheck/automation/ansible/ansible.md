---
article: docs/automation/ansible/ansible.md
checked: '2026-11-10'
commit: f92a928a00fc68be508fb70200fcf1271c95f543
sources:
- repo: ansible
  path: lib/ansible/playbook/play.py
  lines: 163-174
  ref: origin/devel
  commit: fd540eda9f96783955b227e84e229ca51f041cae
unpinned: 6
---

# docs/automation/ansible/ansible.md

## Findings

- L110 ERROR corrigé : `when: ansible_distribution == 'Debian'`, plus une phrase qui explique le piège. Preuve : ansible-core 2.19.3 (python:3.12-slim), playbook original -> "Error while evaluating conditional: 'Debian' is undefined" ; corrigé -> ok=5 failed=0.
- L119 ERROR corrigé : `sed -i 's/ //g' /etc/check_mk/mysql.cfg`, avec explication (pas de shell, découpage shlex). Preuve : original -> `"cmd": ["sed", "-i", "s/", "//g", ...]`, "sed: -e expression #1, char 2: unterminated `s' command" ; corrigé -> fichier`user=debian-sys-maint` sans espaces.
- L70 IMPRECISE corrigé : `lol.absix` remplacé par `absix.hosts` dans l'explication (cohérent avec la commande et la boucle `*.hosts`). Preuve : article L70/L147.
- L99 IMPRECISE corrigé : `user: root` -> `remote_user: root`. Preuve : `lib/ansible/playbook/play.py:163-174@origin/devel` (alias converti, "The use of 'user' is deprecated").
- L138 IMPRECISE corrigé : "seuls les modules *copy* et *command*", avec une phrase sur la non idempotence de *command*. Preuve : le playbook lui-même.
- L140 IMPRECISE corrigé : lien remplacé par `https://docs.ansible.com/ansible/latest/collections/index_module.html` (index des modules). Preuve : `curl -L` : l'ancien lien redirige vers la page générique `docs.ansible.com/collections.html`, le nouveau répond 200 sur l'index des modules.
- L192 IMPRECISE corrigé : `group_name: sysadmin` ajouté dans `vars/users.yml`, texte adapté, phrase sur la clé obligatoire. Preuve : ansible-core 2.19.3, sans la clé -> "Error while evaluating conditional: object of type 'dict' has no attribute 'group_name'" ; avec la clé (2 users, sysadmin et dev) -> changed pour jdelgado, skipping pour bob.

## En plus

- L87 : lien ad-hoc `user_guide/intro_adhoc.html` remplacé par l'URL actuelle `command_guide/intro_adhoc.html` (l'ancienne redirige encore, 200).
- `connection: ssh` retiré (défaut), texte complété "(`remote_user`, SSH étant la connexion par défaut)".

## Modernisation

- FQCN (`ansible.builtin.copy`, `ansible.builtin.command`) : appliqué.
- `remote_user` : appliqué. `connection: ssh` retiré.
- Mode quoté (`'0755'`, `'0644'`) : appliqué.
- copy/lineinfile/replace à la place de cp/mv/sed : non appliqué. Le texte décrit 4 tâches précises ; un `copy remote_src` suivi d'un `replace` ne serait pas idempotent non plus (la copie remet les espaces, le replace les retire à chaque passage). Une phrase signale la non idempotence de *command*. À l'auteur de décider s'il veut réécrire l'exemple (par ex. `community.general.ini_file` ou un template).

## Tests

- python:3.12-slim + ansible-core 2.19.3, inventaire localhost `ansible_connection=local`.

## À signaler

- L153 : "l'article de Buzut" pointe vers utux.fr (pas buzut.net), et `curl` ne reçoit aucune réponse (code 000). Lien probablement mort, laissé tel quel.
- Le titre H1 "Automatisation des taches avec ansible" garde "ansible" en minuscule et "taches" sans accent (casse produit : Ansible). Non modifié, hors findings.
