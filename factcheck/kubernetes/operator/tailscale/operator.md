---
article: docs/kubernetes/operator/tailscale/operator.md
checked: '2026-11-11'
commit: ef249b3d7e4d68fe8f87eb483b4133122fcfa290
sources:
- repo: tailscale
  path: cmd/k8s-operator/deploy/chart/templates/_helpers.tpl
  lines: 1-43
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: cmd/k8s-operator/deploy/chart/values.yaml
  lines: 1-184
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: cmd/k8s-operator/deploy/chart/Chart.yaml
  lines: 26-29
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: cmd/k8s-operator/deploy/chart/templates/oauth-secret.yaml
  lines: 4-13
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: k8s-operator/apis/v1alpha1/types_peerrelay.go
  lines: 38-230
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: k8s-operator/apis/v1alpha1/types_proxyclass.go
  lines: 22-24,62-69,209-216,255-295,319-331,398-424
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: k8s-operator/reconciler/peerrelay/statefulset.go
  lines: 117-127
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: k8s-operator/reconciler/peerrelay/service.go
  lines: 54-92
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: cmd/k8s-operator/proxygroup.go
  lines: 211-214
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: cmd/k8s-operator/sts.go
  lines: 1533-1547
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: cmd/k8s-operator/deploy/manifests/proxy.yaml
  lines: 14-16,43-44
  ref: origin/main
  commit: 7b2c32b9138b0ab2321910c7eaa8e81b24919dce
- repo: tailscale
  path: k8s-operator/apis/v1alpha1/types_peerrelay.go
  lines: 160-164
  ref: v1.102.0
  commit: 35283c95445fb198af1ce708dac05714bdfaa037
- repo: tailscale
  path: cmd/k8s-operator/deploy/chart/values.yaml
  lines: 1-30,180-184
  ref: v1.104.0
  commit: c8125a977e8714ac9f0d1a1fb43c714490d38bd3
unpinned: 4
---

# docs/kubernetes/operator/tailscale/operator.md

## Findings

- L207 ERROR corrigé : "`appVersion` du chart vaut `stable` tant que le tag n'est pas fixé, donc un restart de pod peut changer de version". `stable` n'est que la valeur de l'arbre source ; le commentaire du Chart.yaml dit que `appVersion` est posé sur le tag du repo au moment de la release, et le chart publié (copie locale 1.102.4) porte `appVersion: v1.102.4`. Avec le chart publié, l'image par défaut est donc épinglée à la version du chart (le `pullPolicy: Always` rejoue seulement le même tag). Reformuler : le tag suit la version du chart, `Always` re-tire ce tag, et on fixe `tag` ou `digest` pour ne pas dépendre du registry. Preuve : cmd/k8s-operator/deploy/chart/Chart.yaml:28-29 @ origin/main
- L45 IMPRECISE corrigé : "le chart ne pose aucun `resources`, `tolerations` ou `securityContext` sur les pods de proxy". Vrai au niveau Pod, mais l'opérateur met par défaut les conteneurs `tailscale` et l'init container en `privileged: true`. À préciser (l'article le dit seulement L89). Preuve : cmd/k8s-operator/deploy/manifests/proxy.yaml:16,44 @ origin/main
- L201 IMPRECISE corrigé : `"tag:k8s-operator": []` dans l'exemple `tagOwners`. La doc Tailscale (quickstart) met `["autogroup:admin"]` et demande d'assigner `tag:k8s-operator` au client OAuth ; la phrase "non revérifiée" peut devenir : le client OAuth doit avoir les scopes Devices Core, Auth Keys et Services en écriture, et le tag `tag:k8s-operator` assigné. Preuve : <https://tailscale.com/docs/kubernetes-operator/quickstart> (consulté le 2026-11-11)
- L124 IMPRECISE corrigé : le bloc `aws` n'est dit que "un Elastic IP et un subnet par réplica". Le CRD exige aussi de n'utiliser que des subnets d'une seule zone et d'épingler les pods à cette zone (nodeSelector `topology.kubernetes.io/zone` via ProxyClass), ce qui retire la redondance de zone entre replicas. Preuve : k8s-operator/apis/v1alpha1/types_peerrelay.go:152-160 @ origin/main
- L91 IMPRECISE laissé : pas encore dans une release : fraîcheur, après la v1.104.6 le commit 9eea2c890 (2026-11-04) ajoute le support des métriques ProxyClass pour `PeerRelay` ; la phrase sur les métriques reste juste mais l'article ne dit pas qu'un relais peut les exposer. Preuve : git log v1.104.0..origin/main -- k8s-operator/apis @ 7b2c32b9138b0ab2321910c7eaa8e81b24919dce

Le reste est confirmé : noms et défauts du helper `fullname` et de `clusterResourceName`, `nameOverride`/`fullnameOverride` et leurs conséquences, Secret `<fullname>-oauth` et condition du template, `oauth.audience`, `oauthSecretVolume`, tags par défaut, `defaultProxyClass` (non appliquée aux Connector, appliquée aux ProxyGroup, absente du reconciler PeerRelay), label avant annotation pour `proxy-class`, champs PeerRelay (port 41641, replicas, tags, `staticEndpoints`, `aws`, shortName `pr`, colonne `Endpoints`), `v1.104.0` pour `nameOverride`, `imagePullSecrets` des SA proxies, `service.port` et `staticEndpoints`, PeerRelay présent depuis v1.102.0, métriques (`:9002`, Service `-metrics`, restrictions, instables), `acceptRoutes`, condition `ProxyClassReady`, `pullPolicy: Always`, images Docker Hub et ghcr, Tailscale 1.86 et grant `tailscale.com/cap/relay` (kb 1591).

## Unpinned

- L98 : DERP décrit comme relais TCP (la page KB 1591 ne précise pas le transport)
- L143 : un load balancer TCP seul rend le relais inutile sans erreur côté opérateur (comportement non lu dans le code)
- L207 : copie locale `helm/tailscale-operator` (pas un dépôt git) utilisée pour `appVersion: v1.102.4` du chart publié
- L18 : annotation `tailscale.com/expose` suffit sans changer le type du Service (lue dans operator.go:867 et svc.go:412, sans épinglage de plage précise)
