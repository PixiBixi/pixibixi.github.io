---
article: docs/kubernetes/deployment/local_image_cache.md
checked: '2026-11-11'
commit: 3bac5ed782234a251fd6cf77b768269a6fd430ee
sources:
- repo: spegel
  path: charts/spegel/values.yaml
  lines: '173'
  ref: v0.8.1
  commit: 7e2e042fa5a6858276b12bbd0be586b788dfa121
unpinned: 4
---

# docs/kubernetes/deployment/local_image_cache.md

## Findings

- L31 ERROR corrigé : GKE n'est plus présenté comme hors-jeu. Section Compatibilité réécrite en liste : aucune distribution incompatible, GKE/EKS/Talos/K3s/k0s/Kind demandent de la config (GKE : startup script projet + registry host bidon). Preuve : spegel-org/website origin/HEAD content/docs/getting-started.md, tableau (GKE `:yellow_circle:`, aucun rouge) et section `### GKE`.
- L60 OUTDATED corrigé : bloc principal en `version = 3` avec `io.containerd.cri.v1.images` (registry.config_path et discard_unpacked_layers), bloc `version = 2` gardé en alternative avec la bonne table `[plugins."io.containerd.grpc.v1.cri".containerd]` pour discard. Preuve : containerd v2.2.0 docs/cri/config.md (exemple v3, "Version 2 ... Still supported in containerd v2.x") ; test `containerd config dump` (binaire v2.2.0 dans debian:12.8-slim) : les 2 fichiers donnent `discard_unpacked_layers = false` et `config_path = '/etc/containerd/certs.d'` sous `cri.v1.images`.
- L76 IMPRECISE corrigé : la voie recommandée EKS AL2023 est maintenant la `NodeConfig` nodeadm (YAML seul, la partie MIME décrite en prose pour que le bloc reste du YAML valide) ; le `sed` est gardé comme test manuel, avec la mention qu'il saute au remplacement du nœud. Preuve : getting-started.md section `#### AL2023`.
- L88 IMPRECISE corrigé : les lignes de log `OCI event` / `key` (format v0.4) sont remplacées par la procédure officielle (2 pods sur 2 nœuds puis page `/debug/web`, case `Last Mirror Success`). Preuve : spegel `pkg/state/state.go@v0.4.0:86` `log.Info("OCI event", "key", ...)`, `@v0.5.0:84` passe à `"ref"`, `pkg/state` n'existe plus en v0.8.1 ; procédure dans getting-started.md `## Verify Deployment` ; `debugWebEnabled: true` par défaut (charts/spegel/values.yaml:173 @v0.8.1).
- L92 IMPRECISE corrigé : la phrase "quelques millisecondes vs une dizaine de secondes" (non sourcée, et ambiguë sur le même nœud) disparaît avec la réécriture du test, qui vérifie un pull servi par un autre nœud. Preuve : pas de source pour les chiffres, retirés.

## En plus

- Containerd 2.2 minimum depuis Spegel v0.8 (absent de l'article, bloquant pour un lecteur en 1.7). Preuve : spegel pkg/oci/containerd/containerd.go@v0.8.1:131 `version 2.2 or later is required` ; blog spegel-v0-8-0. La validation des 2 paramètres au démarrage n'a lieu qu'à partir de Containerd 2.4 (même fichier:136), précisé.
- "Containerd jette les layers décompressés" corrigé en "compressés après unpack". Preuve : containerd internal/cri/config/config.go:292 origin/main "allow GC to remove layers from the content store after successfully unpacking".
- Ajout : une clé `grpc.v1.cri` dans un fichier `version = 3` est ignorée (warning), et les défauts de Containerd 2.x conviennent déjà. Preuve : même test, warning `Ignoring unknown key in TOML for plugin ... key=registry plugin=io.containerd.grpc.v1.cri` et défaut `config_path = '/etc/containerd/certs.d:/etc/docker/certs.d'`.

## Modernisation

- Containerd 2.x / version 3 : appliqué.
- EKS nodeadm : appliqué.
- Talos (`/etc/cri/conf.d/hosts`, label PSA privileged) : appliqué en une ligne dans la liste de compatibilité. Preuve : getting-started.md `### Talos`.

## Tests

- debian:12.8-slim (arm64) + containerd v2.2.0 release binaire, `containerd -c <fichier> config dump` sur les configs v3, v2 et mixte. `tested_with: "Containerd 2.2"` ajouté (config uniquement, Spegel lui-même non déployé).
- Clones utilisés : ~/Documents/work/src/spegel (v0.4.0, v0.5.0, v0.8.1), nouveaux clones ~/Documents/work/src/spegel-website et ~/Documents/work/src/containerd.

## À signaler

- Le bloc Kustomize (`helmCharts` avec `repo: oci://...`) n'a pas été vérifié.
- La procédure de test reprise de la doc n'a pas été exécutée sur un cluster.
