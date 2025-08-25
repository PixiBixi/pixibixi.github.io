# Commandes Avancées

Quelques commandes avancées Kube toujours utile

Ces commandes proviennent d'un peu partout, principalement la documentation Kubernetes, mais regroupée sur une seule source

!!! note "Lister les pods avec le ServiceAccount par défaut"
    ```bash
    kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.serviceAccountName == "default")]}{.metadata.namespace} {.metadata.name}{"\n"}{end}' 2>/dev/null
    ```

!!! note "Lister les pods tournant sur un noeud spécifique"
    ```bash
    kubectl get pods -A -o wide --field-selector spec.nodeName="ip-172-21-21-206.ec2.internal"
    ```

!!! note "Compter le nombre d'occurence de la même image au sein du cluster"
    ```bash
    kubectl get pods --all-namespaces -o jsonpath="{.items[*].spec.containers[*].image}" |\
    tr -s '[[:space:]]' '\n' |\
    sort |\
    uniq -c|\
    sort -r
    ```

!!! note "Avoir accès aux containers sur une machine"
    ```bash
    nerdctl -H /run/k3s/containerd/containerd.sock --namespace k8s.io ps|grep -v pause
    ```

!!! note "Forcer un noeud RKE2 K8S comme NotReady"
    ```bash
    systemctl stop rke2-agent
    ```

!!! note "Lister toutes les taints de tous les noeuds"
    ```bash
    kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints --no-headers
    ```

!!! note "Lister les CPU/RAM sur les noeuds K8S et allouables sur K8S"
    ```bash
    kubectl get nodes -o custom-columns=NAME:.metadata.name,"CPU_Capacity":.status.capacity.cpu,"CPU_Allocatable":.status.allocatable.cpu,"MEMORY_Capacity":.status.capacity.memory,"MEMORY_Allocatable":.status.allocatable.memory
    ```

!!! note "Lister les FQDN des SVC de tout un namespace"
    ```bash
    kubectl get svc -o jsonpath='{range .items[*]}{.metadata.name}.{.metadata.namespace}.svc.cluster.local{"\n"}{end}'
    ```

!!! note "Split un manifest Kube contenant plusieurs ressources"
    ```bash
    yq -s '.kind +"_" + .metadata.name' my_file
    ```
    You will have this kind of output
    <!-- markdownlint-disable MD038 -->
    ```
    Deployment_release-name-testjd.yml  ExternalSecret_pullsecret.yml  Ingress_release-name-testjd-app-private.yml  Ingress_release-name-testjd-app-public.yml  Ingress_release-name-testjd-app.yml  Service_release-name-testjd.yml
    ```


!!! note "Lister les zones pour les noeuds K8S"
    ```bash
    ➜  docs git:(master) kubectl get nodes -o custom-columns='NAME:metadata.name, REGION:metadata.labels.topology\.kubernetes\.io/region, ZONE:metadata.labels.topology\.kubernetes\.io/zone'
    NAME                                                   REGION     ZONE
    gke-my-node-pool--my-node-pool--0de3fd48-p2qc          us-west1   us-west1-a
    gke-my-node-pool--my-node-pool--0de3fd48-yhl4          us-west1   us-west1-b
    ```
