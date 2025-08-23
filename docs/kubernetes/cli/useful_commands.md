# Commandes utiles pour K8S

Pour K8S, les commandes sont assez difficiles de base. De plus, il existe certaines commandes assez tricky que je vais essayer de répertorier ici

???+ note "Delete all pods not running"
    ```bash
    kubectl delete pods --field-selector=status.phase!=Running -A
    ```

---

Permet de supprimer les pods de la liste qui ne sont pas running (Dont les evicted). Si vous en avez beaucoup, on passe par xargs comme des barbares

???+ note "Delete massive pods"
    ```bash
    kubectl get pods |grep -v Running |awk '{print $1}' |xargs -P20 -I{} kubectl delete pod {}
    ```

---

Liste toutes les ressources K8S qui sont link à la génération d'un certificat

??? note "Resources linked to a certificate"
    ```bash
    $ kubectl get Issuers,ClusterIssuers,Certificates,CertificateRequests,Orders,Challenges -A
    NAMESPACE   NAME                                            READY   AGE
    teleport    issuer.cert-manager.io/letsencrypt-production   True    392d

    NAMESPACE   NAME                                   READY   SECRET         AGE
    teleport    certificate.cert-manager.io/teleport   True    teleport-tls   392d

    NAMESPACE   NAME                                                APPROVED   DENIED   READY   ISSUER                   REQUESTOR                                         AGE
    teleport    certificaterequest.cert-manager.io/teleport-467wl   True                True    letsencrypt-production   system:serviceaccount:cert-manager:cert-manager   213d
    teleport    certificaterequest.cert-manager.io/teleport-7xs8t   True                True    letsencrypt-production   system:serviceaccount:cert-manager:cert-manager   33d
    teleport    certificaterequest.cert-manager.io/teleport-bbw7j   True                True    letsencrypt-production   system:serviceaccount:cert-manager:cert-manager   272d
    teleport    certificaterequest.cert-manager.io/teleport-jb2mk   True                True    letsencrypt-production   system:serviceaccount:cert-manager:cert-manager   153d
    teleport    certificaterequest.cert-manager.io/teleport-kgxhx   True                True    letsencrypt-production   system:serviceaccount:cert-manager:cert-manager   332d
    teleport    certificaterequest.cert-manager.io/teleport-splkd   True                True    letsencrypt-production   system:serviceaccount:cert-manager:cert-manager   93d

    NAMESPACE   NAME                                                   STATE   AGE
    teleport    order.acme.cert-manager.io/teleport-467wl-1964815354   valid   213d
    teleport    order.acme.cert-manager.io/teleport-7xs8t-1964815354   valid   33d
    teleport    order.acme.cert-manager.io/teleport-bbw7j-1964815354   valid   272d
    teleport    order.acme.cert-manager.io/teleport-jb2mk-1964815354   valid   153d
    teleport    order.acme.cert-manager.io/teleport-kgxhx-1964815354   valid   332d
    teleport    order.acme.cert-manager.io/teleport-splkd-1964815354   valid   93d
    ```

---

Permet d'exécuter la même commande sur de multiples pods

???+ note "Same commands on multiples pods"
    ```bash
    kubectl get pods -o name | xargs -I{} kubectl exec {} -- <command goes here>
    ```

---

Permet de lister les PVC qui sont actuellement asssociés à un pod

??? note "List all PVC bound to a pod"
    ```bash
    $ kubectl get pods --all-namespaces -o=json | jq -c '.items[] | {name: .metadata.name, namespace: .metadata.namespace, claimName: .spec |  select( has ("volumes") ).volumes[] | select( has ("persistentVolumeClaim") ).persistentVolumeClaim.claimName }'
    {"name":"loki-backend-0","namespace":"dyn-tools","claimName":"data-loki-backend-0"}
    {"name":"loki-write-0","namespace":"dyn-tools","claimName":"data-loki-write-0"}
    {"name":"loki-write-1","namespace":"dyn-tools","claimName":"data-loki-write-1"}
    {"name":"prometheus-alertmanager-0","namespace":"dyn-tools","claimName":"storage-prometheus-alertmanager-0"}
    {"name":"prometheus-server-7774557469-6jrhk","namespace":"dyn-tools","claimName":"prometheus-server"}
    ```

---

Permet de lister tous les secrets et de les decoder

??? note "Decode all secrets from a secret"
    ```bash
    kubectl get secret postgresql-secrets -o go-template='{{ range $key, $value := .data }}{{ $key }}{{ ": " }}{{ $value | base64decode }}{{ "\n" }}{{ end }}'
    ```

---

Permet d'attacher un container a un pod existant, ici, nous utilisons l'image busybox dans sa version 1.28, nous attachons notre container au pod `thanos-bidder-euw1-prod-sidecar-query-57bfd8f848-pmdp9` en partageant le process namespace du container query

???+ note "Debug pod"
    ```bash
    kubectl debug -it thanos-bidder-euw1-prod-sidecar-query-57bfd8f848-pmdp9 --image=busybox:1.28 --target=query
    ```

---
Permet de lister les PVC de tous les NS mais également de lister le pod et le noeud associé

??? note "List PVC bound to a pod and node"
    ```bash
    (echo -e "NAMESPACE\tPOD\tNODE\tPVC" && \
    kubectl get pods -A -o json | jq -r '
      .items[]
      | select(.spec.volumes[]? | has("persistentVolumeClaim"))
      | . as $pod
      | $pod.spec.volumes[]
      | select(.persistentVolumeClaim)
      | "\($pod.metadata.namespace)\t\($pod.metadata.name)\t\($pod.spec.nodeName)\t\(.persistentVolumeClaim.claimName)"') \
    | column -t -s $'\t'
    ```

---

Permet de forcer le refresh de tous les ExternalSecrets qui sont en erreur

??? note "Force refresh of ExternalSecrets"
    ```bash
    while read -r ES
    do
        NS=$(echo $ES | cut -d ' ' -f1)
        ES_NAME=$(echo $ES | cut -d ' ' -f2)
        kubectl annotate es -n $NS $ES_NAME force-sync=$(date +%s) --overwrite
    done < <(kubectl get es -A|grep -i SecretSyncedError|awk {'print $1 " " $2'})
    ```
