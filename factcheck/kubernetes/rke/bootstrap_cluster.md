---
article: docs/kubernetes/rke/bootstrap_cluster.md
checked: '2026-11-11'
commit: 2fab83725bb2ef8a0436cf5d09d5fc8349afc761
sources:
- repo: rke
  path: types/rke_types.go
  lines: '289'
  ref: v1.8.14
  commit: 7159e9ad3fd5ff468f02c7f91571ce0df39118e8
unpinned: 4
---

# docs/kubernetes/rke/bootstrap_cluster.md

## Findings

- L85 ERROR corrigé : `extra-args` -> `extra_args`, et une phrase ajoutée : RKE attend des underscores et ignore une clé inconnue sans erreur. Preuve : rancher/rke types/rke_types.go:370 `ExtraArgs map[string]string \`yaml:"extra_args"\`` @v1.8.14; cluster/cluster.go:718 `yaml.Unmarshal` (gopkg.in/yaml.v2, non strict) @v1.8.14.
- L127 OUTDATED corrigé : lien vers <https://rke.docs.rancher.com/example-yamls>. Preuve : curl, nouvelle URL 200, ancienne URL 502.
- L11 IMPRECISE corrigé : "il ne se base pas sur K3s" reformulé ("ce n'est pas un K3s, mais il en reprend le socle, K3s embarqué comme bibliothèque Go, et le modèle de déploiement"). Preuve : rancher/rke2 go.mod:72 `github.com/k3s-io/k3s v1.35.1-0.20261016182209-1157d0a6b690` @origin/HEAD. L'admonition est passée sur une ligne (paragraphe réécrit).
- L18 IMPRECISE corrigé : lien vers <https://github.com/rancher/rke/releases>. Preuve : README @origin/HEAD liste v1.8.2 sous "Latest Release" alors que le dernier tag est v1.8.14 (le finding citait v1.2.11, c'est faux, mais la conclusion tient).

## En plus

- Mention de `backup_config` pour l'envoi des snapshots dans S3. Preuve : types/rke_types.go:289 @v1.8.14.

## Modernisation

- EOL RKE1 : déjà dans l'admonition, rien ajouté. "Rancher 2.12+ ne gère plus RKE1 downstream" non vérifié, pas ajouté.
- Lien docs : appliqué (voir findings).

## Tests

- Aucun cluster lancé; vérification par lecture du code rancher/rke v1.8.14 et rancher/rke2 (clones locaux).

## À signaler

- `snapshot`/`creation`/`retention` sous `services.etcd` restent valides dans le type (rke_types.go:283-287) mais la doc RKE pousse `backup_config.interval_hours`/`retention`; laissés tels quels.
