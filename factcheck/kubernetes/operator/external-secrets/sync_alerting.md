---
article: docs/kubernetes/operator/external-secrets/sync_alerting.md
checked: '2026-11-11'
commit: f610722325c3f8eea1d406efcac64804f70a1173
sources:
- repo: external-secrets
  path: pkg/controllers/externalsecret/esmetrics/esmetrics.go
  lines: 31-68, 96-160
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: runtime/metrics/metrics.go
  lines: 28-45
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: apis/externalsecrets/v1/externalsecret_types.go
  lines: 517-598
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: pkg/controllers/externalsecret/externalsecret_controller.go
  lines: 1266-1300
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: deploy/charts/external-secrets/values.yaml
  lines: 36, 88-92, 209-211, 316-348, 471-487, 528, 811
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: deploy/charts/external-secrets/templates/NOTES.txt
  lines: 14-23
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: docs/api/metrics.md
  lines: 86-96
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: external-secrets
  path: docs/introduction/faq.md
  lines: 1-8
  ref: main
  commit: 3390c0f4ee5b6b303b09d43716c774a84bae0f75
- repo: prometheus
  path: docs/configuration/configuration.md
  lines: 385-386
  ref: main
  commit: 997549d4479dbc52382c83679dd998cd1c8eff27
unpinned: 2
---

# docs/kubernetes/operator/external-secrets/sync_alerting.md

## Findings

- L15 OUTDATED corrigé : l'article dit lire les défauts sur la branche `main` au chart 2.14.0, mais `main` est maintenant au chart 2.15.0 (tag v2.15.0). Les défauts cités (`replicaCount: 1`, `leaderElect: false`, `concurrent: 1`, PDB désactivé, `serviceMonitor.honorLabels: false`) n'ont pas changé, donc corriger la version ou citer le tag. Preuve : deploy/charts/external-secrets/Chart.yaml:5 @ main
- L135 IMPRECISE corrigé : « Le chart demande la leader election dès que `replicaCount` dépasse 1 ». Le chart ne l'impose pas : `leaderElect` reste à `false` par défaut, la valeur est commentée « Should be enabled when replicaCount ... is greater than 1 » et `NOTES.txt` n'affiche qu'un WARNING. Reformuler en « le chart recommande, et avertit à l'install si `leaderElect` est à `false` ». Preuve : deploy/charts/external-secrets/values.yaml:88-92 et deploy/charts/external-secrets/templates/NOTES.txt:14-18 @ main
- L154 IMPRECISE corrigé : « Le chart demande la leader election aussi pour le cert controller dès qu'il dépasse 1 replica ». Même nuance (simple WARNING, et seulement si `webhook.certManager.enabled` est faux), et `leaderElect` est un flag unique partagé par le controller et le cert controller. Preuve : deploy/charts/external-secrets/templates/NOTES.txt:19-23 @ main
- L168 IMPRECISE corrigé : la citation « avoid claiming ownership of spec fields like refreshInterval » pour le commit `7f0ec4c2d` ne figure pas dans son message. Le sujet réel est « fix: use patch instead of update for finalizers addition and removal (#5670) », du 2025-12-03. Citer le sujet réel, ou retirer les guillemets. Le commit `67931cb63` (« update the refreshInterval formatting everywhere ») est lié au format `1h0m0s` mais ne porte pas cette citation non plus. Preuve : commit 7f0ec4c2db8c3aeb90052b8312950fefe59ac0db du clone external-secrets @ main

Vérifié sans écart : défaut `1h0m0s` et `0s` pour lire une fois (externalsecret_types.go:592-597), les 3 `refreshPolicy` et leur description, `CreatedOnce` qui ignore l'annotation `force-sync` (`shouldRefresh` ne rafraîchit que si jamais synchronisé), la commande `force-sync` de la FAQ, les labels et le nom des 3 familles de métriques, le comportement de la série du statut opposé remise à 0, `provider_api_calls_count` avec les labels `provider`, `call`, `status`, `replicaCount`/`concurrent` à 1, PDB désactivé, `webhook.replicaCount` et `certController.replicaCount` séparés, la doc `workqueue_depth`, le renommage en `exported_namespace` quand `honor_labels` est à false, et le quota Secret Manager de 90 000 accès par minute et par projet.

## Unpinned

- L118 : le label `call` de `externalsecret_provider_api_calls_count` vaut `AccessSecretVersion` et un refresh coûte au moins 1 appel par clé lue (code du provider GCP non lu), ainsi que le quota de 90 000 par minute, lu sur la page de quotas Google (pas de code à pinner).
- L123 : le tarif d'accès GCP Secret Manager et les chiffres de l'exemple (2 000 ExternalSecret de 3 clés) sont de l'arithmétique, pas une source.
