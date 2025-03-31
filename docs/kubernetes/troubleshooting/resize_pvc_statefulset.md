# Resize les PVC de son Statefulset

Les Statefulset, c'est archaïque.

By-design, la spec ne permet pas de resize les PVC alors qu'on peut totalement resize les PVC des pods associés.

Heureusement, tout est possible eheh

  * On commence par modifier la taille de ses PVC sur les pods : `kubectl edit pvc`
  * On delete le statefulset **sans** toucher les pods associés : `kubectl delete sts my-statefulset --cascade=orphan`
  * On modifie le template PVC dans le statefulset : `kubectl edit sts my-statefulset`

Hoplà, on aura notre templace PVC modifié pour nos STS
