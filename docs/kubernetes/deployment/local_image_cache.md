---
description: Déployer Spegel comme cache de registre OCI local sur Kubernetes pour accélérer les pulls d'images
tags:
  - Docker
  - Registry
---

# Spegel : Un OCI registry cache stateless

Dans les clusters Kubernetes, chaque nœud pull les images depuis des registres distants — ce qui surcharge ces registres et peut déclencher des rate limits (notamment sur DockerHub). **Spegel** est un proxy de cache d'images local qui vise à résoudre ce problème en accélérant la distribution des images.

!!! warning "Containerd uniquement"
    Spegel ne prend en charge que **Containerd**, pas Docker.

## Principe de fonctionnement

Spegel est déployé sur chaque nœud en daemonset. Contrairement à un pull-through cache classique, il ne stocke rien en plus : il expose les layers déjà présents dans le content store de Containerd. La vraie valeur ajoutée est le **P2P** : les nœuds se partagent les images entre eux au lieu de retaper systématiquement sur le registre distant.

Chaque nœud monte un réseau P2P avec libp2p et une DHT Kademlia, et annonce les digests qu'il possède localement. Quand un nœud tente de tirer une image :

![Spegel Overview](./_img/spegel_overview.gif)

1. La requête est redirigée vers Spegel via le mécanisme de *Registry Mirror* de Containerd.
2. Spegel cherche le layer dans la DHT. Si un autre nœud du cluster l'a déjà, il le récupère directement depuis ce peer, sans sortir du cluster.
3. Si personne ne l'a, fallback transparent vers le registre distant. Le layer devient ensuite disponible pour les autres nœuds.

Le partage est donc intra-cluster : le premier pull d'une image neuve tape toujours l'upstream, mais les nœuds suivants se servent entre eux. Il n'y a pas de pré-seeding.

## Compatibilité

Spegel requiert certains paramètres spécifiques, donc il n'est pas compatible avec tous les clusters. Le point bloquant est l'accès à `config_path` de Containerd : les offres managées qui ne le laissent pas modifier sont hors-jeu, GKE par exemple. EKS passe (cf. le script plus bas), Talos aussi via un patch machine config. Le tableau de compatibilité complet est sur le [site officiel](https://spegel.dev/docs/getting-started/#compatibility).

## Installation

### Helm chart

La méthode la plus simple est via le helm chart fourni :

```bash
helm upgrade --create-namespace --namespace spegel --install spegel oci://ghcr.io/spegel-org/helm-charts/spegel
```

### Kustomize

Si l'outil de déploiement utilise Kustomize (ArgoCD/FluxCD) :

```yaml
helmCharts:
  - name: spegel
    repo: oci://ghcr.io/spegel-org/helm-charts
    releaseName: spegel
    namespace: spegel
    valuesFile: values.yaml
```

Par défaut, le `values.yaml` ne nécessite quasiment aucune modification hormis l'activation du serviceMonitor si on dispose de la CRD.

## Configuration de Containerd

Spegel a besoin de 2 paramètres dans `/etc/containerd/config.toml`.

D'abord activer `config_path` pour que Containerd lise les configs de mirror par registre (c'est ce qui permet de rediriger les pulls vers Spegel) :

```toml
[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"
```

Ensuite désactiver `discard_unpacked_layers` (par défaut à `true` sur certaines distros), sinon Containerd jette les layers décompressés et Spegel n'a plus rien à partager :

```toml
discard_unpacked_layers = false
```

### Pour EKS

Petit script pour rendre un nœud EKS Spegel-compatible :

```bash
grep "discard_unpacked_layers" /etc/containerd/config.toml && \
sudo cp /etc/containerd/config.toml /etc/containerd/config.toml.bak && \
sudo sed -i 's/^\(\s*\)discard_unpacked_layers\s*=\s*true/\1discard_unpacked_layers = false/' /etc/containerd/config.toml && \
grep "discard_unpacked_layers" /etc/containerd/config.toml && \
sudo systemctl restart containerd
```

## Test de fonctionnement

Pour vérifier que Spegel fonctionne, on devrait observer ce genre de lignes dans les logs :

```bash
spegel-l75n8 registry {"time":"2025-10-25T16:34:14.191396548Z","level":"INFO","source":{"function":"github.com/spegel-org/spegel/pkg/state.Track","file":"github.com/spegel-org/spegel/pkg/state/state.go","line":86},"msg":"OCI event","key":"docker.io/library/nginx:latest","type":"CREATE"}
spegel-l75n8 registry {"time":"2025-10-25T16:34:14.236101335Z","level":"INFO","source":{"function":"github.com/spegel-org/spegel/pkg/state.Track","file":"github.com/spegel-org/spegel/pkg/state/state.go","line":86},"msg":"OCI event","key":"sha256:029d4461bd98f124e531380505ceea2072418fdf28752aa73b7b273ba3048903","type":"CREATE"}
```

L'image n'est pas disponible sur le nœud et est donc créée. Au 2ème pull, on s'aperçoit que celui-ci ne dure que quelques millisecondes vs une dizaine de secondes au premier pull.
