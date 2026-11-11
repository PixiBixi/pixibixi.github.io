---
article: docs/containers/kafka/kafkactl.md
checked: '2026-11-11'
commit: 2e5d43deb06b06f8e0bfaf89b86b3a2585f2dd57
sources:
- repo: deviceinsight-kafkactl
  path: README.adoc
  lines: '33'
  ref: origin/main
  commit: 3ab49c39b08dce3e1dbc20d5de501a3547e2364a
- repo: deviceinsight-kafkactl
  path: internal/consumergroups/consumer-group-operation.go
  lines: 152-186
  ref: origin/main
  commit: 3ab49c39b08dce3e1dbc20d5de501a3547e2364a
unpinned: 0
---

# docs/containers/kafka/kafkactl.md

## Findings

- L20 IMPRECISE corrigé : installation par `brew install kafkactl` seul. Preuve : README.adoc:33 @origin/main du clone deviceinsight-kafkactl, et `brew info --json=v2 kafkactl` : formule homebrew-core `kafkactl` 5.21.0 (pas un cask).
- L81 IMPRECISE corrigé en partie : l'exemple montre maintenant la table des offsets/lag avant la table des membres, avec les flags `--print-topics=false`, `--print-members=false`, `--only-with-lag` et la colonne `GROUP_INSTANCE_ID` conditionnelle. Le "résumé du groupe" annoncé par le finding n'existe pas : seules 2 tables sont affichées. Preuve : cmd/describe/describe-consumer-group.go:31-35 et internal/consumergroups/consumer-group-operation.go:152-186 @origin/main ; testé avec kafkactl v5.21.0 contre apache/kafka:3.9.0.

## En plus

- L49 corrigé : `echo "source <(kafkactl completion zsh)" >> .zshrc"` avait un guillemet en trop (commande cassée) et visait `.zshrc` relatif : remplacé par `echo 'source <(kafkactl completion zsh)' >> ~/.zshrc`.
- Valeurs LEAD de l'exemple calculées selon la formule du code (consumer offset - oldest offset, internal/consumergroups/consumer-group-operation.go:319-320).
- "écrit en go" en "écrit en Go".

## Modernisation

- Appliqué : `brew install kafkactl`, colonne GROUP_INSTANCE_ID mentionnée. winget/snap non ajoutés (article orienté mac).
- `tested_with: kafkactl 5.21` ajouté.

## Tests

- apache/kafka:3.9.0 (KRaft mono-noeud) + deviceinsight/kafkactl:v5.21.0 : `describe consumer-group` (avec et sans flags), `alter topic --replication-factor 1 --validate-only`, `get consumer-groups`, tous OK.

## À signaler

- Rien.
