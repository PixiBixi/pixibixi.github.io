---
description: Découvrir et installer les plugins Krew essentiels pour améliorer sa productivité avec kubectl
tags:
  - kubectl
  - krew
---

# Mes meilleurs plugins Krew

Au quotidien, j'utilise mes différents plugins Krew. Ils me sont d'une importance vitale dans mon workflow. La liste exhaustive est [disponible dans mon Github](https://github.com/PixiBixi/dotfiles/blob/master/Plugins_Krew)

Pour installer krew et importer ma liste de plugin, rien de plus facile sur mac :

```bash
brew install krew
kubectl krew install < ./Plugins_Krew
```

Depuis [brew bundle v4.5](https://github.com/Homebrew/brew/pull/21802), les plugins Krew sont aussi gérables directement dans un `Brewfile` - pratique pour centraliser tout son setup dans un seul endroit :

```ruby
brew "krew"
krew "ctx"
krew "neat"
krew "view-secret"
```

`brew bundle install` installe ensuite tout en une passe, `brew bundle dump` exporte les plugins installés.

Voici en détail à quoi servent-ils :

* `browse-pvc` permet de parcourir un PVC et de voir son contenu
* `df-pv` permet de voir tel la commande `df` l'espace dispo sur son PVC & co
* `get-all` permet de lister toutes les ressources dans un NS
* `klock` permet de rafraichir automatiquement une commande, par exemple `kubectl klock pods` va watch toutes les secondes les changements sur les pods
* `modify-secret` permet de modifier un secret en plain text
* `neat` permet de supprimer d'un yaml tous les champs qui sont gérés par K8S
* `netshoot/netshoot` permet de simplifier l'utilisation du magnifique container netshoot
* `node-resource` affiche l'allocation (`allocation`) et la consommation réelle (`utilization`) par node, avec le CPU, la RAM, le GPU, le nombre de pods et le free restant
* `node-shell` permet d'ouvrir un shell sur un node
* `resource-capacity` permet de voir la capacité d'un node
* `sniff` permet de dump le traffic d'un pod
* `tmux-exec` permet d'exécuter en simultané des commandes sur des containers
* `tree` permet de voir sous formes arbres les différents liens entres les ressources
* `view-secret` permet de voir les secrets
* `view-utilization` est plus ou moins redondant avec `resource-capacity`, et les 2 sont remplacés par `node-resource`

`node-resource` est celui qui sert le plus au quotidien, voici les 2 commandes qu'on tape :

```bash
kubectl node-resource allocation --show-free --show-pod-count
kubectl node-resource utilization --sort-by=mem-percent
```

Les 2 interrogent l'API server, `utilization` a en plus besoin du metrics-server alors qu'`allocation` se contente des requests des pods. Elles acceptent un label selector en argument (`kubectl node-resource allocation "role=worker"`), `--summary=only` pour n'avoir que l'agrégat et `--json` pour scripter derrière.

N'hésitez pas à voir la [liste des plugins Krew](https://krew.sigs.k8s.io/plugins/) et de dénicher quelques pépites

## Voir aussi

* [Commandes utiles](useful_commands.md) - gestion courante des pods et ressources
* [Commandes avancées](advanced_commands.md) - requêtes jsonpath et débogage poussé
* [Outils pour K8S](tools.md) - kubectx, stern, kubecolor et alternatives à kubectl natif
