---
description: "PHP sur Debian avec le dépôt deb.sury.org : corriger l'erreur EXPKEYSIG (keyring, signed-by), épingler les versions, patcher une CVE PHP en rolling upgrade Ansible avec reload php-fpm, sans oublier les limites d'un dépôt tiers."
tags:
  - PHP
  - php-fpm
  - Sury
  - Ansible
  - Debian
  - Sécurité
---

# PHP avec Sury sur Debian : EXPKEYSIG, pinning et patch de CVE avec Ansible

Debian stable fige une seule version de PHP, alors que le jour où une CVE sort on veut la correction sur toute la flotte avant la fin de journée. Avec une config apt qui survit à l'expiration de la clé de signature et un playbook en rolling upgrade, le patch passe nœud par nœud avec reload de php-fpm et health check, sans erreur `EXPKEYSIG` au milieu. Le dépôt [deb.sury.org](https://deb.sury.org/) fournit pour ça plusieurs branches de PHP en parallèle, au prix d'un dépôt tiers qui exécute des scripts en root sur chaque nœud, d'où les garde-fous de la fin.

Pour une installation simple sur un seul serveur, voir [Installer une version custom de PHP](../nginx/php_custom_version.md), qui utilise le paquet keyring et `signed-by`. La méthode générique `trusted.gpg.d` est celle qui casse le plus souvent.

## Corriger l'erreur EXPKEYSIG

Le symptôme tombe au premier `apt update` après l'expiration de la clé :

```console
$ sudo apt-get update
Err:6 https://packages.sury.org/php bookworm InRelease
  The following signatures were invalid: EXPKEYSIG B188E2B695BD4743 DEB.SURY.ORG Automatic Signing Key <deb@sury.org>
```

`EXPKEYSIG` veut dire que la signature est correcte mais que la clé qui l'a produite est périmée dans le keyring local. La clé à jour est publiée par le dépôt, il suffit de la récupérer. Le fingerprint complet `15058500A0235D97F5D10063B188E2B695BD4743` se lit avec `gpg --show-keys` sur le `.deb` du keyring ou sur `apt.gpg`, ce qui permet de vérifier qu'on parle bien de la même clé.

On commence par repérer quel fichier de clé la source utilise, puisque tout dépend de ça :

```bash
grep -rn sury /etc/apt/sources.list /etc/apt/sources.list.d/
ls -l /etc/apt/trusted.gpg.d/ | grep -i php
```

