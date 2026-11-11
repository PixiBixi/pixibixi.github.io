---
article: docs/kubernetes/cli/useful_commands.md
checked: '2026-11-11'
commit: 034411b506f6f9c0261f74a47a0a933e44a7c714
sources: []
unpinned: 5
---

# docs/kubernetes/cli/useful_commands.md

## Findings

- L12 IMPRECISE corrigé : phrase ajoutée après la commande, `status.phase!=Running` supprime aussi les `Pending` et les `Succeeded` (Completed), plus une variante `--field-selector=status.phase=Failed -A` pour ne viser que les evicted et les pods en erreur. Preuve : kubernetes `staging/src/k8s.io/api/core/v1/types.go` @origin/master L3843-3857 (phases Pending/Running/Succeeded/Failed/Unknown), `pkg/registry/core/pod/strategy.go` L545 (`status.phase` est un field selector supporté).
- L20 IMPRECISE corrigé : la commande xargs passe maintenant par `-A --field-selector=status.phase=Failed --no-headers` et `xargs -n2 sh -c 'kubectl delete pod -n "$0" "$1"'`, donc plus de ligne d'en-tête envoyée, le namespace de chaque pod est passé, et les Completed ne sont plus visés. Preuve : test de la chaîne awk/xargs avec un stub `kubectl` qui fait `echo`, sortie `kubectl delete pod -n ns1 pod-a` / `kubectl delete pod -n ns2 pod-b`.
- L106 IMPRECISE corrigé : alias perso `kdcm` retiré du texte et du bloc de code (défini nulle part dans le wiki ni dans les dotfiles, `rg -n kdcm`). La commande `kubectl describe configmap` reste.
- L151 IMPRECISE corrigé : `Unhealthy` = cluster ou node group en mauvais état, en général trop de nodes unready ou non enregistrés. Preuve : autoscaler `cluster-autoscaler/clusterstate/api/types.go` @origin/cluster-autoscaler-release-1.36 L43 ("the cluster is in a bad shape"), `clusterstate.go` L493-505 (`IsClusterHealthy` : unready > OkTotalUnreadyCount et > MaxTotalUnreadyPercentage).
- L153 IMPRECISE corrigé : `CandidatesPresent` ajouté pour ScaleDown, `Backoff` déplacé sur ScaleUp. Le finding se trompe en partie : il n'existe pas de `ScaleDown: Backoff`, le backoff n'est posé que sur la condition ScaleUp après un scale-up échoué. Preuve : types.go @release-1.36 L48-64 (ScaleDown = CandidatesPresent/NoCandidates ; Backoff commenté "due to a recently failed scale-up"), `clusterstate.go` L992-998 (`buildScaleUpStatusNodeGroup` est le seul à poser `ClusterAutoscalerBackoff`, avec ErrorCode/ErrorMessage).

## En plus

- L17 : espace insécable parasite dans "la liste qui" (paragraphe réécrit de toute façon).

## Modernisation

- Aucune suggestion fournie.

## Tests

- Stub shell `kubectl` (echo) pour la chaîne `awk | xargs -P20 -n2 sh -c`. Pas de cluster lancé.

## À signaler

- Le clone local `~/Documents/work/src/autoscaler` semble incomplet sur origin/master (ni `clusterstate/api/types.go` ni le tag cluster-autoscaler-1.37.0 ne contiennent ces fichiers) : les preuves citent la branche release-1.36. À vérifier si le format du status a changé en 1.37.
