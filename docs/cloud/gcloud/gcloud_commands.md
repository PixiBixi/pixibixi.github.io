---
description: Commandes utiles pour la CLI gcloud - Cloud SQL, GKE, IAM et gestion de projets
tags:
  - GCP
  - gcloud
---

# Commandes utiles pour la CLI Gcloud

Pour se connecter a une instance Cloud SQL depuis son poste :

```bash
CLOUDSDK_CORE_PROJECT=<GCP_PROJECT> gcloud sql connect <INSTANCE_NAME> --user=<USER_SQL>
```

Permet de se connecter a n'importe quelle instance CloudSQL facilement sur le project que vous souhaitez. Sur PostgreSQL et SQL Server, on ajoute `--database=<DB_NAME>` ; sur MySQL gcloud refuse ce flag.

Sur un gcloud récent, la commande passe par le Cloud SQL Proxy v2 (`--private-ip` pour une instance sans IP publique), il faut donc le binaire dans le PATH : `gcloud components install cloud-sql-proxy`. Les vieilles versions de gcloud ajoutaient plutôt notre IP dans les authorized networks de l'instance, et seul `gcloud beta sql connect` passait par le proxy.

------------------------------------------------------------------------

Pour un noeud GKE :

```bash
gcloud compute ssh <NODE_NAME> --zone <ZONE>
```

Pour se connecter a un noeud GKE en SSH, possible de faire un `gcloud compute instances list` avant pour lister les noeuds. Sur un cluster aux noeuds privés (sans IP externe), on ajoute `--tunnel-through-iap` pour passer par IAP.

Petit bonus, sur les noeuds en Container-Optimized OS (l'image par défaut de GKE) nous avons une petite commande appelée `toolbox` qui permet de troubleshoot un noeud.

## Voir aussi

- [Suivre l'upgrade de son cluster GKE](gke_upgrades.md)
- [GKE Spot Nodes](spot_nodes.md)
- [GKE Workload Identity](workload_identity.md) - authentification IAM sans clé JSON pour les pods GKE
