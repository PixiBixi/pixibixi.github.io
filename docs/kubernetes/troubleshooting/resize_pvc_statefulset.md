---
description: "Redimensionner les PVC d'un StatefulSet Kubernetes : allowVolumeExpansion, delete --cascade=orphan, FileSystemResizePending et le piège ArgoCD qui recrée le StatefulSet."
tags:
  - PVC
  - StatefulSet
  - Kubernetes
  - Storage
---

# Resize les PVC de son StatefulSet : cascade orphan et pièges

Les Statefulset, c'est archaïque.

By-design, la spec ne permet pas de resize les PVC alors qu'on peut totalement resize les PVC des pods associés. Le champ `volumeClaimTemplates` est immuable, donc un `kubectl apply` avec une taille plus grande sort ça :

```text
The StatefulSet "my-statefulset" is invalid: spec: Forbidden: updates to statefulset spec
for fields other than 'replicas', 'ordinals', 'template', 'updateStrategy',
'persistentVolumeClaimRetentionPolicy' and 'minReadySeconds' are forbidden
```

Heureusement, tout est possible eheh. L'idée est de supprimer l'objet StatefulSet en laissant vivre les pods et les PVC, puis de le recréer avec le nouveau template.

## Vérifier que la StorageClass autorise l'expansion

C'est le point de blocage numéro 1, et il n'a rien à voir avec le StatefulSet. Sans `allowVolumeExpansion: true`, le patch du PVC est refusé par l'admission :

```bash
kubectl get sc -o custom-columns='NAME:.metadata.name,PROVISIONER:.provisioner,EXPANSION:.allowVolumeExpansion'
```

```text
NAME                 PROVISIONER              EXPANSION
standard-rwo         pd.csi.storage.gke.io    true
premium-rwo          pd.csi.storage.gke.io    true
legacy-gce           kubernetes.io/gce-pd     <none>
```

Le champ est modifiable à chaud sur une StorageClass existante, donc pas besoin d'en recréer une :

```bash
kubectl patch sc standard-rwo -p '{"allowVolumeExpansion": true}'
```

!!! warning "Un volume ne peut que grandir"
    Kubernetes ne sait pas réduire un PVC, quel que soit le CSI. Une erreur de frappe qui demande 5 Ti au lieu de 500 Gi n'est pas annulable par un simple retour en arrière, il faut passer par un nouveau PVC et une copie des données.

## Sauvegarder le manifest avant de supprimer

On va supprimer l'objet StatefulSet. Si le manifest ne vit pas dans un repo Git, il n'existe plus après la commande.

```bash
kubectl get sts my-statefulset -n prod -o yaml > /tmp/my-statefulset.yaml
```

## Le piège ArgoCD

Si le StatefulSet est géré par ArgoCD avec l'auto-sync activé, la suppression déclenche une resynchro qui le recrée immédiatement avec l'ancien `volumeClaimTemplates`. On se retrouve avec des PVC agrandis et un template qui ne correspond plus, donc un pod ordinal supplémentaire qui repartira à l'ancienne taille.

L'ordre correct est de couper l'auto-sync, de faire l'opération, de pousser la nouvelle taille dans Git, puis de réactiver :

```bash
argocd app set my-app --sync-policy none
# ... opération ...
argocd app set my-app --sync-policy automated
```

La même logique vaut pour n'importe quel opérateur qui possède le StatefulSet : un Strimzi ou un opérateur Postgres va le reconstruire depuis son CR, donc c'est le CR qu'il faut modifier, pas le StatefulSet.

## La procédure

```bash
# 1. Supprimer le StatefulSet en laissant les pods et les PVC en place
kubectl delete sts my-statefulset -n prod --cascade=orphan

# 2. Agrandir chaque PVC, un par ordinal
for i in 0 1 2; do
  kubectl patch pvc data-my-statefulset-$i -n prod \
    --type merge -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
done

# 3. Recréer le StatefulSet avec le nouveau template
#    (via Git/ArgoCD, ou depuis le manifest sauvegardé et édité)
kubectl apply -f /tmp/my-statefulset.yaml
```

