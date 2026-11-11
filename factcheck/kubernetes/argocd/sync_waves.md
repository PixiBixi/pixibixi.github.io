---
article: docs/kubernetes/argocd/sync_waves.md
checked: '2026-11-10'
commit: 85df61399070b061cbecd774af39a7d513cc0d2b
sources:
- repo: argo-cd
  path: docs/user-guide/sync-waves.md
  lines: 104,117,121-126
  ref: v3.5.6
  commit: c2b1e3017e2cec86b122172e861dcd026453ae44
- repo: null
  path: sync-waves.md
  lines: 14-15,61,71
  ref: v3.5.6
  commit: null
- repo: argo-cd
  path: gitops-engine/pkg/sync/sync_tasks.go
  lines: 24-63
  ref: v3.5.6
  commit: c2b1e3017e2cec86b122172e861dcd026453ae44
- repo: null
  path: sync-waves.md
  lines: '125'
  ref: v3.5.6
  commit: null
- repo: null
  path: sync-waves.md
  lines: 37,111
  ref: v3.5.6
  commit: null
- repo: null
  path: sync-waves.md
  lines: 10,104
  ref: v3.5.6
  commit: null
unpinned: 0
---

# docs/kubernetes/argocd/sync_waves.md

## Findings

- L185 ERROR corrigé : section « Dans quel ordre ça se passe » réécrite : tri phase > wave > kind > nom, les hooks respectent les waves dans leur phase (exemple migration wave -1 puis seed wave 0). Idem L70 (« indépendamment des waves » retiré). Preuve : docs/user-guide/sync-waves.md:104,117,121-126 @v3.5.6 (argo-cd).
- L82 OUTDATED corrigé : ajout de `PreDelete` (3.3+) et `PostDelete` (2.10+) au tableau, avec le fait qu'ils ne tournent qu'à la suppression de l'Application. Preuve : sync-waves.md:14-15,61,71 @v3.5.6 ; `PreDelete` absent de sync-waves.md @v3.2.0, présent @v3.3.0.
- L10 IMPRECISE corrigé : intro réécrite : application en un coup trié par kind (ConfigMap avant Deployment, CR en dernier) sans attente de Healthy ; exemple ConfigMap/Deployment remplacé par CR avant son operator et backend avant sa base. Preuve : gitops-engine/pkg/sync/sync_tasks.go:24-63 @v3.5.6 (kindOrder : ConfigMap index 9, Deployment index 27) ; sync-waves.md:125 @v3.5.6.
- L17 IMPRECISE corrigé : ajout du délai de 2 s entre waves (`ARGOCD_SYNC_WAVE_DELAY`) et du prune en ordre inverse. Preuve : sync-waves.md:37,111 @v3.5.6.
- L85 IMPRECISE corrigé : ligne `Sync` du tableau : après les PreSync, en même temps que les manifests, avec sa wave (0 par défaut). Preuve : sync-waves.md:10,104 @v3.5.6.

## En plus

- Rien.

## Modernisation

- PreDelete/PostDelete : appliqué (dans le tableau).
- Délai entre waves : appliqué.

## Tests

- Aucun test runtime ; lecture du clone local argo-cd (tags v3.2.0, v3.3.0, v3.5.6 ; `git fetch` a échoué, tags locaux jusqu'à v3.6.1 déjà présents).

## À signaler

- Le lien interne vers `#dans-quel-ordre-ça-se-passe` n'a pas été mis : markdownlint (MD051) attend l'ancre avec le `ç`, alors que le slugify par défaut de la toc produit `ca`. Remplacé par « (détail plus bas) ».
