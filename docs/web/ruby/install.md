---
description: Installer Ruby avec rbenv ou ruby-build — gestion de versions et switch d'environnements
---

# Installer Ruby

Installer Ruby, c'est chiant. Voici donc comment faire pour que ce soit
un peu moins chiant :-)

2 méthodes sont possibles. **rbenv** ou **ruby-build**. Il est également
possible d'utiliser **ruby-build** en tant que plugin de rbenv. Je
conseille **ruby-build** si vous êtes en monolithique et rbenv si vous
souhaitez pouvoir switch entre les environnements.

## rbenv

Tout simple.

```bash
apt install rbenv
rbenv init
```

Attention, ruby sera installé dans ~/.rbenv/xxx.

On check après les versions disponibles avec un **rbenv install
'--list-all**. Il y en a une tonne.

Installez celle que vous voulez (par ex: 2.7.4) puis définissez là par
défaut :

```bash
rbenv install 2.7.4
rbenv global 2.7.4
```

### Troubleshooting

Si vous n'avez pas la version désirée, n'hésitez pas à installer
**ruby-build** en plugin de rbenv :

```bash
# As an rbenv plugin
$ mkdir -p "$(rbenv root)"/plugins
$ git clone https://github.com/rbenv/ruby-build.git "$(rbenv root)"/plugins/ruby-build
```

## ruby-build

ruby-build est plus rudimentaire que rbenv mais fait très bien le taff.
On commence par l'installer en standalone :

```bash
# As a standalone program
$ git clone https://github.com/rbenv/ruby-build.git
$ PREFIX=/usr/local ./ruby-build/install.sh
```

Puis comme rbenv, on liste les versions dispo, et on installe celle
qu'on veut :

```bash
ruby-build --definitions
ruby-build 2.7.4 /usr/local/ruby-2.7.4
```

Et voilà, on a un ruby tout beau

### Troubleshooting

Si **ruby-build** ne vous propose pas les bonnes versions, il faut
l'upgrade pour reload sa liste de versions dispos.
