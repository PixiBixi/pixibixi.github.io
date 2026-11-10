---
description: Récupérer le fichier rkestate d'un cluster RKE depuis le master ou via kubectl
tags:
  - RKE
  - Recovery
---

# Récupérer son fichier rkestate

Le fichier rkestate contient la description complète du cluster Kubernetes - indispensable pour ajouter ou supprimer un node. Si on ne l'a plus, pas de panique, plusieurs méthodes permettent de le récupérer.

!!! warning "Spécifique à RKE1, en fin de vie"
    Le `rkestate` est un mécanisme propre à **RKE1**, dont le support Rancher s'est arrêté
    en juillet 2025. RKE2 n'a pas d'équivalent : l'état vit dans etcd et on repart d'un
    snapshot (`rke2 etcd-snapshot`). Les commandes Rancher 2.2.x plus bas sont celles d'origine
    de la procédure, gardées telles quelles pour coller aux clusters concernés. Voir aussi
    [Bootstrap rapidement son cluster](bootstrap_cluster.md).

Depuis RKE v1.4.19, v1.5.10 et v1.6.0, l'état n'est plus dans la configmap `full-cluster-state` mais dans un secret du même nom (namespace `kube-system`), et la configmap est supprimée au `rke up` suivant. On tente donc le secret d'abord, la configmap ensuite.

## Depuis le master

### Master - RKE CLI

À lancer depuis un nœud controlplane. On réutilise l'image du conteneur `kubelet` (une `rancher/hyperkube`, qui embarque `kubectl`, `jq` et `base64`), comme le fait RKE lui-même :

```bash
KUBELET_IMAGE=$(docker inspect kubelet --format '{{.Config.Image}}')
SSL_DIR=$(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl

# RKE >= v1.4.19 / v1.5.10 / v1.6.0 : state dans un secret
docker run --rm --net=host -v $SSL_DIR:/etc/kubernetes/ssl:ro --entrypoint bash $KUBELET_IMAGE -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml -n kube-system get secret full-cluster-state -o jsonpath="{.data.full-cluster-state}" | base64 -d | jq -r .' > cluster.rkestate

# Versions plus anciennes : state dans une configmap
docker run --rm --net=host -v $SSL_DIR:/etc/kubernetes/ssl:ro --entrypoint bash $KUBELET_IMAGE -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml -n kube-system get configmap full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .' > cluster.rkestate
```

### Master - Rancher v2.2.x

```bash
docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml get configmap -n kube-system full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .' > cluster.rkestate
```

## Depuis une machine cliente, utilisant kubectl

`rke util get-state-file` lit le secret puis, à défaut, la configmap. Il lui faut un `cluster.yml` et le kubeconfig à côté, qu'on régénère d'abord :

```bash
# get kubeconfig file (this one has only *one* context inside)
kubectl config view --flatten > kube_config_cluster.yml
# get cluster.yml (this one references *master nodes only*), JSON is valid YAML for rke
kubectl get secret -n kube-system full-cluster-state -o "jsonpath={.data.full-cluster-state}" | base64 -d | jq '.currentState.rkeConfig' > cluster.yml
# older RKE, state still in the configmap:
# kubectl get configmap -n kube-system full-cluster-state -o "jsonpath={.data.full-cluster-state}" | jq '.currentState.rkeConfig' > cluster.yml
# get rkestate
rke util get-state-file
```

Source originelle : [ce gist](https://gist.github.com/superseb/e9f2628d1033cb20e54f6ee268683a7a)
