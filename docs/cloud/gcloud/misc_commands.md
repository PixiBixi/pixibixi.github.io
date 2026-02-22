---
description: Commandes utiles pour la CLI gcloud — Cloud SQL, GKE, IAM et gestion de projets
---

# Commandes utiles pour la CLI Gcloud

```bash
CLOUDSDK_CORE_PROJECT=<GCP_PROJECT> gcloud beta sql connect <INSTANCE_NAME> --database=<DB_NAME --user=<USER_SQL>
```

Permet de se connecter a n'importe quelle instance CloudSQL facilement sur le project que vous souhaitez.

Il vous faudra probablement le cloud-sql-proxy, pour cela : `gcloud components install cloud_sql_proxy`

------------------------------------------------------------------------

```bash
gcloud compute ssh <NODE_NAME> --zone <ZONE>
```

Pour se connecter a un noeud GKE en SSH, possible de faire un `gcloud compute instances list` avant pour lister les noeuds

Petit bonus, dans un noeud GKE nous avons une petite commande appelée `toolbox` qui permet de troubleshoot un noeud
