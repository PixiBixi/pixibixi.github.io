---
description: Accéder aux variables d'un hôte spécifique dans Ansible avec hostvars - partage de variables entre hôtes
tags:
  - Ansible
---

# Réutilisation de variables ansible entre différentes tâches

L'utilisation des variables dans ansible est parfois une plaie.

Imaginons un cas simple, nous souhaitons faire un check sur un serveur précis, puis déployer sur une flotte de serveur identiques. Dans ce cas simple, il semblerait trivial d'executer la tache A sur le serveur A, puis d'appliquer aux serveurs B, C et D, ce qui nous donnerait ce playbook :

```yaml title="wrong_playbook.yml"
- name: Task A
  hosts: host_a
  tasks:
    - name: Check Task Version
      ansible.builtin.shell: php check
      register: neededupdate

- name: Update yt-dlp on servers
  hosts:
    - host_a
    - host_b
    - host_c
    - host_d
  tasks:
    - name: Upgrade & install yt-dlp via PIP3
      ansible.builtin.pip:
        name: yt-dlp
        state: latest
        virtualenv: /opt/yt-dlp
        virtualenv_command: python3 -m venv
      when: "'new_version_available' in neededupdate"
```

Malheureusement, cet exemple ne peut pas marcher. Pour rappel, les variables ansible ont comme portée leur host d'exécution, plutôt ballot. Il faudrait donc qu'on puisse indiquer à ansible d'utiliser une variable d'un host spécifique sur un ensemble d'host.

Heureusement, ansible a tout prévu avec la variable magique `hostvars`, qui permet d'accéder à une variable d'un host spécifique. Le `pip` passe par un virtualenv : sur Debian 12+, le Python système refuse les installs `pip` (PEP 668, `externally-managed-environment`). Le paquet `python3-venv` doit être présent sur le host.

```yaml title="correct_playbook.yml"
- name: Task A
  hosts: host_a
  tasks:
    - name: Check Task Version
      ansible.builtin.shell: php check
      register: neededupdate

- name: Update yt-dlp on servers
  hosts:
    - host_a
    - host_b
    - host_c
    - host_d
  tasks:
    - name: Upgrade & install yt-dlp via PIP3
      ansible.builtin.pip:
        name: yt-dlp
        state: latest
        virtualenv: /opt/yt-dlp
        virtualenv_command: python3 -m venv
      when: "'new_version_available' in hostvars['host_a']['neededupdate']['stdout']"
```
