---
description: "Network Service Tiers GCP (Premium et Standard) pour les LoadBalancer GKE devant HAProxy : routage, IP régionales, annotation cloud.google.com/network-tier, IP réservées, coût d'egress et bascule sans surprise."
tags:
  - GKE
  - GCP
  - FinOps
  - Networking
---

# Network tiers GCP sur GKE : routage, coût d'egress et bascule

Un Service `LoadBalancer` GKE créé sans réglage particulier tourne en Premium, le tier le plus cher. Le passer en Standard réduit la facture d'egress sans que rien ne casse, jusqu'au jour où des clients se plaignent de timeouts le soir. Le tier décide aussi du chemin réseau jusqu'à eux et ne se change pas en place.

Fixer le tier par Service puis basculer par le DNS avec 2 Services en parallèle permet de changer de tier sans coupure, avec un rollback qui se résume à repointer le DNS. Les exemples portent sur un Service qui expose HAProxy.

## Un tier décide du chemin réseau

Le tier ne touche ni au LB ni aux nœuds, seulement au chemin que prend le trafic entre Internet et la région GCP. D'après la [doc Network Service Tiers](https://docs.cloud.google.com/network-tiers/docs/overview) :

- **Premium** : le trafic reste dans le réseau de Google, qu'il fait entrer au point de présence (PoP) le plus proche de l'émetteur.
- **Standard** : le trafic passe par des réseaux de peering, d'ISP ou de transit, puis arrive dans la région.

