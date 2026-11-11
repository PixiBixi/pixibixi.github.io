---
article: docs/kubernetes/rke/recover_rkestate.md
checked: '2026-11-11'
commit: 198105795013d106f29cb248d0a7d16dedb2d188
sources:
- repo: rancher-rke
  path: services/controlplane.go
  lines: 367-375
  ref: origin/HEAD
  commit: 7159e9ad3fd5ff468f02c7f91571ce0df39118e8
unpinned: 1
---

# docs/kubernetes/rke/recover_rkestate.md

## Findings

- L21 IMPRECISE corrigé : le seuil 1.19 et le filtre par label étaient faux en pratique, les deux sections "K8s 1.19 et +" / "1.18 et -" sont fusionnées en "Master - RKE CLI", qui prend l'image du conteneur `kubelet` (`docker inspect kubelet --format '{{.Config.Image}}'`) au lieu d'un filtre `org.label-schema.vcs-url`. Preuve : labels lus avec `docker buildx imagetools inspect rancher/hyperkube:<tag>` : `org.label-schema.vcs-url=.../hyperkube.git` sur v1.17.17, v1.18.12 et v1.19.4 ; `.../hyperkube-base.git` seulement sur v1.19.10 ; aucun `org.label-schema.vcs-url` sur v1.18.20, v1.19.16, v1.20.15, v1.21.14, v1.23.16, v1.24.17, v1.26.15 (seulement `org.opencontainers.image.source`). L'ancien filtre renvoie donc une liste vide sur la plupart des versions. RKE fait la même chose avec l'image du kubelet : rancher-rke services/controlplane.go:367-375 @origin/HEAD (`RunGetStateFileFromConfigMap`, `Image: dockerImage`, appelé avec `kubeletImage` dans cluster/state.go:83).
- L47 IMPRECISE corrigé : le `python3 -c 'import yaml...'` (PyYAML requis) est remplacé par `jq '.currentState.rkeConfig'`, le JSON étant du YAML valide ; une phrase avant le bloc explique que `rke util get-state-file` a besoin de `cluster.yml` et du kubeconfig. Preuve : rke cluster/cluster.go:707-720 (`ParseConfig` passe par `yaml.Unmarshal` de yaml.v2, qui lit le JSON) ; mêmes clés que le dump PyYAML d'origine puisque les deux partent du même JSON ; pipeline testé sur kind (voir Tests). `rke util get-kubeconfig` existe (cmd/util.go:39) mais demande déjà un rkestate, donc pas utile ici, non ajouté.

## En plus

- ERROR manqué par le fact-check : depuis RKE v1.4.19, v1.5.10 et v1.6.0, l'état est stocké dans le secret `kube-system/full-cluster-state` et la configmap est supprimée au prochain `rke up`. Les commandes configmap seules échouent donc sur un cluster récent. Ajout d'une phrase d'explication et des variantes secret (`-o jsonpath="{.data.full-cluster-state}" | base64 -d`) côté master et côté client, la configmap restant en fallback. Preuve : rke cluster/cluster.go:88-89 et cluster/state.go `SaveFullStateToK8s` / `GetFullStateFromK8s` (secret d'abord, fallback configmap) @origin/HEAD ; commits e5c4d27b (tag v1.6.0), cf491994 (v1.5.10), f7485b8d (v1.4.19) "Fix 478".
- Avertissement RKE1 : la phrase sur les versions "K8s 1.18/1.19" retirée puisque ces sections n'existent plus, seule la mention Rancher 2.2.x reste.

## Modernisation

- RKE1 EOL / RKE2 `rke2 etcd-snapshot` : déjà présent dans l'avertissement de l'article, rien à ajouter.

## Tests

- `rancher/hyperkube:v1.18.20-rancher1` et `v1.26.15-rancher1` (amd64 émulé) : `kubectl`, `bash`, `jq`, `base64` présents ; `docker inspect kubelet --format '{{.Config.Image}}'` sur un conteneur nommé kubelet renvoie bien `rancher/hyperkube:v1.26.15-rancher1`.
- kind (serveur v1.37.0) : secret et configmap `full-cluster-state` créés avec un JSON d'exemple ; les pipelines `get secret ... | base64 -d | jq '.currentState.rkeConfig'` et `get configmap ... | jq ...` sortent le même `rkeConfig`. Cluster supprimé ensuite.

## À signaler

- Non testé sur un vrai cluster RKE1 : la lecture du secret avec `kubecfg-kube-node.yaml` (identité system:node) dépend du RBAC. RKE lie bien le groupe `system:nodes` au ClusterRole `system:node` (templates/authz.go:30-45) mais je n'ai pas vérifié que ce rôle autorise `get secrets` dans cette config, ni l'effet du Node authorizer. Si ça renvoie Forbidden, il faut un kubeconfig admin.
- Section "Master - Rancher v2.2.x" (label `io.cattle.agent=true`) laissée telle quelle, non vérifiée.
