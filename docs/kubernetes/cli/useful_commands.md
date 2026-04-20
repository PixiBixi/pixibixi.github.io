---
description: Référence des commandes kubectl pour Kubernetes — gestion des pods, déploiements, services, ConfigMaps, debugging et commandes avancées.
tags:
  - kubectl
---

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

---

Le Cluster Autoscaler publie son état dans un ConfigMap `cluster-autoscaler-status` dans `kube-system`. On lit ça avec `kubectl describe configmap` (alias `kdcm`) — utile pour savoir si le CA est en bonne santé, s'il y a un scale-up/down en cours, ou s'il est en backoff sur un node group.

??? note "cluster-autoscaler-status"
    ```bash
    kubectl describe configmap cluster-autoscaler-status -n kube-system
    # ou avec l'alias kdcm :
    kdcm cluster-autoscaler-status -n kube-system
    ```

    Output typique :

    ```
    Name:         cluster-autoscaler-status
    Namespace:    kube-system
    Annotations:  cluster-autoscaler.kubernetes.io/last-updated: 2024-01-15 10:30:00 +0000 UTC

    Data
    ====
    status:
    ----
    Cluster-wide:
      Health:      Healthy (ready=10 unready=0 notStarted=0 longNotStarted=0 registered=10 longUnregistered=0)
                   LastProbeTime:      2024-01-15 10:30:00 +0000 UTC
                   LastTransitionTime: 2024-01-14 08:00:00 +0000 UTC
      ScaleUp:     NoActivity (ready=10 registered=10)
                   LastProbeTime:      2024-01-15 10:30:00 +0000 UTC
                   LastTransitionTime: 2024-01-15 10:00:00 +0000 UTC
      ScaleDown:   NoCandidates (candidates=0)
                   LastProbeTime:      2024-01-15 10:30:00 +0000 UTC
                   LastTransitionTime: 2024-01-15 10:00:00 +0000 UTC

    NodeGroups:
      Name:        eks-node-group-abc123
      Health:      Healthy (ready=5 unready=0 notStarted=0 longNotStarted=0 registered=5 longUnregistered=0 cloudProviderTarget=5 (minSize=2, maxSize=10))
                   LastProbeTime:      2024-01-15 10:30:00 +0000 UTC
                   LastTransitionTime: 2024-01-14 08:00:00 +0000 UTC
      ScaleUp:     NoActivity (ready=5 cloudProviderTarget=5)
                   LastProbeTime:      2024-01-15 10:30:00 +0000 UTC
                   LastTransitionTime: 2024-01-15 10:00:00 +0000 UTC
      ScaleDown:   NoCandidates (candidates=0)
                   LastProbeTime:      2024-01-15 10:30:00 +0000 UTC
                   LastTransitionTime: 2024-01-15 10:00:00 +0000 UTC
    ```

    Les champs clés à surveiller :

    - **`Health`** — `Healthy` = tout va bien ; `Unhealthy` = des nodes ne s'enregistrent pas
    - **`ScaleUp`** — `NoActivity` = pas de scale-up en cours ; `InProgress` = scale-up déclenché
    - **`ScaleDown`** — `NoCandidates` = rien à supprimer ; si on voit un candidat et que ça dure, le CA est peut-être en backoff
    - **`cloudProviderTarget`** = taille cible du node group côté cloud provider
    - **`minSize` / `maxSize`** = bornes configurées sur le node group

## Voir aussi

* [Commandes avancées](advanced_commands.md) — requêtes jsonpath, jq, et débogage avancé
* [Plugins Krew](krew_plugins.md) — outils essentiels pour améliorer la productivité
* [Outils pour K8S](tools.md) — kubectx, stern, kubecolor et autres utilities
