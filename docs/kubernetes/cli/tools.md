# Outils pour mieux gérer K8S

Kubernetes c'est bien, mais c'est très vite la galère à tout gérer.
Voici donc quelques outils pour mieux gérer tout ça :

  * `kubectx` permet de switch rapidement entre plusieurs contextes
    K8S : [a voir ici](https://github.com/ahmetb/kubectx).
  * `kubeswitch` permet tout comme kubectx de switch de contextes rapidement. Avantage de kubeswitch, le switch n'est pas général mais est lié à la session, on peut donc utiliser sur un même terminal différents clusters : [a voir ici](https://github.com/danielfoehrKn/kubeswitch)
  * `kubens` permet de switch rapidement entre plusieurs namespaces K8S : [a voir ici](https://github.com/ahmetb/kubectx).
  * `stern` permet de tail plusieurs pods rapidement : [a voir ici](https://github.com/wercker/stern)
  * `kail` permet de tail plusieurs pods rapidement : [a voir ici](https://github.com/boz/kail).
  * `kubepug` permet de vérifier la compatibilité des différentes APIVersion : [a voir ici](https://github.com/rikatz/kubepug).
  * `pluto` est un concurrent à kubepug, peut être plus facile : [a voir ici](https://github.com/FairwindsOps/pluto)
  * `ketall` permet de (réellement) lister toutes les ressources de son cluster : [a voir ici](https://github.com/corneliusweig/ketall)
  * `konfig` est un outil permettant de gérer sur `~/.kube/config` facilement, en faisant des merge, split... : [a voir ici](https://github.com/corneliusweig/konfig)
  * `kubecolor` est un outil qui nous permet d'avoir une magnifique coloration syntaxique sur kubectl : [a voir ici](https://github.com/kubecolor/kubecolor)
  * `kdash` est un dashboard Kubernetes en CLI, tel que k9s : [a voir ici](https://github.com/kdash-rs/kdash)

Evidemment, nous avons l'autocomplétion à activer :

```bash
echo alias k=kubectl >> ~/.bashrc
echo complete -F __start_kubectl k >> ~/.bashrc/
```

Ou bien en zsh :

```
    echo alias k=kubectl >> ~/.zshrc
    echo compdef __start_kubectl k >> ~/.zshrc
```

En GUI, nous avons [Lens](https://k8slens.dev/) qui nous permet d'avoir
un bon overview de notre cluster rapidement
