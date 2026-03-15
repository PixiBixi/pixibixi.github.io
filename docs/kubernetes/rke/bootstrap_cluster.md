---
description: Déployer un cluster Kubernetes avec RKE via cluster.yaml — bootstrap et configuration initiale
tags:
  - RKE
---

# Bootstrap rapidement son cluster

Pour bootstrap rapidement un cluster, on peut utiliser RKE, un outil Rancher. À noter qu'on utilise RKE et non RKEv2 car ce dernier se base sur K3S et non K8S, ce qui apporte beaucoup moins de fonctionnalités.

RKE c'est un binaire et un fichier `cluster.yaml`. Il peut être exécuté depuis le serveur lui-même ou en remote. La dernière version est disponible [ici](https://github.com/rancher/rke/#latest-release).

Voici un exemple de fichier `cluster.yaml` :

<!-- markdownlint-disable MD046 -->
```yaml
####################################
## CLUBIC Rancher master cluster ##
####################################

cluster_name: K8S-CC-Preprod

# Nodes definition
# ---
nodes:
  - address: master01.rancher.k8s.local
    role: [controlplane, etcd, worker]
    internal_address: 192.168.1.220
    hostname_override: master01.rancher.k8s
    user: mgmt-rancher
    port: "1998"
    ssh_key_path: ~/.ssh/id_ed25519

  - address: master02.rancher.k8s.local
    role: [controlplane, etcd, worker]
    internal_address: 192.168.1.221
    hostname_override: master02.rancher.k8s
    user: mgmt-rancher
    port: "1998"
    ssh_key_path: ~/.ssh/id_ed25519

  - address: master03.rancher.k8s.local
    role: [controlplane, etcd, worker]
    internal_address: 192.168.1.222
    hostname_override: master03.rancher.k8s
    user: mgmt-rancher
    port: "1998"
    ssh_key_path: ~/.ssh/id_ed25519

  - address: node01.rancher.k8s.local
    role: [worker]
    internal_address: 192.168.1.210
    hostname_override: node01.rancher.k8s
    user: mgmt-rancher
    port: "1998"
    ssh_key_path: ~/.ssh/id_ed25519

  - address: node02.rancher.k8s.local
    role: [worker]
    internal_address: 192.168.1.211
    hostname_override: node02.rancher.k8s
    user: mgmt-rancher
    port: "1998"
    ssh_key_path: ~/.ssh/id_ed25519

  - address: node03.rancher.k8s.local
    role: [worker]
    internal_address: 192.168.1.212
    hostname_override: node03.rancher.k8s
    user: mgmt-rancher
    port: "1998"
    ssh_key_path: ~/.ssh/id_ed25519


# Service settings
# ---
services:
  kube-api:
    extra-args:
      external-hostname: rancher.k8s.domain.tld
  etcd:
    snapshot: true
    creation: 6h
    retention: 24h


# Authentication settings
# ---
authentication:
  strategy: x509
  sans:
    - rancher.k8s.domain.tld


# NGINX ingress controller settings
# ---
ingress:
  provider: nginx
  network_mode: hostNetwork
  options:
    use-forwarded-headers: "true"
```
<!-- markdownlint-enable MD046 -->

Une fois l'infrastructure décrite, une simple commande suffit : `rke up`

On spécifie l'user **mgmt-rancher** pour le déploiement et on distingue les nœuds master des workers. L'adresse spécifiée doit idéalement être sur un réseau privé et être résolvable.

Voici un fichier hosts adapté :

<!-- markdownlint-disable MD046 -->
```ini
# K8S
192.168.1.220   master01.vlan master01.rancher.k8s    master01.rancher.k8s.local
192.168.1.221   master02.vlan master02.rancher.k8s    master02.rancher.k8s.local
192.168.1.222   master03.vlan master03.rancher.k8s    master03.rancher.k8s.local

192.168.1.210   node01.vlan node01.rancher.k8s    node01.rancher.k8s.local
192.168.1.211   node02.vlan node02.rancher.k8s    node02.rancher.k8s.local
192.168.1.212   node03.vlan node03.rancher.k8s    node03.rancher.k8s.local
```
<!-- markdownlint-enable MD046 -->

On active également quelques options supplémentaires comme le snapshot automatique d'etcd toutes les 6h. Des [exemples](https://rancher.com/docs/rke/latest/en/example-yamls/) sont disponibles sur le site officiel de Rancher — il est possible par exemple d'envoyer les snapshots automatiquement dans un S3.
