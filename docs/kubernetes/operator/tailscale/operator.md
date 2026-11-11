---
description: "Opérateur Kubernetes Tailscale en production : exposer des Services au tailnet, ProxyClass par défaut (requests, tolerations, securityContext), peer relays avec la CRD PeerRelay, secret OAuth, pièges de nommage du chart Helm et ACL tags."
tags:
  - Tailscale
  - Kubernetes
  - Helm
  - Sécurité
---

# Opérateur Tailscale en production : ProxyClass, peer relays et pièges du chart

Installé avec les valeurs par défaut du chart, l'opérateur Tailscale marche tout de suite et pose 3 problèmes plus tard : des proxies sans `requests` ni `tolerations` qui se font évincer sur un node pool chargé, un secret OAuth qui finit en clair dans les valeurs Helm et un renommage du release qui recrée l'opérateur comme un nouveau device.

Les valeurs et champs cités viennent du chart `tailscale-operator` et des CRDs du repo `tailscale/tailscale` (cmd/k8s-operator), lus sur la branche `main` pendant la préparation de la v1.105. Il faut la v1.104.0 ou plus pour `nameOverride` et `fullnameOverride`, les `imagePullSecrets` sur les ServiceAccounts des proxies, `service.port` et `staticEndpoints` des `PeerRelay`. Les valeurs de ressources des exemples sont des points de départ, à mesurer sur sa propre charge.

## Exposer un Service au tailnet

L'opérateur crée un StatefulSet de proxy par ressource exposée. 3 déclencheurs existent : l'annotation `tailscale.com/expose: "true"` sur un Service, `spec.loadBalancerClass: tailscale` sur un Service ou un Ingress avec `ingressClassName: tailscale`. On part sur l'annotation, qui ne change pas le type du Service.

Le nom MagicDNS et les tags du proxy se règlent par annotation, par exemple pour un Service existant :

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: my-namespace
  annotations:
    tailscale.com/expose: "true"
    tailscale.com/hostname: "grafana-prod"
    tailscale.com/tags: "tag:k8s-grafana"
    tailscale.com/proxy-class: "default"
spec:
  selector:
    app: grafana
  ports:
    - port: 80
      targetPort: 3000
```

`tailscale.com/tags` remplace les tags par défaut du proxy. Chaque tag listé doit appartenir à l'opérateur dans les `tagOwners` (voir la section sur les ACL tags). `tailscale.com/proxy-class` accepte un label ou une annotation, le label gagnant si les 2 existent.

## Une ProxyClass par défaut

Sans ProxyClass, le chart ne pose aucun `resources`, `tolerations` ou `securityContext` sur les pods de proxy : la doc du champ `resources` dit explicitement que l'opérateur n'applique aucune contrainte par défaut. Seule exception, le conteneur `tailscale` et l'init container tournent en `privileged: true`. Un proxy sans `requests` est en QoS BestEffort et part le premier sous pression mémoire du node.

Le chart permet de désigner une ProxyClass appliquée à tous les Services et Ingress qui n'en déclarent pas, avec `proxyConfig.defaultProxyClass` (variable `PROXY_DEFAULT_CLASS` sur l'opérateur). Le commentaire du chart précise qu'elle ne s'applique pas aux `Connector`. Le code l'applique en revanche aux `ProxyGroup`, qui prennent `spec.proxyClass` s'il est renseigné et la classe par défaut sinon.

La ProxyClass est cluster-scoped. On la crée avant de la référencer :

```yaml
apiVersion: tailscale.com/v1alpha1
kind: ProxyClass
metadata:
  name: default
spec:
  statefulSet:
    pod:
      tolerations:
        - key: dedicated
          operator: Equal
          value: network
          effect: NoSchedule
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      tailscaleContainer:
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            memory: 256Mi
  metrics:
    enable: true
```

Puis le chart pointe dessus :

```yaml
proxyConfig:
  defaultProxyClass: default
  defaultTags: "tag:k8s"
