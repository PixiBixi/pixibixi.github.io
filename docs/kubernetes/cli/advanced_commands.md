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

!!! note "Avoir accès aux containers sur une machine"
    ```
    nerdctl -H /run/k3s/containerd/containerd.sock --namespace k8s.io ps|grep -v pause
    ```

!!! note "Forcer un noeud RKE2 K8S comme NotReady"
    ```
    systemctl stop rke2-agent
    ```

!!! note "Lister toutes les taints de tous les noeuds"
    ```
    kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints --no-headers
    ```

!!! note "Lister les CPU/RAM sur les noeuds K8S et allouables sur K8S"
    ```
    kubectl get nodes -o custom-columns=NAME:.metadata.name,"CPU_Capacity":.status.capacity.cpu,"CPU_Allocatable":.status.allocatable.cpu,"MEMORY_Capacity":.status.capacity.memory,"MEMORY_Allocatable":.status.allocatable.memory
    ```

!!! note "Lister les FQDN des SVC de tout un namespace"
    ```
    kubectl get svc -o jsonpath='{range .items[*]}{.metadata.name}.{.metadata.namespace}.svc.cluster.local{"\n"}{end}'
    ```