Un LB passthrough régional (celui d'un Service GKE) accepte les 2 tiers. Les LB globaux (Application LB global, proxy global) et Cloud CDN exigent du Premium. Pour un Service qui expose HAProxy en L4, la contrainte ne joue donc pas.

Le tier est une propriété de l'adresse IP et de la forwarding rule, pas du cluster. Un tier fixé sur la ressource l'emporte sur celui du projet. Premium est le défaut quand rien n'est précisé.

!!! warning "Une IP ne change pas de tier"
    Une adresse régionale en Standard ne passe jamais en Premium : la doc demande de réserver une nouvelle IP. Toute migration change donc l'IP publique et oblige à mettre à jour tout ce qui la connaît (DNS, allowlists de partenaires).

Côté IPv6, la doc liste les adresses externes régionales et globales comme supportées en Standard avec la mention Preview. L'IPv6 n'a pas été testé sur ces LB : pas de règles de firewall ni de comportement à documenter ici.

## Mesurer le coût d'egress par tier

La facture ne dit pas le tier d'un LB, elle le dit par SKU. Les SKUs Standard s'appellent `Network Standard Data Transfer Out to Internet from <région>` (les plus anciens portaient `Standard Tier`), les SKUs Premium `Network Internet Data Transfer Out from <région> to <destination>`, quelques-uns gardant l'ancien nom en `Egress`. On compare donc les SKUs d'egress d'un projet avant et après la bascule, dans l'export billing BigQuery.

La requête suivante agrège par semaine, tier et SKU, crédits déduits. Il faut renseigner `PROJECT_ID`, `SWITCH_DATE` et `TABLE` avec ses propres valeurs.

```bash
PROJECT_ID="my-k8s-prod"
SWITCH_DATE="2026-10-01"
TABLE="my-billing-export.billing_dataset.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX"

# Attendu : une ligne par semaine x tier x SKU, en quantité et en coût net
bq query --use_legacy_sql=false --max_rows=500 "
SELECT
  DATE_TRUNC(DATE(usage_start_time), WEEK(MONDAY)) AS week,
  IF(DATE(usage_start_time) < '${SWITCH_DATE}', 'before', 'after') AS period,
  IF(sku.description LIKE 'Network Standard %'
     OR sku.description LIKE '%Standard Tier%', 'standard', 'premium') AS tier,
  sku.description AS sku,
  ROUND(SUM(usage.amount_in_pricing_units), 1) AS qty,
  ANY_VALUE(usage.pricing_unit) AS unit,
  ROUND(SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)), 2) AS net_cost
FROM \`${TABLE}\`
WHERE project.id = '${PROJECT_ID}'
  AND DATE(usage_start_time) >= DATE_SUB('${SWITCH_DATE}', INTERVAL 28 DAY)
  AND (sku.description LIKE '%Data Transfer Out%'
       OR sku.description LIKE '%Egress%'
       OR sku.description LIKE '%Load Balanc%'
       OR sku.description LIKE '%Forwarding Rule%')
GROUP BY week, period, tier, sku
ORDER BY week, tier, net_cost DESC"
```

Quelques règles pour lire le résultat :

- Comparer le coût par GiB d'egress (`net_cost / qty`) et pas le coût total, sinon une variation de trafic se confond avec l'effet du tier.
- Le data processing du LB passthrough ne change pas d'un tier à l'autre, seul l'egress bouge.
- Écarter les jours où tous les SKUs du projet tombent à une fraction de leur volume habituel : autour d'une bascule DNS, ce sont des lignes de billing incomplètes ou un vrai trou de trafic. Dans les 2 cas ils faussent la moyenne.
- Un projet couvert par des crédits affiche un coût net à 0 sur toutes les lignes. Le coût brut montre l'effet du tier, mais l'impact cash dépend de la consommation des crédits, à vérifier avec la FinOps.

Au tarif catalogue, l'egress internet au départ d'europe-west4 coûte entre 1,3 et 1,9x plus cher en Premium qu'en Standard selon le palier de volume. Vers l'Europe, le Premium est à 0,12 $ par GiB jusqu'à 1 TiB, 0,11 $ jusqu'à 10 TiB puis 0,085 $ au-delà. Le Standard d'europe-west4 est à 0,085 $ de 200 GiB à 10 TiB, 0,065 $ de 10 à 150 TiB et 0,045 $ au-delà de 150 TiB, par mois. Les paliers des 2 grilles ne coïncident pas, donc le ratio se lit par plage de volume. Les grilles complètes sont sur la [page pricing des Network tiers](https://cloud.google.com/network-tiers/pricing) et sur celle du [VPC](https://cloud.google.com/vpc/network-pricing). Remises et crédits changent l'écart réel, donc on le recalcule sur ses propres SKUs avec la requête ci-dessus avant de s'en servir comme argument.

## Quand le Standard perd des paquets

Le Standard n'a pas de défaut en soi, tout dépend du chemin jusqu'aux clients. Un trafic qui sort de chez nous vers un opérateur grand public européen emprunte, en Standard, les transitaires du moment. En mesurant au `mtr` depuis un pod, en pleine heure de pointe du soir, la perte démarrait à l'interconnexion entre un transitaire et l'ISP : 2,5 % sur le hop d'interconnexion, 3 à 4 % jusqu'à la destination. Le même trajet 5 minutes plus tard passait par un peering direct Google vers l'ISP, sans perte, mais sur 12 paquets seulement.

Une perte affichée sur un hop intermédiaire (on a vu jusqu'à 28 %) qui ne se propage pas aux suivants relève du rate-limit ICMP, pas d'une perte réelle. Seule une perte qui persiste jusqu'à la destination compte.

Ces timeouts survenaient avant HAProxy, donc sans aucun log applicatif : le tier du LB était le seul levier côté Google. En Premium, le trafic de l'ISP entre sur le réseau de Google au PoP le plus proche et évite l'interconnexion qui perdait des paquets.

Sur la latence pure, l'écart est faible quand le client est proche de la région. Depuis Lyon vers Frankfurt, un traceroute vers une IP Standard et une IP Premium donnait environ 22 ms contre 18 ms : trop peu pour trancher. L'écart se creuse avec la distance, on ne l'a pas mesuré entre l'Europe et les États-Unis.

### Tester les 2 tiers côte à côte

Pour comparer sans toucher à la prod, on monte 1 VM par région derrière un LB passthrough, avec 2 IP statiques sur le même backend, une Standard et une Premium. Dans notre test à Frankfurt et Berlin, les 4 IP servaient la bonne VM en HTTP comme en HTTPS. Berlin acceptait aussi le tier Standard. Les IP se réservent avec le tier voulu.

```bash
REGION="europe-west3"

# Attendu : 2 adresses, une STANDARD et une PREMIUM
gcloud compute addresses create lb-std --region "$REGION" --network-tier=STANDARD
gcloud compute addresses create lb-prem --region "$REGION" --network-tier=PREMIUM
gcloud compute addresses list --filter="name~^lb-" \
  --format='table(name,address,networkTier,status)'
```

La doc demande de préciser le tier sur l'adresse comme sur la forwarding rule, puis on pointe les 2 forwarding rules sur le même backend service.

## Fixer le tier sur un Service GKE

3 niveaux se superposent, du plus large au plus précis : le tier par défaut du projet, celui du cluster, puis l'annotation du Service.

- **Projet** : le tier par défaut de toutes les ressources créées sans tier explicite. Le modifier touche tous les clusters du projet.
- **Cluster** : `gcloud container clusters update CLUSTER --network-tier=Standard` (valeurs `network-default`, `Standard`, `Premium` d'après la [doc GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-tiers)). Un Service sans annotation hérite du tier du cluster.
- **Service** : l'annotation `cloud.google.com/network-tier`, qui l'emporte sur les 2 autres.

Un Service HAProxy en `externalTrafficPolicy: Local` sur une IP réservée Premium s'écrit ainsi. Le nom de l'adresse passe par l'annotation `networking.gke.io/load-balancer-ip-addresses`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: haproxy-public
  namespace: my-namespace
  annotations:
    cloud.google.com/network-tier: "Premium"
    networking.gke.io/load-balancer-ip-addresses: "prod-europe-west4-ha-proxy-public"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - name: https
      port: 443
      targetPort: 443
  selector:
    app: haproxy-public
```

Le tier de l'IP réservée doit être celui de l'annotation. Dans le cas contraire le Service reste sans IP. La [doc GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-tiers) donne l'erreur à chercher dans `kubectl describe service` : `requested ip ... is neither static nor assigned to the LB`. Avec le contrôleur L4 à backend service (`l4-rbs`), l'event dit plutôt `Network tier mismatch for resource Static IP (...)`.

Un changement de tier au niveau du cluster ne touche pas l'existant. D'après la doc, les nouveaux node pools et les nouveaux Services héritent du nouveau tier, les anciens gardent le leur. Le tier d'un node pool ne se règle qu'au niveau projet ou cluster. Sur un cluster dont les nœuds sont créés par l'autoscaling de node pools, passer les nœuds en Premium revient à vider puis supprimer les pools publics pour qu'ils soient recréés.

## Basculer sans couper : 2 Services en parallèle

Modifier l'annotation d'un Service existant ne marche pas. Le contrôleur L4 de GKE (`cloud.google.com/l4-rbs: "enabled"`) refuse de changer le tier d'une forwarding rule en place : le Service reste en erreur avec un event `SyncExternalLoadBalancerFailed ... Network tier mismatch`.

2 façons de s'en sortir :

- **Supprimer puis recréer le Service** : le finalizer retire la forwarding rule Standard et le contrôleur la recrée en Premium sur l'IP réservée. Compter quelques minutes de coupure franche et une IP qui change.
- **Créer un 2e Service Premium à côté du Standard** : les 2 VIP répondent en même temps, on bascule par le DNS puis on supprime l'ancien. La coupure disparaît et le rollback consiste à repointer le DNS.

On a retenu la seconde. Dans l'ordre :

1. Réserver les adresses Premium à côté des Standard, sans toucher à ces dernières (un changement de tier sur une adresse existante force un destroy, refusé tant que l'adresse est `IN_USE`).
2. Déployer le Service Premium avec son annotation de tier et le nom de l'adresse réservée.
3. Vérifier que la VIP répond, puis baisser le TTL et basculer les enregistrements DNS.
4. Supprimer l'ancien Service et les adresses Standard dans un dernier changement.

## Pièges rencontrés

### Tier de l'annotation et de l'adresse

Un seul des 2 qui bascule suffit à laisser le LB sans IP. Quand le tier se lit dans une valeur partagée, on le dérive d'un seul réglage par cluster pour que le tier et le nom de l'adresse changent ensemble. Un `helm template` avant et après vérifie qu'un cluster sans réglage garde le même rendu.

### Une annotation inline qu'aucun values file ne surcharge

Dans un ApplicationSet ArgoCD, les `values:` inline passent avant tous les `valueFiles`. Une annotation de tier écrite en inline ne se surcharge donc pas par cluster : on bascule en réalité tous les clusters du même type. On la sort d'abord vers un fichier de valeurs commun dans un changement qui ne modifie pas le rendu, puis on la surcharge par cluster.

### Le nom d'adresse attendu n'existe pas

Un ApplicationSet qui demande `<cluster>-ha-proxy-public` alors que l'adresse réservée s'appelle autrement garde son IP tant que la forwarding rule existe. Au moment du changement de tier la forwarding rule est recréée, GKE cherche l'adresse inexistante et le LB reste sans IP. Il faut lister les adresses réelles avant la bascule.

### Un enregistrement DNS qu'external-dns ne possède pas

Après la bascule, external-dns a repointé les enregistrements qu'il gérait. L'apex, créé à la main, n'avait pas de TXT d'ownership et pointait toujours sur l'ancienne IP : les manifestes du player partaient en timeout. Avant de basculer, on vérifie que chaque hôte public a son TXT `externaldns-*` et on cherche les enregistrements en dur chez un tiers (CDN, configs de partenaires).

### Le tier au niveau cluster d'un cluster privé

Poser `--network-tier=Premium` sur un cluster en `private_nodes` a été refusé par l'API au moment de l'apply, avec `Error 400: Cannot configure network tier for a private cluster`. Le plan Terraform ne le voit pas, c'est une validation côté API. On le sait donc trop tard, sur la branche principale. Chaque apply suivant refait la même erreur tant qu'on ne revert pas.

### La Cloud NAT reste en Standard

Les connexions que les pods ouvrent eux-mêmes vers Internet sortent par la Cloud NAT, dont les adresses ont leur propre tier, indépendant de celui des LB. Les réponses aux clients, elles, repartent avec la VIP du LB : avec un LB passthrough en retour direct, le nœud répond avec la VIP comme source et la réponse sort du VPC sans repasser par le LB. Le tier du LB suffit donc pour le trafic client. Passer les adresses d'une NAT partagée en Premium changerait les IP de sortie de tous les clusters qui la partagent.

### Un Service sans annotation hérite du cluster

Une fois le cluster en Premium, tout futur Service `LoadBalancer` créé sans annotation sera en Premium. Un Service dont on veut le Standard garde une annotation explicite.

## Vérifier le résultat

Les 2 commandes suivantes montrent le tier réel des adresses et des forwarding rules. La date de création de celles en Premium donne le début du trafic Premium.

```bash
PROJECT_ID="my-k8s-prod"

# Attendu : les adresses du LB avec leur tier et IN_USE une fois le Service synchronisé
gcloud compute addresses list \
  --project="$PROJECT_ID" \
  --filter="name~haproxy" \
  --format='table(name,address,networkTier,status,creationTimestamp.date("%Y-%m-%d %H:%M"))'

# Attendu : une forwarding rule PREMIUM sur la nouvelle IP
gcloud compute forwarding-rules list \
  --project="$PROJECT_ID" \
  --format='table(name,IPAddress,networkTier,creationTimestamp.date("%Y-%m-%d %H:%M"))'
```

Le trafic ne passe en Premium qu'au moment où le DNS pointe sur la nouvelle IP, pas au moment du merge : la date de bascule se lit dans l'historique DNS, pas dans le repo. Côté HAProxy, le réglage du proxy derrière le LB est dans l'article de [performance tuning](../../web/haproxy/performance_tuning.md).
