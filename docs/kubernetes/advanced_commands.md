# Commandes Avancées

Quelques commandes avancées Kube toujours utile


!!! note "Lister les pods avec le ServiceAccount par défaut"
    ```
    kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.serviceAccountName == "default")]}{.metadata.namespace} {.metadata.name}{"\n"}{end}' 2>/dev/null
    ```

!!! note "Lister les pods tournant sur un noeud spécifique"
    ```
    kubectl get pods -A -o wide --field-selector spec.nodeName="ip-172-21-21-206.ec2.internal"
    ```
