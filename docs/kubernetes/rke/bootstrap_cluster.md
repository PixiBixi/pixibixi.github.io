---
description: Déployer un cluster Kubernetes avec RKE via cluster.yaml - bootstrap et configuration initiale
tags:
  - RKE
---

# Bootstrap rapidement son cluster

!!! warning "RKE1 est en fin de vie"
    Cet article documente **RKE1**, dont le support Rancher s'est arrêté en juillet 2025.
    Pour un nouveau cluster, partir sur [RKE2](https://docs.rke2.io/) : ce n'est pas un K3s, mais il en reprend le socle (K3s est embarqué comme bibliothèque Go) et le modèle de déploiement, et ajoute le durcissement CIS et le support FIPS. Le contenu ci-dessous reste valable pour maintenir un cluster RKE1 existant.

Pour bootstrap rapidement un cluster, on peut utiliser RKE, un outil Rancher.

RKE c'est un binaire et un fichier `cluster.yaml`. Il peut être exécuté depuis le serveur lui-même ou en remote. La dernière version est disponible [ici](https://github.com/rancher/rke/releases).

Voici un exemple de fichier `cluster.yaml` :

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
    extra_args:
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

Une fois l'infrastructure décrite, une simple commande suffit : `rke up`

On spécifie l'user **mgmt-rancher** pour le déploiement et on distingue les nœuds master des workers. L'adresse spécifiée doit idéalement être sur un réseau privé et être résolvable.

Voici un fichier hosts adapté :

```ini
# K8S
192.168.1.220   master01.vlan master01.rancher.k8s    master01.rancher.k8s.local
192.168.1.221   master02.vlan master02.rancher.k8s    master02.rancher.k8s.local
192.168.1.222   master03.vlan master03.rancher.k8s    master03.rancher.k8s.local

192.168.1.210   node01.vlan node01.rancher.k8s    node01.rancher.k8s.local
192.168.1.211   node02.vlan node02.rancher.k8s    node02.rancher.k8s.local
192.168.1.212   node03.vlan node03.rancher.k8s    node03.rancher.k8s.local
```

On active également quelques options supplémentaires comme le snapshot automatique d'etcd toutes les 6h. Des [exemples](https://rke.docs.rancher.com/example-yamls) sont disponibles sur la doc officielle de RKE - il est possible par exemple d'envoyer les snapshots automatiquement dans un S3 (`backup_config`).

Attention aux clés du `cluster.yaml` : RKE attend des underscores (`extra_args`, `hostname_override`...) et ignore sans erreur une clé inconnue, donc une faute de frappe passe inaperçue au `rke up`.
