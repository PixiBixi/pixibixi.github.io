---
article: docs/automation/ansible/ansible_tips.md
checked: '2026-11-11'
commit: 4893a9935af2baec4b26ac7bcc2561ab7e042d4e
sources:
- repo: ansible
  path: lib/ansible/inventory/host.py
  lines: '146'
  ref: origin/devel
  commit: fd540eda9f96783955b227e84e229ca51f041cae
unpinned: 2
---

# docs/automation/ansible/ansible_tips.md

## Findings

- L24 ERROR corrigé : l'avertissement "id -1 = groupe direct" est remplacé par l'explication réelle (group_names triée par ordre alphabétique, sans `all`, groupes parents inclus) et la consigne de nommer le groupe (`groups['web']`). L'exemple utilise désormais `groups['web']`. Preuve : ansible lib/ansible/inventory/host.py:146 @origin/devel `results['group_names'] = sorted([...] if g.name != 'all'])` ; test ansible-core 2.18.1, inventaire `[zweb] web1,web2`, `[prod:children] zweb`, `[aaa] web1` : web1 -> `['aaa', 'prod', 'zweb']`, web2 -> `['prod', 'zweb']` (index 0 = groupe parent `prod` par hasard alphabétique).
- L13 IMPRECISE corrigé : ajout de `| default(SERVER)` et d'une phrase expliquant qu'un host sans `ansible_host` fait planter le template. Preuve : test ansible-core 2.18.1 `hostvars['web2'].ansible_host` -> "'HostVarsVars object' has no attribute 'ansible_host'" ; le template corrigé rend `10.0.0.1,web2,`.
- L26 IMPRECISE corrigé : "premier groupe parent (index 0)" remplacé par "serveurs du groupe `web`" (L26 et L28). Preuve : même source et test que L24.

## En plus

- Typos : "dispoibles" -> "disponibles", "PAS FINIT" -> "PAS FINI".

## Modernisation

- Appliquée : on cible le groupe par son nom (`groups['web']`) au lieu de `group_names[0]`.

## Tests

- uv run --with ansible-core==2.18.1, module debug + lookup template, connexion local.

## À signaler

- Le nom de groupe `web` est un exemple choisi par moi, à changer si l'auteur préfère un autre nom.
