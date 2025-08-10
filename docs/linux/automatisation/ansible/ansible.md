# Automatisation des taches avec ansible

## Ansible ? Kezako

ansible est un outil d'automatisation des tâches d'un serveur
développé en python agent-less (càd sans agent à installer sur le
serveur) via des '"recettes'" appelées playbooks en jargon ansible ou
alors pour des actions simples des lignes de commandes. Il ne s'agit ni
plus ni moins que de scripts à la sauce ansible permettant de configurer
vos serveurs.

## Le fichier hosts

Le fichier hosts est le fichier où nous allons définir tous les serveurs
déstinés à recevoir les commandes d'ansible. Sa syntaxe est simplissime

```bash
    myserver.com:1881
```

Via ce simple code, nous allons indiquer à ansible de se connecter à
myserver.com sur le port SSH 1881. Par défaut, le port 22 est évidemment
utilisé.

Il est possible de définir des groupes de serveurs afin d'appliquer les
actions sur un type de serveur donné, par exemple

```ini
    myserver.com:1881

    [webservers]
    foo.myserver.com
    bar.myserver.com
```

Dans cet exemple, nous avons le groupe ``webservers``. L'argument
`ansible` pour spécifier un groupe est ``-l webservers``. Il est
également possible de ne cibler qu'un serveur via cet argument.

De plus, il est possible de définir des variables de groupes ou
globales. Par exemple, si tous vos serveurs de BDD ont leur port SSH en
8237, nous n'allons pas définir le port pour chaque hôte.

```ini
    [database]
    db1.sql.com
    db2.sql.com

    [database:vars]
    ansible_port=8237
```

Dans le cas d'une société, nous avons un dossier **customers** dans le
dossier `/etc/ansible`. Chaque fichier contenu dans ce dossier
contiendra un client...

## Ligne de commande

Comme dis précédemment, l'une des 2 manières de lancer ansible est via
la ligne de commande. Par exemple, si vous souhaitez faire un *ls* d'un
répertoire précis dans tous vos *linux*, voici la commande à taper :

```bash
ansible -i /etc/ansible/customers/absix.hosts linux -a "ls /var/www"
```

Via cette commande, nous utilisons comme fichier hosts
`/etc/ansible/customers/lol.absix` sur le groupe 'linux' et nous
lançons la commande `ls /var/www`

Si vous souhaitez boucler sur tous les clients, il suffira de faire une
boucle for

```bash
for HOST in /etc/ansible/customers/*
do
    ansible -i $HOST linux -a "ls /var/www"
done
```

Plus d'informations sur les commandes ad-hoc sont disponibles sur [le site officiel](https://docs.ansible.com/ansible/latest/user_guide/intro_adhoc.html#intro-adhoc)

'## Playbooks

Un playbook est un fichier de '"description'" des actions à réaliser
écrit en YAML.

Voici un exemple de playbook simple :

```yaml
---
- hosts: linux
  user: root
  connection: ssh

  tasks:
  - name: Copy mk_mysql script
    copy:
      src: /root/mk_mysql/files_script/mk_mysql
      dest: /usr/lib/check_mk_agent/plugins/mk_mysql
      owner: root
      group: root
      mode: 0755
    when: ansible_distribution == Debian

  - name: Add configuration file
    command: cp /etc/mysql/debian.cnf /etc/check_mk

  - name: Rename with correct name
    command: mv /etc/check_mk/debian.cnf /etc/check_mk/mysql.cfg

  - name: Remove white space
    command: sed -i s/ //g /etc/check_mk/mysql.cfg
```

Ce playbook est tout simple. Tout d'abord, il sera appliqué qu'aux
hotes dans le groupe ansible linux en utilisant une connexion SSH via
l'utilisateur root.

4 taches seront exécutées via ce script :

* Tout d'abord, il via copier le fichier contenu dans la machine
    ansible `/root/mk_mysql/files_script/mk_mysql` vers
    `/usr/lib/check_mk_agent/plugins/mk_mysql` dans la machine distante
* Secondement, le fichier de la machine distante
    `/etc/mysql/debian.cnf` sera copié dans le répertoire
    `/etc/check_mk`
* Par la suite, il renomme le fichier contenu dans `/etc/check_mk` de
    `debian.cnf` à `mysql.cfg`
* Et enfin, il supprime tous les whitespace du fichier

Dans ce playbook, seul le module *copy* est utilisé, mais une liste
exhaustive des modules existants est disponible sur le [site
officiel](https://docs.ansible.com/ansible/latest/modules/modules_by_category.html)

Pour lancer ce playbook sur tous les clients d'un seul coup, la même
boucle for que toute à l'heure est nécessaire, mais avec une commande
différente.

```bash
for HOST in /etc/ansible/customers/*.hosts
do
    ansible-playbook -i ${HOST} deploy_mkmysql.yml
done
```

Pour une documentation plus poussée, je vous recommande d'aller sur [l'article de Buzut](https://utux.fr/index.php?article100/configuration-et-deploiement-avec-ansible) qui décrit simplement l'utilisation de ansible, ou encore l'article de [memo-linux](https://memo-linux.com/ansible-mes-premiers-pas).

L'excellent xavki a également sorti une [formation poussée](https://www.youtube.com/watch?v=kzmvwc2q_z0) sur le sujet

## Utilisation des variables

ansible est nativement prévu pour être compatible avec les variables, afin de factoriser le code. Il est possible d'en définir dans des fichiers yaml. Celles-ci peuvent être de plusieurs niveaux (dit dictionnaires):

```bash
$ cat vars/users.yml
# Users variable
users:
  ## tecteam users
  jdelgado:
    my_key: my_value
```

Dans ce fichiers *vars/users.yml*, nous avons une variable nommée **users** contenant 1 entrée, jdelgado, qui contient elle même une entrée exemple.

Pour utiliser ce fichier dans un role, il faut dans un premier temps inclure le fichier dans notre task:

```bash
$ cat tasks/main.yml
- name: "Include users vars"
  ansible.builtin.include_vars:
    file: ../../inventory/vars/users.yml
```

Puis nous pouvons utiliser comme ceci la variable :

```bash
- name: Update .bashrc for {{ item.key }}
  ansible.builtin.copy:
    src: files/.bashrc
    dest: "/home/{{ item.key }}/.bashrc"
    mode: 0644
  loop: "{{ users | dict2items }}"
  loop_control:
    label: "{{ item.key }}"
  when: item.value['group_name']  == 'sysadmin'
```

Dans cet exemple, nous transformons notre variable en item afin d'utiliser plus facilement la clé.

Nous souhaitons boucler  autour du nom d'utilisateur, qui sera dans notre cas la clé.
