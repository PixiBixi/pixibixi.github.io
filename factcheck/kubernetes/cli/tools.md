---
article: docs/kubernetes/cli/tools.md
checked: '2026-11-11'
commit: f583267613f50634cd1dfec58f460aeddcb5de8f
sources: []
unpinned: 4
---

# docs/kubernetes/cli/tools.md

## Findings

- L30 ERROR corrigé : slash final retiré, ajout de `source <(kubectl completion bash)` avant `complete -o default -F __start_kubectl k`, lignes quotées pour que `>>` écrive la chaîne littérale. Preuve : test local `echo x >> fichier/` : `Not a directory`, rc=1 ; script bash 5.3 qui source la complétion puis `complete -p kk` renvoie bien `complete -o default -F __start_kubectl kk` (kubectl v1.37.1).
- L19 IMPRECISE corrigé : lien kubepug remplacé par <https://github.com/kubepug/kubepug>. Preuve : `gh api repos/rikatz/kubepug` renvoie full_name kubepug/kubepug.
- L21 IMPRECISE corrigé : mention "plus de commit depuis fin 2023" pour ketall et "plus maintenu depuis 2022" pour konfig. Preuve : `gh api` pushed_at 2023-12-06 et 2022-06-30, archived=false. kubeswitch (push 2025-05) laissé sans mention.
- L37 IMPRECISE corrigé, et plus grave que signalé : en zsh, `kubectl completion zsh` définit `_kubectl`, pas `__start_kubectl`. Le bloc devient `source <(kubectl completion zsh)` puis `compdef _kubectl k` ; indentation parasite de 4 espaces retirée. Preuve : zsh 5.9, après `compinit` et `source <(kubectl completion zsh)`, `whence -w __start_kubectl` renvoie `none` alors que `compdef __start_kubectl` l'enregistre quand même (complétion cassée) ; `compdef _kubectl kk2` donne `_comps[kk2]=_kubectl`.

## En plus

- Rien.

## Modernisation

- Aucune suggestion.

## Tests

- kubectl v1.37.1, GNU bash 5.3.20, zsh 5.9 (macOS local).

## À signaler

- La section "Voir aussi" présente konfig dans kubeconfig.md ; à voir si cet article mentionne aussi qu'il n'est plus maintenu (hors périmètre).
