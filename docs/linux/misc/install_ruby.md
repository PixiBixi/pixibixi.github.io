---
description: Installer Ruby avec rbenv ou ruby-build - gestion de versions et switch d'environnements
tags:
  - Ruby
tested_with:
  - "rbenv 1.1.2 et ruby-build 20241225 (paquets Debian 13), Ruby 3.4.1"
variables:
  - name: ruby_version
    default: "3.4.1"
---

# Installer Ruby

Installer Ruby, c'est chiant. Voici donc comment faire pour que ce soit un peu moins chiant.

2 méthodes sont possibles : **rbenv** ou **ruby-build**. Il est également possible d'utiliser **ruby-build** en tant que plugin de rbenv. On conseille **ruby-build** si on est en monolithique et rbenv si on souhaite pouvoir switch entre les environnements.

Dans les 2 cas, Ruby est compilé : sans les dépendances de build, c'est la cause d'échec numéro 1. Sur Debian/Ubuntu, ce lot suffit pour un Ruby 3.x :

```bash
apt install build-essential libssl-dev libyaml-dev zlib1g-dev libffi-dev
```

## rbenv

Tout simple. Le paquet Debian tire aussi **ruby-build** (en Recommends), qui fournit `rbenv install`.

```bash
apt install rbenv
```

Sur le paquet Debian (rbenv 1.1.2), `rbenv init` ne fait qu'afficher la ligne à ajouter, il ne touche à rien. On l'ajoute soi-même au `~/.bashrc`, puis on recharge le shell :

```bash
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
exec bash
```

Depuis rbenv 1.3, `rbenv init` sans argument modifie lui-même les fichiers d'init du shell.

Attention, ruby sera installé dans `~/.rbenv/versions/<version>`.

On check après les versions disponibles avec un `rbenv install --list-all`. Il y en a une tonne.

On installe la version voulue (par ex: <ruby_version>) puis on la définit par défaut :

```bash
rbenv install <ruby_version>
rbenv global <ruby_version>
```

Une vieille version (2.7.x et avant, EOL) demande OpenSSL 1.1 : ruby-build le télécharge et le compile en plus, c'est plus long.

### Troubleshooting

Si on n'a pas la version désirée, la liste du paquet Debian est figée à sa date de packaging. On installe **ruby-build** en plugin de rbenv depuis git, il passe devant celui du paquet :

```bash
# As an rbenv plugin
mkdir -p "$(rbenv root)"/plugins
git clone https://github.com/rbenv/ruby-build.git "$(rbenv root)"/plugins/ruby-build
```

Pour récupérer les nouvelles versions plus tard :

```bash
git -C "$(rbenv root)"/plugins/ruby-build pull
```

## ruby-build

ruby-build est plus rudimentaire que rbenv mais fait très bien le taff.
On commence par l'installer en standalone :

```bash
# As a standalone program
git clone https://github.com/rbenv/ruby-build.git
PREFIX=/usr/local ./ruby-build/install.sh
```

Puis comme rbenv, on liste les versions dispo et on installe celle qu'on veut :

```bash
ruby-build --definitions
ruby-build <ruby_version> /usr/local/ruby-<ruby_version>
```

Et voilà, on a un ruby tout beau.

### Troubleshooting

Si **ruby-build** ne propose pas les bonnes versions, il faut l'upgrade pour reload sa liste de versions dispos : chaque version est un fichier de définition embarqué dans ruby-build.

```bash
git -C ruby-build pull
PREFIX=/usr/local ./ruby-build/install.sh
```
