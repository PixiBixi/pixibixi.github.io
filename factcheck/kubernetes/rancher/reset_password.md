---
article: docs/kubernetes/rancher/reset_password.md
checked: '2026-11-11'
commit: a3be38bae2882e776b15e5b91a598d1f87740e96
sources:
- repo: rancher
  path: package/Dockerfile
  lines: '174'
  ref: origin/main
  commit: aa049bded514a5038fe8f9eda62a43452c94b250
- repo: rancher
  path: pkg/data/management/resetpassword.go
  lines: 28,64,87
  ref: origin/main
  commit: aa049bded514a5038fe8f9eda62a43452c94b250
- repo: rancher
  path: chart/templates/deployment.yaml
  lines: 87,255-260
  ref: origin/main
  commit: aa049bded514a5038fe8f9eda62a43452c94b250
unpinned: 0
---

# docs/kubernetes/rancher/reset_password.md

## Findings

- L12 ERROR corrigé : programme awk non quoté. La commande principale devient `kubectl -n cattle-system exec deploy/rancher -c rancher -- reset-password` ; la variante "pod précis" garde le principe mais remplace grep/head/awk par `--field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}'`. Preuve : test local `echo ... | awk { print $1 }` sous bash donne `awk: syntax error at source line 1`, rc=2 ; `reset-password` confirmé par rancher package/Dockerfile:174 @origin/main.
- L9 IMPRECISE corrigé : ajout du fait que la commande affiche un mot de passe de 20 caractères pour l'admin par défaut et échoue s'il n'y a pas exactement un user avec le label d'admin de bootstrap. Preuve : rancher pkg/data/management/resetpassword.go:28,64,87 @origin/main.

## En plus

- `grep 1/1` ne marchait pas avec le sidecar d'audit log (pod en 2/2) et `exec` sans `-c` tombe sur un container au hasard dans ce cas : ajout de `-c rancher`. Preuve : rancher chart/templates/deployment.yaml:87,255-260 @origin/main (container `rancher` + `rancher-audit-log` si `auditLog.destination=sidecar`).

## Modernisation

- Appliquée : `kubectl exec deploy/rancher`.

## Tests

- bash 5.3 local pour l'awk. Pas de cluster Rancher testé : le nom du Deployment `rancher` suppose la release Helm nommée `rancher` (cas de la doc officielle).

## À signaler

- Rien.
