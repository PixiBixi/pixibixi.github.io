# Réutilisation de variables ansible entre différentes tâches

L'utilisation des variables dans ansible est parfois une plaie.

Imaginons un cas simple, nous souhaitons faire un check sur un serveur précis, puis déployé sur une flotte de serveur identiques. Dans ce cas simple, il semblerait trivial d'executer la tache A sur le serveur A, puis d'appliquer aux serveurs B, C et D, ce qui nous donnerait ce playbook :

??? failure "File : wrong_playbook.yml"
    ```yaml
    - name: Task A
      hosts: host_a
      tasks:
        - name: Check Task Version
          ansible.builtin.shell: php check
          register: neededupdate

    - name: Update youtube-dl on servers
      vars:
        update: "{{ neededupdate.stdout }}"
      hosts:
        - host_a
        - host_b
        - host_c
        - host_d
      tasks:
        - name: Upgrade & install youtube-dl via PIP3
          ansible.builtin.pip:
            name: youtube-dl
          when: "'new_version_available' in neededupdate"
    ```

Malheureusement, cet exemple ne peut pas marcher. Pour rappel, les variables ansible ont comme portée leur host d'exécution, plutôt ballot. Il faudrait donc qu'on puisse indiquer à ansible d'utiliser une variable d'un host spécifique sur un ensemble d'host.

Heureusement, ansible a tout prévu avec le keyword `hostvars` qui permet d'accéder a une variable d'un host spécifique

??? success "File : correct_playbook.yml"
    ```yaml
    - name: Task A
      hosts: host_a
      tasks:
        - name: Check Task Version
          ansible.builtin.shell: php check
          register: neededupdate

    - name: Update youtube-dl on servers
      vars:
        update: "{{ neededupdate.stdout }}"
      hosts:
        - host_a
        - host_b
        - host_c
        - host_d
      tasks:
        - name: Upgrade & install youtube-dl via PIP3
          ansible.builtin.pip:
            name: youtube-dl
          when: "'new_version_available' in hostvars['host_a']['neededupdate']['stdout']"
    ```

