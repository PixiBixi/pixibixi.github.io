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
 
    myserver.com:1881 
 
Via ce simple code, nous allons indiquer à ansible de se connecter à 
myserver.com sur le port SSH 1881. Par défaut, le port 22 est évidemment 
utilisé. 
 
Il est possible de définir des groupes de serveurs afin d'appliquer les 
actions sur un type de serveur donné, par exemple 
 
    myserver.com:1881 
 
    [webservers] 
    foo.myserver.com 
    bar.myserver.com 
 
Dans cet exemple, nous avons le groupe **webservers**. L'argument 
*ansible* pour spécifier un groupe est **-l webservers**. Il est 
également possible de ne cibler qu'un serveur via cet argument. 
 
De plus, il est possible de définir des variables de groupes ou 
globales. Par exemple, si tous vos serveurs de BDD ont leur port SSH en 
8237, nous n'allons pas définir le port pour chaque hôte. 
 
    [database] 
    db1.sql.com 
    db2.sql.com 
 
    [database:vars] 
    ansible_port=8237 
 
Dans le cas d'une société, nous avons un dossier **customers** dans le 
dossier */etc/ansible*. Chaque fichier contenu dans ce dossier 
contiendra un client'... 
 
## Ligne de commande 
 
Comme dis précédemment, l'une des 2 manières de lancer ansible est via 
la ligne de commande. Par exemple, si vous souhaitez faire un *ls* d'un 
répertoire précis dans tous vos *linux*, voici la commande à taper : 
 
``` bash 
$ ansible -i /etc/ansible/customers/absix.hosts linux -a "ls /var/www"  
``` 
 
Via cette commande, nous utilisons comme fichier hosts 
*/etc/ansible/customers/lol.absix* sur le groupe '*linux'* et nous 
lançons la commande *ls /var/www* 
 
Si vous souhaitez boucler sur tous les clients, il suffira de faire une 
boucle for 
 
``` bash 
for i in /etc/ansible/customers/* 
do 
    ansible -i $i linux -a "ls /var/www"  
done 
``` 
 
Plus d'informations sur les commandes ad-hoc sont disponibles sur [le 
site 
officiel](https://docs.ansible.com/ansible/latest/user_guide/intro_adhoc.html#intro-adhoc) 
 
'## Playbooks 
 
Un playbook est un fichier de '"description'" des actions à réaliser 
écrit en YAML. 
 
Voici un exemple de playbook simple : 
 
``` yaml 
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
 
-   Tout d'abord, il via copier le fichier contenu dans la machine 
    ansible */root/mk_mysql/files_script/mk_mysql* vers 
    */usr/lib/check_mk_agent/plugins/mk_mysql* dans la machine distante 
-   Secondement, le fichier de la machine distante 
    */etc/mysql/debian.cnf* sera copié dans le répertoire 
    */etc/check_mk* 
-   Par la suite, il renomme le fichier contenu dans */etc/check_mk* de 
    *debian.cnf* à *mysql.cfg* 
-   Et enfin, il supprime tous les whitespace du fichier 
 
Dans ce playbook, seul le module *copy* est utilisé, mais une liste 
exhaustive des modules existants est disponible sur le [site 
officiel](https://docs.ansible.com/ansible/latest/modules/modules_by_category.html) 
 
Pour lancer ce playbook sur tous les clients d'un seul coup, la même 
boucle for que toute à l'heure est nécessaire, mais avec une commande 
différente. 
 
``` bash 
for i in /etc/ansible/customers/*.hosts 
do 
    ansible-playbook -i ${i} deploy_mkmysql.yml 
done 
``` 
 
Pour une documentation plus poussée, je vous recommande d'aller sur 
[l'article de 
Buzut](https://utux.fr/index.php?article100/configuration-et-deploiement-avec-ansible) 
qui décrit simplement l'utilisation de ansible, ou encore l'article de 
[memo-linux](https://memo-linux.com/ansible-mes-premiers-pas). 
 
L'excellent xavki a également sorti une [formation 
poussée](https://www.youtube.com/watch?v=kzmvwc2q_z0) sur le sujet 
