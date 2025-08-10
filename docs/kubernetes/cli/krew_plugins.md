# Mes meilleurs plugins Krew

Au quotidien, j'utilise mes différents plugins Krew. Ils me sont d'une importance vitale dans mon workflow. La liste exhaustive est [disponible dans mon Github](https://github.com/PixiBixi/dotfiles/blob/master/Plugins_Krew)

Pour installer krew et importer ma liste de plugin, rien de plus facile sur mac :

```bash
brew install krew
kubectl krew install < ./Plugins_Krew
```

Voici en détail à quoi servent-ils :

* `browse-pvc` permet de parcourir un PVC et de voir son contenu
* `df-pv` permet de voir tel la commande `df` l'espace dispo sur son PVC & co
* `get-all` permet de lister toutes les ressources dans un NS
* `klock` permet de rafraichir automatiquement une commande, par exemple `kubectl krew pods` va watch toutes les secondes les changements sur les pods
* `modify-secret` permet de modifier un secret en plain text
* `neat` permet de supprimer d'un yaml tous les champs qui sont gérés par K8S
* `netshoot/netshoot` permet de simplifier l'utilisation du magnifique container netshoot
* `node-shell` permet d'ouvrir un shell sur un node
* `resource-capacity` permet de voir la capacité d'un node
* `sniff` permet de dump le traffic d'un pod
* `tmux-exec` permet d'exécuter en simultané des commandes sur des containers
* `tree` permet de voir sous formes arbres les différents liens entres les ressources
* `view-secret` permet de voir les secrets
* `view-utilization`  est plus ou moins redondant avec `resource-capacity`

N'hésitez pas à voir la [liste des plugins Krew](https://krew.sigs.k8s.io/plugins/) et de dénicher quelques pépites
