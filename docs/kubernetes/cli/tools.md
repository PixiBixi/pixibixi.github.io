# Outils pour mieux gérer K8S

Kubernetes c'est bien, mais c'est très vite la galère à tout gérer.
Voici donc quelques outils pour mieux gérer tout ça :

-   **kubectx** permet de switch rapidement entre plusieurs contextes
    K8S : [a voir ici](https://github.com/ahmetb/kubectx).
-   **kubens** permet de switch rapidement entre plusieurs namespaces
    K8S : [a voir ici](https://github.com/ahmetb/kubectx).
-   **stern** permet de tail plusieurs pods rapidement : [a voir
    ici](https://github.com/wercker/stern).
-   **kail** permet de tail plusieurs pods rapidement : [a voir
    ici](https://github.com/boz/kail).
-   **kubepug** permet de vérifier la compatibilité des différentes
    APIVersion : [a voir ici](https://github.com/rikatz/kubepug).

Evidemment, nous avons l'autocomplétion à activer :

``` bash
echo alias k=kubectl >>~/.bashrc
echo complete -F __start_kubectl k >>~/.bashrc/
```

Ou bien en zsh :

    echo alias k=kubectl >>~/.zshrc
    echo compdef __start_kubectl k >>~/.zshrc

En GUI, nous avons [Lens](https://k8slens.dev/) qui nous permet d'avoir
un bon overview de notre cluster rapidement