Si la source porte `signed-by=/usr/share/keyrings/debsuryorg-archive-keyring.gpg`, on réinstalle le paquet keyring, qui est celui que le [README du dépôt](https://packages.sury.org/php/README.txt) recommande :

```bash
curl -sSLo /tmp/debsuryorg-archive-keyring.deb https://packages.sury.org/debsuryorg-archive-keyring.deb
sudo dpkg -i /tmp/debsuryorg-archive-keyring.deb
# Attendu : plus aucune erreur EXPKEYSIG
sudo apt-get update
```

Si la clé est dans `/etc/apt/trusted.gpg.d/php.gpg` (l'ancienne méthode générique, plus celle de l'article lié), on peut la rafraîchir à la même adresse :

```bash
sudo curl -sSLo /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
sudo apt-get update
```

Cette méthode débloque l'`apt update`, mais la clé reste de confiance pour tous les dépôts de la machine. La bonne config est un `signed-by` dédié, décrit juste après.

## Configurer le dépôt avec signed-by

Une clé posée dans `trusted.gpg.d` peut signer n'importe quel dépôt déclaré sur la machine, y compris un dépôt Debian. Avec `signed-by`, la clé ne vaut que pour la source qui la cite. C'est aussi ce que la [documentation Debian](https://wiki.debian.org/DebianRepository/UseThirdParty) demande pour un dépôt tiers.

La config manuelle est exactement celle du README upstream :

```bash
sudo apt-get install -y lsb-release ca-certificates curl
sudo curl -sSLo /tmp/debsuryorg-archive-keyring.deb https://packages.sury.org/debsuryorg-archive-keyring.deb
sudo dpkg -i /tmp/debsuryorg-archive-keyring.deb
sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/debsuryorg-archive-keyring.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list'
sudo apt-get update
```

Côté Ansible, le module [`deb822_repository`](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/deb822_repository_module.html) écrit une source au format deb822 et accepte `signed_by` avec un chemin de keyring. Le keyring vient du paquet et se met donc à jour avec `apt`, ce qui évite le retour de `EXPKEYSIG` à l'expiration suivante :

```yaml
- name: Install the Sury keyring package
  ansible.builtin.apt:
    deb: https://packages.sury.org/debsuryorg-archive-keyring.deb

- name: Declare the Sury PHP repository
  ansible.builtin.deb822_repository:
    name: sury-php
    types: deb
    uris: https://packages.sury.org/php/
    suites: "{{ ansible_facts['distribution_release'] }}"
    components: main
    signed_by: /usr/share/keyrings/debsuryorg-archive-keyring.gpg
    state: present
```

Le paquet est téléchargé en HTTPS depuis le dépôt lui-même : c'est un bootstrap qui repose sur la confiance dans le TLS, point repris dans la section sur les risques.

## Épingler les versions

Le dépôt publie plusieurs branches (`php8.2`, `php8.3`...) côte à côte, ce qui permet de choisir la branche mais pas de la figer. Un `apt upgrade` classique installe la dernière révision de la branche. C'est voulu pour un correctif de sécurité, pas pour un changement de comportement un vendredi soir. On épingle donc la branche (`php8.3-*`) et on laisse les révisions avancer, sauf quand on veut explicitement tout geler.

Le dépôt Sury ne contient pas que des paquets `php*`. L'index `bookworm` publie aussi des librairies comme `libgd3`, `libmemcached11` ou `libpcre3` (relevé dans l'index du 25 octobre 2026). Sans règle globale, ces dépendances suivent la version Sury dès qu'elle est plus récente que celle de Debian, alors qu'on voulait seulement PHP. Il faut une priorité par origine et une exception pour les paquets voulus :

```text title="/etc/apt/preferences.d/sury"
Package: *
Pin: origin packages.sury.org
Pin-Priority: 100

Package: php8.3-* libapache2-mod-php8.3
Pin: origin packages.sury.org
Pin-Priority: 600
```

Avec 100, une librairie Sury reste moins prioritaire que la version Debian (priorité par défaut de 500), alors que 600 place les paquets PHP au-dessus. Si une dépendance de PHP exige une version qui n'existe que chez Sury, apt la tirera quand même de là : la règle évite les remplacements silencieux, pas les dépendances réelles. La simulation `apt-get -s upgrade` le montre avant le patch.

Pour vérifier ce qu'apt va faire, `apt-cache policy` affiche la version candidate et son origine :

```bash
apt-cache policy php8.3-fpm libgd3
```

Côté Ansible, le module `apt` accepte aussi un wildcard de version (`php8.3-fpm=8.3.36*`) pour installer une révision précise.

Pour geler complètement un paquet pendant un incident, le module `dpkg_selections` d'Ansible équivaut à `apt-mark hold` :

```yaml
- name: Hold php8.3-fpm during the freeze
  ansible.builtin.dpkg_selections:
    name: php8.3-fpm
    selection: hold
```

## Patcher une CVE en rolling upgrade

Quand une CVE PHP tombe, la première question est de savoir si le dépôt a déjà publié la correction. Le pool est lisible directement, par exemple `https://packages.sury.org/php/pool/main/p/php8.3/`. La version de l'index se lit aussi sans rien installer :

```bash
curl -sS https://packages.sury.org/php/dists/bookworm/main/binary-amd64/Packages.xz \
  | xz -dc | rg -A3 '^Package: php8.3-fpm$' | rg Version
```

Une branche de PHP peut recevoir le correctif avant une autre, voire ne jamais le recevoir si elle est en fin de vie : sur un patch récent, la branche la plus ancienne de la flotte n'avait pas été republiée le jour même. On le voit dans l'index avant de lancer quoi que ce soit, pas pendant le déploiement.

Le playbook traite les nœuds un par un. `serial: 1` limite le blast radius et `max_fail_percentage: 0` arrête tout au premier échec :

```yaml title="patch-php.yml"
- name: Patch PHP on the fleet
  hosts: php_servers
  become: true
  serial: 1
  max_fail_percentage: 0
  vars:
    php_branch: "8.3"
    health_url: http://127.0.0.1/health
  tasks:
    - name: Upgrade the PHP packages already installed
      ansible.builtin.apt:
        name: "php{{ php_branch }}*"
        state: latest
        only_upgrade: true
        update_cache: true
        cache_valid_time: 0
      register: php_upgrade

    - name: Validate the php-fpm configuration
      ansible.builtin.command: "php-fpm{{ php_branch }} -t"
      changed_when: false

    - name: Reload php-fpm
      ansible.builtin.service:
        name: "php{{ php_branch }}-fpm"
        state: reloaded

    - name: Wait until the application answers
      ansible.builtin.uri:
        url: "{{ health_url }}"
        status_code: 200
      register: health
      retries: 10
      delay: 3
      until: health.status == 200
```

Le module `apt` accepte les wildcards dans `name` (fnmatch) et `only_upgrade: true` n'installe rien de nouveau : un nœud qui n'avait pas `php8.3-gd` ne le reçoit pas. Les `dpkg_options` par défaut du module (`force-confdef,force-confold`) gardent les fichiers de config locaux, ce qui évite le prompt interactif sur un `php.ini` modifié.

Le reload envoie `SIGUSR2` au master (c'est l'`ExecReload` de l'unité systemd), qui se relance lui-même par `execvp` sur le binaire installé. Tant qu'il n'a pas eu lieu, le master garde en mémoire le binaire d'avant la mise à jour : un nœud à jour côté `dpkg` peut encore faire tourner l'ancien code. Le `postinst` du paquet redémarre en principe le service lui-même, mais on ne s'y fie pas, d'autant que le reload est idempotent. On le vérifie après coup sur toute la flotte :

```bash
ansible php_servers -b -m command -a "php-fpm8.3 -v" | rg 'CHANGED|PHP'
```

Un `dpkg -l 'php8.3*'` ne dit rien du processus en cours, pas plus que `php-fpm8.3 -v`, puisque la commande ci-dessus lit la version du binaire sur le disque. Pour savoir si le master tourne sur le binaire à jour, on regarde son `/proc/<pid>/exe`, qui porte le suffixe `(deleted)` quand le binaire a été remplacé depuis le lancement du processus :

```bash
ansible php_servers -b -m shell -a 'ls -l /proc/$(systemctl show -p MainPID --value php8.3-fpm)/exe'
```

Pour tester le playbook, on lance d'abord un seul nœud de staging avec `--limit`, puis toute la flotte :

```bash
ansible-playbook patch-php.yml --limit staging-web-01
# Attendu : le nœud passe, la tâche de health check répond 200
ansible-playbook patch-php.yml
```

## Vérifier que php-fpm n'est pas exposé

Un php-fpm joignable depuis le réseau accepte du FastCGI sans authentification. Un client capable de lui parler peut exécuter n'importe quel script PHP présent sur le disque. Le patch d'une CVE ne sert à rien si le socket est ouvert à tous.

Sur Debian, le pool `www.conf` écoute sur un socket Unix par défaut (`/run/php/php8.3-fpm.sock`), mais un passage en TCP pour un nginx distant est courant et la config d'origine se perd vite. On regarde ce qui écoute réellement :

```bash
sudo ss -tlnp | rg php-fpm
```

Aucune ligne ne doit sortir quand le pool est en socket Unix. Sur un pool TCP, l'adresse doit être `127.0.0.1` ou une IP privée, jamais `0.0.0.0` ni `[::]`. On restreint les clients autorisés dans le pool :

```ini title="/etc/php/8.3/fpm/pool.d/www.conf"
listen = 127.0.0.1:9000
listen.allowed_clients = 127.0.0.1
```

On vérifie aussi depuis l'extérieur de la machine, car `ss` ne dit rien des règles de firewall :

```bash
nc -zv -w 3 web-01.example.com 9000
```

Une connexion refusée ou en timeout est le résultat attendu.

## Risques d'un dépôt tiers

Un dépôt apt tiers exécute ses scripts `postinst` en root sur chaque nœud. Une clé compromise ou un miroir détourné donne un accès root à toute la flotte en un `apt upgrade`. La vérification de signature protège du miroir, pas de la compromission de la clé du mainteneur.

Les garde-fous qui valent leur coût :

- `signed-by` dédié plutôt que `trusted.gpg.d`, pour que la clé ne puisse signer que ce dépôt.
- Pinning par origine (section précédente), pour que le dépôt n'écrase pas des librairies système sans qu'on l'ait décidé.
- Un miroir interne (aptly, reprepro ou un proxy de cache) quand la flotte est grande : on contrôle ce qui entre, on installe depuis un snapshot figé et un dépôt externe indisponible ne bloque plus un déploiement.
- Un déploiement par vagues : staging, un nœud canari, puis le reste. C'est le rôle de `serial: 1` plus haut.
- Le bootstrap de la clé reste un téléchargement HTTPS : on peut en vérifier le fingerprint (`gpg --show-keys`) contre celui publié par le dépôt avant de le distribuer par un rôle Ansible.

Le jour d'une CVE, rien ne garantit une publication immédiate pour chaque branche. Quand une branche n'est plus mise à jour, la seule sortie est de migrer vers une branche suivie.