```

Quelques points sur ce que le CRD permet et refuse :

- `tailscaleContainer.resources` n'a pas de défaut côté opérateur et la quantité nécessaire dépend du trafic. On commence bas, on regarde la RAM réelle des proxies sur plusieurs jours puis on fixe `requests` et la limite mémoire.
- Le CRD documente que l'opérateur met par défaut le conteneur `tailscale` et l'init container en `privileged` pour les proxies d'ingress et d'egress, les `Connector` et les `ProxyGroup`. Un `tailscaleContainer.securityContext` écrase ce réglage : c'est le piège de ce champ. Retirer `privileged` sans avoir un device plugin qui crée le device tun (cas décrit dans l'issue #10814 de l'upstream) casse le proxy. On garde le défaut et on durcit au niveau du Pod.
- `tailscaleInitContainer` accepte aussi des `resources`, utile quand un `LimitRange` impose des valeurs à tous les conteneurs.
- `metrics.enable: true` expose les métriques Tailscale sur `<pod-ip>:9002/metrics` et crée un Service `<statefulset>-metrics` dans le namespace de l'opérateur. Le CRD précise que ce n'est pas supporté sur les proxies d'egress ni sur les proxies d'Ingress configurés avec l'annotation `tailscale.com/experimental-forward-cluster-traffic-via-ingress`. Il qualifie aussi ces métriques d'instables, à réserver au debug. `metrics.serviceMonitor.enable` crée le ServiceMonitor si les CRDs Prometheus Operator sont là.
- `spec.tailscale.acceptRoutes` fait accepter au proxy les routes annoncées par d'autres nodes du tailnet. Il reste à `false` sauf besoin réel.

Le CRD expose la condition `ProxyClassReady` dans la colonne `Status` de `kubectl get proxyclass`, premier endroit où regarder quand un proxy ne se crée pas.

## Peer relays : un relais UDP dans le cluster

Quand 2 devices du tailnet n'arrivent pas à établir un chemin direct (NAT strict, pare-feu), le trafic passe par un DERP, relais TCP géré par Tailscale. Un peer relay est un device du tailnet qui relaie le trafic WireGuard en UDP, avec de meilleures performances. La [documentation Tailscale](https://tailscale.com/kb/1591/peer-relays) demande 2 choses : Tailscale 1.86 ou plus sur le relais et sur les clients ; un port UDP du relais joignable depuis le tailnet.

L'opérateur sait en déployer via la CRD `PeerRelay` (`tailscale.com/v1alpha1`, cluster-scoped, shortName `pr`), présente dans le code de l'opérateur depuis la v1.102. Chaque replica est un pod d'un StatefulSet, exposé par un Service `LoadBalancer` en UDP. Le port par défaut est `41641` et le Service expose le même port en externe, parce que le relais annonce `adresse:port` à ses pairs et que le load balancer ne doit rien réécrire.

```yaml
apiVersion: tailscale.com/v1alpha1
kind: PeerRelay
metadata:
  name: relay-prod
spec:
  hostnamePrefix: relay-prod
  replicas: 2
  tags:
    - tag:k8s-relay
  proxyClass: default
  service:
    port: 41641
```

Ce que le CRD impose ou laisse ouvert :

- `proxyClass` doit être renseigné explicitement. Le reconciler `PeerRelay` ne lit que `spec.proxyClass` et ignore `PROXY_DEFAULT_CLASS`, donc un relais sans ce champ tourne sans `resources` ni `tolerations` même si une classe par défaut existe.
- `tags` vaut `[tag:k8s]` par défaut. Un tag personnalisé doit aussi appartenir à l'opérateur.
- `replicas` donne la haute disponibilité. Chaque replica reçoit un hostname `<hostnamePrefix>-<index>` et son propre endpoint dans `status.endpoints`.
- `service.annotations` s'applique au Service `LoadBalancer`. Les annotations qui entrent en conflit avec celles que l'opérateur pose pour obtenir des IP plutôt que des noms DNS sont ignorées.
- `staticEndpoints` ajoute des `adresse:port` joignables de l'extérieur, par exemple l'IP publique d'un NAT devant le cluster.
- Le bloc `aws` permet d'attacher une Elastic IP et un subnet par réplica, uniquement avec l'AWS Load Balancer Controller. Le CRD recommande de le laisser vide sauf besoin d'adresses figées. Il impose aussi des subnets d'une seule zone et des pods épinglés dans cette zone par un `nodeSelector` de ProxyClass, donc les replicas perdent la redondance entre zones.
- Changer le port d'un `PeerRelay` existant coupe brièvement le relais le temps que le load balancer se mette à jour.

Un relais ne sert à personne tant que l'ACL ne l'autorise pas. Le grant porte la capacité `tailscale.com/cap/relay` (exemple de la doc Tailscale, tags adaptés) :

```json
{
  "grants": [
    {
      "src": ["tag:k8s"],
      "dst": ["tag:k8s-relay"],
      "app": {
        "tailscale.com/cap/relay": []
      }
    }
  ]
}
```

On vérifie ensuite que `kubectl get peerrelay` affiche des adresses dans la colonne `Endpoints`. Le LoadBalancer doit laisser passer l'UDP : un cloud dont le load balancer ne gère que le TCP rend le relais inutile sans aucune erreur côté opérateur.

## Secret OAuth sans le laisser dans les valeurs

L'opérateur s'authentifie avec un client OAuth ou, avec le chart, un client de workload identity federation (`oauth.audience`, exclusif avec `clientSecret`). Le chart sait créer le Secret depuis `oauth.clientId` et `oauth.clientSecret`, mais le secret passe alors dans les valeurs, donc dans le manifest rendu et dans le Secret de release Helm. Sous ArgoCD, il finit dans le repo ou dans un paramètre d'Application.

2 sorties propres existent :

- précréer un Secret nommé `<fullname>-oauth` avec les clés `client_id` et `client_secret`, par exemple depuis un `ExternalSecret` (voir [l'alerting External Secrets](../external-secrets/sync_alerting.md)), en laissant `oauth` vide. Le Pod ne démarre pas si ce Secret manque ;
- passer `oauthSecretVolume`, un volume complet qui doit contenir 2 fichiers `client_id` et `client_secret`, par exemple en CSI avec `secrets-store.csi.k8s.io`. Ce bloc prend le pas sur `oauth`.

```yaml
oauthSecretVolume:
  csi:
    driver: secrets-store.csi.k8s.io
    readOnly: true
    volumeAttributes:
      secretProviderClass: tailscale-oauth
