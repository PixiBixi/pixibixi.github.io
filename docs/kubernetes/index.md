---
description: Commandes kubectl, déploiements, ArgoCD, operators et troubleshooting Kubernetes.
tags:
  - Kubernetes
  - kubectl
  - ArgoCD
  - RKE
---

# Kubernetes

On fait tourner des workloads Kubernetes depuis des années — RKE, Rancher, GKE, bare metal. Cette section regroupe tout ce qui est utile au quotidien, du `kubectl` de base jusqu'aux operators et GitOps.

## Contenus

- [CLI — Commandes utiles](cli/useful_commands.md) — kubectl du quotidien
- [CLI — Commandes avancées](cli/advanced_commands.md) — patterns moins évidents
- [CLI — Plugins Krew](cli/krew_plugins.md) — les plugins indispensables
- [CLI — Kubeconfig](cli/kubeconfig.md) — gestion des contextes et fichiers de config
- [CLI — Outils](cli/tools.md) — k9s, stern et autres outils autour de kubectl
- [Deployment — GOMAXPROCS/GOMEMLIMIT](deployment/gomaxprocs_gomemlimit_kubernetes.md) — GOMAXPROCS et limits CPU
- [Deployment — StatefulSet podManagementPolicy](deployment/statefulset_pod_management_policy.md) — OrderedReady vs Parallel
- [Deployment — Cache d'images local](deployment/local_image_cache.md) — éviter les pulls répétés
- [Deployment — Validating Admission Policy](deployment/validating_admission_policy.md) — CEL policies sans webhook
- [ArgoCD — Service Accounts](argocd/argocd_sa.md) — RBAC et accès programmatique
- [ArgoCD — ApplicationSet](argocd/applicationset.md) — déployer sur plusieurs clusters
- [ArgoCD — Sync Waves](argocd/sync_waves.md) — ordonnancer les déploiements
- [ArgoCD — Sync Options](argocd/sync_options.md) — options de synchronisation avancées
- [Operator — Strimzi rollout](operator/strimzi/rollout_strimzi.md) — redémarrer un cluster Kafka géré par Strimzi
- [RKE — Bootstrap cluster](rke/bootstrap_cluster.md) — créer un cluster RKE from scratch
- [RKE — Récupérer le rkestate](rke/recover_rkestate.md) — restaurer l'état en cas de perte
- [Rancher — Reset password](rancher/reset_password.md) — récupérer l'accès admin
- [Troubleshooting — Service Accounts](troubleshooting/troubleshooting_sa.md) — debug RBAC et permissions
- [Troubleshooting — Resize PVC StatefulSet](troubleshooting/resize_pvc_statefulset.md) — agrandir un volume attaché à un StatefulSet
