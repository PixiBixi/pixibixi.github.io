---
description: Découvrir et installer les plugins Krew essentiels pour améliorer sa productivité avec kubectl
tags:
  - kubectl
  - krew
---

# Mes meilleurs plugins Krew

Au quotidien, j'utilise mes différents plugins Krew. Ils me sont d'une importance vitale dans mon workflow. La liste exhaustive est [dans le Brewfile de mes dotfiles](https://github.com/PixiBixi/dotfiles/blob/master/packages/Brewfile), sur les lignes `krew "..."`

Ça n'a pas toujours été le cas, longtemps la liste vivait dans un fichier texte à part, un plugin par ligne, qu'on rejoue comme ça :

```bash
brew install krew
kubectl krew install < ./mes_plugins
```

Depuis [brew bundle v4.5](https://github.com/Homebrew/brew/pull/21802), les plugins Krew sont gérables directement dans un `Brewfile` - pratique pour centraliser tout son setup dans un seul endroit :

```ruby
brew "krew"
krew "ctx"
krew "neat"
krew "view-secret"
```

`brew bundle install` installe ensuite tout en une passe, `brew bundle dump` exporte les plugins installés.

Attention aux plugins qui viennent d'un index custom (`netshoot/netshoot`, `pixibixi/ice`) : `brew bundle` appelle juste `kubectl krew install`, il n'ajoute pas l'index tout seul. On le fait une fois avant :

```bash
kubectl krew index add netshoot https://github.com/nilic/kubectl-netshoot.git
kubectl krew index add pixibixi https://github.com/PixiBixi/krew-index.git
```

Voici en détail à quoi servent-ils :

* `cnpg` permet de gérer ses clusters CloudNativePG : status, backup, promotion, reload, sans écrire un seul YAML
* `df-pv` permet de voir tel la commande `df` l'espace dispo sur son PVC & co
* `klock` permet de rafraichir automatiquement une commande, par exemple `kubectl klock pods` va watch toutes les secondes les changements sur les pods
* `neat` permet de supprimer d'un yaml tous les champs qui sont gérés par K8s
* `netshoot/netshoot` permet de simplifier l'utilisation du magnifique container netshoot
* `node-resource` affiche l'allocation (`allocation`) et la consommation réelle (`utilization`) par node, avec le CPU, la RAM, le GPU, le nombre de pods et le free restant
* `node-shell` permet d'ouvrir un shell sur un node
* `pixibixi/ice` est mon fork de kubectl-ice : il montre au niveau container les volumes, images, ports, commandes exec et la conso CPU/RAM (metrics-server requis), avec un mode watch en plus
* `pixibixi/iexec` est mon fork de [kubectl-iexec](https://github.com/PixiBixi/kubectl-iexec), abandonné en amont depuis 2023 : on choisit le pod et le container dans un prompt avant le `kubectl exec`, `--first` prend le premier qui matche sans rien demander, et la sortie reste propre quand on la pipe (`kubectl iexec api printenv | sort > .env`)
* `pixibixi/klens` est mon plugin qui regroupe les inspections read-only qu'on tape en boucle : node pools, taints, capacité, zones, pods par node, requests/limits, PVC bindings
* `tmux-exec` permet d'exécuter en simultané des commandes sur des containers
* `view-secret` permet de voir les secrets
* `view-utilization` fait à peu près la même chose que `node-resource`, qui le remplace petit à petit

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
* [Outils pour K8s](tools.md) - kubectx, stern, kubecolor et alternatives à kubectl natif
