---
article: docs/kubernetes/cli/advanced_commands.md
checked: '2026-11-11'
commit: 82e7cd96c87a568bc0e5d891320de8bdff2fb762
sources: []
unpinned: 2
---

# docs/kubernetes/cli/advanced_commands.md

## Findings

- L66 IMPRECISE corrigé : la note précise `rke2-agent` sur un worker et `rke2-server` sur un node server, avec les 2 commandes. Preuve : rancher/rke2 `bundle/lib/systemd/system/rke2-agent.service:27` `ExecStart=/usr/local/bin/rke2 agent` et `rke2-server.service:27` `ExecStart=/usr/local/bin/rke2 server` @f46cb1a9.
- L83 IMPRECISE corrigé : phrase ajoutée sous la commande, sans `-n` on ne voit que le namespace courant, `cluster.local` est le défaut à adapter selon le `clusterDomain` du kubelet. Preuve : kubernetes `cmd/kubeadm/app/apis/kubeadm/v1beta4/defaults.go:33` `DefaultServiceDNSDomain = "cluster.local"`, `staging/src/k8s.io/kubelet/config/v1beta1/types.go:368` `ClusterDomain string` @66762faae31. Le comportement namespace courant sans `-n` est le comportement standard de kubectl (non testé sur un cluster).

## En plus

- Aucun.

## Modernisation

- Aucune suggestion.

## Tests

- Aucun test exécuté, vérification par la source.

## À signaler

- Rien.
