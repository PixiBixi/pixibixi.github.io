---
description: Récupérer le fichier rkestate d'un cluster RKE depuis le master ou via kubectl
tags:
  - RKE
  - Recovery
---

# Récupérer son fichier rkestate

Le fichier rkestate contient la description complète du cluster Kubernetes — indispensable pour ajouter ou supprimer un node. Si on ne l'a plus, pas de panique, plusieurs méthodes permettent de le récupérer.

## Depuis le master

### Master - K8S (1.19 et +)

À lancer depuis un nœud controlplane, utilise n'importe quelle image hyperkube :

```bash
docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=org.label-schema.vcs-url=https://github.com/rancher/hyperkube-base.git) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml -n kube-system get configmap full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .' > cluster.rkestate
```

### Master - K8S (1.18 et -)

```bash
docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=org.label-schema.vcs-url=https://github.com/rancher/hyperkube.git) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml -n kube-system get configmap full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .' > cluster.rkestate
```

### Master - Rancher v2.2.x

```bash
docker run --rm --net=host -v $(docker inspect kubelet --format '{{ range .Mounts }}{{ if eq .Destination "/etc/kubernetes" }}{{ .Source }}{{ end }}{{ end }}')/ssl:/etc/kubernetes/ssl:ro --entrypoint bash $(docker inspect $(docker images -q --filter=label=io.cattle.agent=true) --format='{{index .RepoTags 0}}' | tail -1) -c 'kubectl --kubeconfig /etc/kubernetes/ssl/kubecfg-kube-node.yaml get configmap -n kube-system full-cluster-state -o json | jq -r .data.\"full-cluster-state\" | jq -r .' > cluster.rkestate
```

## Depuis une machine cliente, utilisant kubectl

```bash
# get kubeconfig file (this one has only *one* context inside)
kubectl config view --flatten > kube_config_cluster.yml
# get cluster.yml (this one references *master nodes only*)
kubectl get configmap -n kube-system full-cluster-state -o "jsonpath={.data.full-cluster-state}" | python3 -c 'import json, yaml, sys; yaml.safe_dump(json.load(sys.stdin).get("currentState", []).get("rkeConfig",[]), sys.stdout)' > cluster.yml
# get rkestate
rke util get-state-file
```

Source originelle : [ce gist](https://gist.github.com/superseb/e9f2628d1033cb20e54f6ee268683a7a)