```

Le template `oauth-secret.yaml` ne rend le Secret que si `oauth.clientId` est non vide et `oauth.audience` vide. Laisser `clientId` vide est donc ce qui évite un Secret en doublon avec celui qu'on précrée.

## Nommage du release et fullname

Le nom des ressources ne suit pas le nom du release par défaut. Le helper `tailscale-operator.fullname` renvoie `operator` en dur quand ni `nameOverride` ni `fullnameOverride` ne sont posés, quel que soit `helm install <release>`. Les ressources cluster-scoped s'appellent alors `tailscale-operator`. Le chart a gardé ces noms historiques pour ne pas casser les installations existantes.

Les 2 overrides changent la règle :

- `fullnameOverride` est utilisé tel quel (tronqué à 63 caractères) ;
- `nameOverride` donne `<release>-<nameOverride>`, sauf si le release contient déjà ce nom, auquel cas on garde le nom du release.

Chaque fullname dérive de ce nom : le Deployment, le ServiceAccount, le Secret OAuth `<fullname>-oauth` et le Secret d'état de l'opérateur. Les commentaires du chart décrivent les 2 conséquences d'un changement sur une installation existante :

- le Secret d'état change de nom, l'opérateur se réenregistre comme un nouveau device du tailnet et l'ancien device et l'ancien Secret restent en place ;
- le sélecteur du Deployment change : il est immutable, donc `helm upgrade` échoue tant qu'on n'a pas supprimé le Deployment (ou réinstallé le chart).

On fixe donc `fullnameOverride` une fois à l'installation, avant le premier sync, puis on n'y touche plus. Si on précrée le Secret OAuth, son nom suit : `myname-oauth` pour `fullnameOverride: myname`. Après un renommage subi, le device orphelin se supprime à la main dans la console d'administration Tailscale.

## ACL tags : qui possède quoi

L'opérateur ne crée des devices que sous des tags dont il est propriétaire. Le chart en pose 2 par défaut :

- `operatorConfig.defaultTags` : `tag:k8s-operator`, le tag de l'opérateur lui-même ;
- `proxyConfig.defaultTags` : `tag:k8s`, le tag des proxies (une chaîne séparée par des virgules, échappées avec `--set`, `tag:k8s-proxies\,tag:prod`).

Dans la policy du tailnet, l'opérateur doit posséder les 2 ainsi que chaque tag supplémentaire utilisé sur un Service, un `Connector` ou un `PeerRelay` :

```json
{
  "tagOwners": {
    "tag:k8s-operator": ["autogroup:admin"],
    "tag:k8s": ["tag:k8s-operator"],
    "tag:k8s-relay": ["tag:k8s-operator"],
    "tag:k8s-grafana": ["tag:k8s-operator"]
  }
}
```

Le client OAuth se crée avec les scopes Devices Core, Auth Keys et Services en lecture et écriture, et avec `tag:k8s-operator` assigné (voir le [quickstart](https://tailscale.com/docs/kubernetes-operator/quickstart) de la doc Tailscale). Un tag oublié dans `tagOwners` laisse le proxy sans device : on lit les logs de l'opérateur avant ceux du proxy.

Les tags d'un proxy sont aussi la surface des règles d'accès. Un tag par application (`tag:k8s-grafana`) permet de donner l'accès à un groupe d'utilisateurs précis, là où `tag:k8s` seul ouvre tous les proxies d'un coup.

## Image, pull policy et imagePullSecrets

Par défaut les images viennent de Docker Hub (`tailscale/k8s-operator` et `tailscale/tailscale`), synchronisées aussi sur `ghcr.io/tailscale/`. `operatorConfig.image.pullPolicy` vaut `Always` et le tag par défaut suit la version du chart (`appVersion` est posé sur le tag de release), donc `Always` re-tire seulement le même tag et c'est une montée de version du chart qui change l'image sans bruit. En production on fixe `tag` ou plutôt `digest`, immuable, côté opérateur et côté `proxyConfig.image`. `imagePullSecrets` du chart s'applique à l'opérateur et aux ServiceAccounts des proxies, ce qui règle un registry privé en un seul endroit.
