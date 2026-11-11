---
article: docs/automation/ansible/ansible_reuse_variable.md
checked: '2026-11-11'
commit: 40480ba7dd3486d0192189c21376916bfcfea251
sources:
- repo: ansible
  path: lib/ansible/vars/manager.py
  lines: 448-512
  ref: origin/devel
  commit: fd540eda9f96783955b227e84e229ca51f041cae
- repo: ansible
  path: lib/ansible/modules/pip.py
  lines: 33,53
  ref: origin/devel
  commit: fd540eda9f96783955b227e84e229ca51f041cae
unpinned: 2
---

# docs/automation/ansible/ansible_reuse_variable.md

## Findings

- L58 OUTDATED corrigé : `youtube-dl` remplacé par `yt-dlp` dans les deux playbooks (nom de play, de tâche et paquet), `state: latest` ajouté pour coller au "Upgrade & install". Preuve : yt-dlp pyproject.toml:6 `name = "yt-dlp"` @origin/master ; `pip install yt-dlp` dans debian:12.7 donne 2026.10.26.
- L38 IMPRECISE corrigé : "le keyword `hostvars`" devient "la variable magique `hostvars`". Preuve : ansible lib/ansible/vars/manager.py:448-512 @origin/devel (`_get_magic_variables`, `variables['hostvars'] = self._hostvars`).
- L50 IMPRECISE corrigé : `vars: update: "{{ neededupdate.stdout }}"` supprimé des deux playbooks (jamais utilisé). Preuve : ansible-core 2.22.0, le play avec ce `vars` inutilisé passe sur host_b (évaluation paresseuse), donc pur bruit ; aucun impact fonctionnel.

## En plus

- L11 "puis déployé sur une flotte" corrigé en "puis déployer" (faute d'infinitif).

## Modernisation

- yt-dlp : appliqué.
- PEP 668 : appliqué, la tâche `pip` installe dans un virtualenv (`virtualenv: /opt/yt-dlp`, `virtualenv_command: python3 -m venv`) et une phrase explique pourquoi et que `python3-venv` est requis. Preuve : debian:12.7 `pip3 install yt-dlp` -> `error: externally-managed-environment` ; sans `python3-venv`, `python3 -m venv` échoue (ensurepip absent) ; paramètres vérifiés dans lib/ansible/modules/pip.py:33,53 @origin/devel.
- delegate_to/run_once ou set_fact cacheable : non appliqué, l'article montre un seul pattern et `hostvars` reste la bonne réponse.

## Tests

- `uv run --with ansible-core` (ansible-core 2.22.0), inventaire local host_a/host_b : le playbook correct (version debug) passe sur les deux hosts ; le playbook "wrong" échoue sur host_b avec `'neededupdate' is undefined`, ce qui confirme l'explication de l'article.
- Docker debian:12.7 : PEP 668 et python3-venv comme ci-dessus.

## À signaler

- La tâche `pip` complète avec virtualenv n'a pas été lancée via Ansible dans un conteneur, seulement l'équivalent shell (`python3 -m venv /opt/yt-dlp && pip install yt-dlp`).
