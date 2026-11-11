---
article: docs/kubernetes/argocd/applicationset.md
checked: '2026-11-10'
commit: 5bf0fde01c7d5beb5de5c696e6cef47b996c8a73
sources:
- repo: argo-cd
  path: docs/operator-manual/applicationset/Application-Deletion.md
  lines: '5'
  ref: v3.6.1
  commit: 94037c4d4e1af4bd0651d37a179fbd9e347e668c
- repo: argo-cd
  path: docs/operator-manual/applicationset/Generators-Git.md
  lines: 454-460
  ref: v3.6.1
  commit: 94037c4d4e1af4bd0651d37a179fbd9e347e668c
- repo: null
  path: Application-Deletion.md
  lines: 6,14,23,27-29
  ref: v3.6.1
  commit: null
- repo: argo-cd
  path: applicationset/utils/utils.go
  lines: 299-301
  ref: v3.6.1
  commit: 94037c4d4e1af4bd0651d37a179fbd9e347e668c
- repo: argo-cd
  path: applicationset/controllers/applicationset_controller.go
  lines: '622'
  ref: v3.6.1
  commit: 94037c4d4e1af4bd0651d37a179fbd9e347e668c
- repo: argo-cd
  path: docs/operator-manual/applicationset/Template.md
  lines: '5'
  ref: v3.6.1
  commit: 94037c4d4e1af4bd0651d37a179fbd9e347e668c
unpinned: 0
---

# docs/kubernetes/argocd/applicationset.md

## Findings

- L234 ERROR corrigé : le `-l app.kubernetes.io/managed-by=applicationset-controller` remplacé par un filtre jq sur `ownerReferences` (kind ApplicationSet + nom), plus une phrase : aucun label managed-by, poser son propre label dans `template.metadata.labels` pour filtrer avec `-l`. Preuve : argo-cd `docs/operator-manual/applicationset/Application-Deletion.md:5 @v3.6.1` (ownerReferences) ; `git grep managed-by v3.6.1 -- applicationset/` ne renvoie rien ; filtre jq testé sur un JSON d'exemple (renvoie seulement l'Application du bon owner).
- L237 ERROR corrigé : annotation `argocd.argoproj.io/application-set-refresh=true` au lieu de `argocd.argoproj.io/refresh=normal`. Preuve : `docs/operator-manual/applicationset/Generators-Git.md:454-460 @v3.6.1` ("Setting the argocd.argoproj.io/application-set-refresh annotation (to any value) triggers an ApplicationSet refresh... The ApplicationSet controller removes this annotation").
- L148 IMPRECISE corrigé : section suppression réécrite : les Applications partent quand même, `preserveResourcesOnDeletion` retire seulement le finalizer donc les ressources déployées restent ; `kubectl delete applicationset ... --cascade=orphan` pour garder les Applications. Preuve : `Application-Deletion.md:6,14,23,27-29 @v3.6.1` ; `applicationset/utils/utils.go:299-301 @v3.6.1` (finalizer ajouté si `!syncPolicy.PreserveResourcesOnDeletion`).

## En plus

- Exemple App of Apps (L188-230) : `directories: apps/*/*` croisé avec 2 clusters donnait 2 Applications de même nom par app (`nginx-staging` x2, `nginx-production` x2) et des couples dossier staging / cluster prod. Le contrôleur rejette les noms dupliqués. Corrigé : `apps/*`, nom `{{path.basename}}-{{cluster}}`, source `{{path}}/{{cluster}}`, namespace `{{path.basename}}`. Preuve : `applicationset/controllers/applicationset_controller.go:622 @v3.6.1` "contains applications with duplicate name".

## Modernisation

- goTemplate : pas de conversion de tout l'article (réécriture de tous les exemples), une phrase ajoutée sous le tableau des variables avec l'équivalent Go Template. Preuve : `docs/operator-manual/applicationset/Template.md:5 @v3.6.1` ("will be soon deprecated in favor of Go Template") ; `Generators-Git.md:52-71` pour `.path.basename`, `index .path.segments n`.

## Tests

- Lecture de source argo-cd (clone local, tag v3.6.1, le dernier stable) ; jq local. Pas de cluster ArgoCD lancé.

## À signaler

- Exemple App of Apps : les dossiers `apps/<app>/<env>/` ne contiennent qu'un `values.yaml`, sans `Chart.yaml`. Avec `source.helm` sur ce dossier, ArgoCD ne trouvera pas de chart. Il faudrait soit un chart dans `apps/<app>/`, soit une source multiple (`sources:` avec `$values`). Non modifié, choix de design à faire par l'auteur.
- Le fact-check citait v3.3.18 ; vérifié sur v3.6.1, mêmes conclusions.
