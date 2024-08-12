# Commandes utiles pour la CLI Gcloud

```bash
CLOUDSDK_CORE_PROJECT=<GCP_PROJECT> gcloud beta sql connect <INSTANCE_NAME> --database=<DB_NAME --user=<USER_SQL>
```

Permet de se connecter a n'importe quelle instance CloudSQL facilement sur le project que vous souhaitez.

Il vous faudra probablement le cloud-sql-proxy, pour cela : `gcloud components install cloud_sql_proxy`
