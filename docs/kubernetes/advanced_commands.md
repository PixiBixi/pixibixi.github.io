# Commandes Avancées

Quelques commandes avancées Kube toujours utile

Ces commandes proviennent d'un peu partout, principalement la documentation Kubernetes, mais regroupée sur une seule source


!!! note "Lister les pods avec le ServiceAccount par défaut"
    ```
    kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.serviceAccountName == "default")]}{.metadata.namespace} {.metadata.name}{"\n"}{end}' 2>/dev/null
    ```

!!! note "Lister les pods tournant sur un noeud spécifique"
    ```
    kubectl get pods -A -o wide --field-selector spec.nodeName="ip-172-21-21-206.ec2.internal"
    ```

!!! note "Compter le nombre d'occurence de la même image au sein du cluster"
    ```
    kubectl get pods --all-namespaces -o jsonpath="{.items[*].spec.containers[*].image}" |\
    tr -s '[[:space:]]' '\n' |\
    sort |\
    uniq -c|\
    sort -r
    ```