!!! warning "Le flag `--cascade=orphan` est critique"
    Sans lui, les pods sont supprimés avec le StatefulSet. Les PVC survivraient quand même, mais on prend une coupure complète du service au lieu d'une opération transparente.

Les pods continuent de tourner pendant toute la manipulation : ils ne sont plus rattachés à un contrôleur, donc personne ne les touche. Un pod qui meurt à ce moment-là ne sera pas recréé, c'est la seule fenêtre de risque et elle dure le temps des 3 commandes.

À l'étape 3, le StatefulSet recréé adopte les pods existants par leur nom et leurs labels. Il ne les redémarre pas, puisque leur spec correspond déjà au template.

## Suivre le resize

L'agrandissement se fait en 2 temps : le volume côté cloud provider, puis le système de fichiers côté node. Les conditions du PVC racontent où on en est :

```bash
kubectl get pvc -n prod -o custom-columns='NAME:.metadata.name,CAPACITY:.status.capacity.storage,REQUESTED:.spec.resources.requests.storage,CONDITIONS:.status.conditions[*].type'
```

```text
NAME                     CAPACITY   REQUESTED   CONDITIONS
data-my-statefulset-0    200Gi      200Gi       <none>
data-my-statefulset-1    100Gi      200Gi       FileSystemResizePending
data-my-statefulset-2    100Gi      200Gi       Resizing
```

Les 3 états qu'on croise :

- `Resizing` : le CSI agrandit le disque côté provider, il n'y a rien à faire qu'attendre
- `FileSystemResizePending` : le disque est agrandi mais le filesystem ne l'a pas encore vu
- pas de condition et `CAPACITY` égal à `REQUESTED` : c'est terminé

Le `FileSystemResizePending` est celui qui inquiète, alors que la plupart des CSI modernes le résolvent seuls en quelques secondes. Les drivers qui ne savent faire que de l'expansion offline demandent un détachement du volume, donc un redémarrage du pod :

```bash
kubectl delete pod my-statefulset-1 -n prod
```

Sur un StatefulSet en `OrderedReady`, on supprime un pod à la fois et on attend le `Ready` avant le suivant. Voir [podManagementPolicy](../deployment/statefulset_pod_management_policy.md) pour ce que ça change sur la durée de l'opération.

La vérification qui compte est celle vue depuis le conteneur, pas celle de l'API :

```bash
kubectl exec -n prod my-statefulset-1 -- df -h /var/lib/data
```

## Quand ça reste bloqué

Le cas le plus fréquent est un `Resizing` qui ne bouge pas pendant plusieurs minutes. Les événements du PVC disent pourquoi :

```bash
kubectl describe pvc data-my-statefulset-1 -n prod | tail -20
```

Les causes réelles, dans l'ordre de fréquence :

- **quota disque du projet ou de la région atteint.** L'événement le dit explicitement, avec le code du provider.
- **taille non alignée sur le pas du provider.** Certains disques ne s'allouent que par multiples, une demande de `137Gi` peut être refusée là où `140Gi` passe.
- **limite de taille du type de disque.** Un `pd-balanced` et un `hyperdisk` n'ont pas les mêmes plafonds, et le message ne le rappelle pas toujours.
- **le node n'a plus de slot d'attachement.** Rien à voir avec la taille, mais ça bloque la phase de resize du filesystem.

Si la demande était trop grande et que le provider la refuse définitivement, le PVC reste coincé entre son ancienne capacité et sa nouvelle requête. Kubernetes sait revenir en arrière sur la requête, à condition que le feature gate `RecoverVolumeExpansionFailure` soit actif sur le cluster : on repatche `spec.resources.requests.storage` vers une valeur plus petite que celle demandée, mais jamais plus petite que `status.capacity`.

## Voir aussi

- [StatefulSet - podManagementPolicy](../deployment/statefulset_pod_management_policy.md) - l'ordre de redémarrage des pods
- [ArgoCD : Sync Options](../argocd/sync_options.md) - couper proprement la resynchro pendant une opération manuelle
- [Comment rollout restart un composant Strimzi](../operator/strimzi/rollout_strimzi.md) - le cas d'un StatefulSet possédé par un opérateur
- [Commandes utiles pour K8S](../cli/useful_commands.md) - les `custom-columns` et autres raccourcis kubectl
