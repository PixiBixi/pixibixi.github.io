---
description: Outils et utilitaires essentiels pour améliorer l'expérience utilisateur et la gestion de clusters Kubernetes
tags:
  - Kubernetes
  - CLI
---

# Outils pour mieux gérer K8s

Kubernetes c'est bien, mais c'est très vite la galère à tout gérer.
Voici donc quelques outils pour mieux gérer tout ça :

* `kubectx` permet de switch rapidement entre plusieurs contextes
    K8s : [a voir ici](https://github.com/ahmetb/kubectx).
* `kubeswitch` permet tout comme kubectx de switch de contextes rapidement. Avantage de kubeswitch, le switch n'est pas général mais est lié à la session, on peut donc utiliser sur un même terminal différents clusters : [a voir ici](https://github.com/danielfoehrKn/kubeswitch)
* `kubens` permet de switch rapidement entre plusieurs namespaces K8s : [a voir ici](https://github.com/ahmetb/kubectx).
* `stern` permet de tail plusieurs pods rapidement : [a voir ici](https://github.com/stern/stern)
* `kail` permet de tail plusieurs pods rapidement : [a voir ici](https://github.com/boz/kail).
* `kubepug` permet de vérifier la compatibilité des différentes APIVersion : [a voir ici](https://github.com/kubepug/kubepug).
* `pluto` est un concurrent à kubepug, peut être plus facile : [a voir ici](https://github.com/FairwindsOps/pluto)
* `ketall` permet de (réellement) lister toutes les ressources de son cluster, plus de commit depuis fin 2023 : [a voir ici](https://github.com/corneliusweig/ketall)
* `konfig` est un outil permettant de gérer sur `~/.kube/config` facilement, en faisant des merge, split..., plus maintenu depuis 2022 : [a voir ici](https://github.com/corneliusweig/konfig)
* `kubecolor` est un outil qui nous permet d'avoir une magnifique coloration syntaxique sur kubectl : [a voir ici](https://github.com/kubecolor/kubecolor)
* `kdash` est un dashboard Kubernetes en CLI, tel que k9s : [a voir ici](https://github.com/kdash-rs/kdash)

Evidemment, nous avons l'autocomplétion à activer. Le script de complétion doit être chargé avant de le brancher sur l'alias :

```bash
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc
```

Ou bien en zsh, où la fonction s'appelle `_kubectl` (après `compinit`) :

```bash
echo 'source <(kubectl completion zsh)' >> ~/.zshrc
echo 'alias k=kubectl' >> ~/.zshrc
echo 'compdef _kubectl k' >> ~/.zshrc
```

En GUI, nous avons [Lens](https://k8slens.dev/) qui nous permet d'avoir
un bon overview de notre cluster rapidement

## Voir aussi

* [Commandes utiles](useful_commands.md) - gestion courante des pods et déploiements
* [Commandes avancées](advanced_commands.md) - requêtes jsonpath et jq avancées
* [Plugins Krew](krew_plugins.md) - plugins kubectl pour étendre les fonctionnalités
* [Gérer son kubeconfig](kubeconfig.md) - kubectx, kubeswitch et konfig pour les contextes
