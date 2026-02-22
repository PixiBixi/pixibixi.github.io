---
description: Configurer GKE Workload Identity pour lier un service account Kubernetes à un service account GCP sans gérer de clés JSON.
tags:
  - GKE
  - GCP
  - Security
  - IAM
---

# GKE Workload Identity

2 solutions sont adéquates pour s'identifier sur les services Google : Les Services Account (SA) et le Workload Identity

Les SA contiennent des secrets et doivent être rotate en cas de compromission...

Workload Identity règle ça : on lie un service account K8s (KSA) à un service account GCP (GSA), et les SDK GCP récupèrent automatiquement un token depuis la metadata API du nœud.

![Schéma Workload Identity : Pod → KSA → GSA → services GCP](./_img/workload_identity.svg)

## Avec Terraform

Deux points à activer : le cluster (`workload_pool`) et chaque node pool (`GKE_METADATA`).

!!! warning "Node pool obligatoire"
    Sans `workload_metadata_config { mode = "GKE_METADATA" }` sur le node pool, Workload
    Identity ne fonctionne pas même si le cluster est configuré.

```hcl
# Cluster — activer le workload pool
resource "google_container_cluster" "main" {
  # ...
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
}

# Node pool — activer GKE_METADATA (déclenche un rolling update si existant)
resource "google_container_node_pool" "default" {
  # ...
  node_config {
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# GSA et ses permissions
resource "google_service_account" "app" {
  account_id   = "my-app-sa"
  display_name = "my-app service account"
}

resource "google_project_iam_member" "app_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Liaison KSA → GSA
# Le format du member est strict : PROJECT.svc.id.goog[NAMESPACE/KSA_NAME]
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/${var.ksa_name}]"
}

# KSA annoté
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "my-app"
    namespace = var.namespace
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.app.email
    }
  }
}
```

## Utiliser dans le pod

```yaml
spec:
  serviceAccountName: my-app
  containers:
    - name: my-app
      image: my-app:latest
      # Les SDK GCP utilisent ADC automatiquement, rien d'autre à faire
```

## Vérifier que ça fonctionne

```bash
kubectl run -it --rm workload-identity-test \
  --image=google/cloud-sdk:slim \
  --namespace=${K8S_NAMESPACE} \
  --overrides='{"spec":{"serviceAccountName":"'${KSA_NAME}'"}}' \
  -- bash
```

Dans le pod :

```bash
gcloud auth list
# ou via la metadata API directement
curl -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"
```

## Troubleshooting

| Symptôme | Cause probable |
|----------|---------------|
| `could not find default credentials` | Annotation KSA manquante ou mauvais SA dans le pod |
| `403 Permission denied` | IAM binding manquant ou mauvais rôle sur le GSA |
| Token GSA incorrect | Node pool sans `GKE_METADATA` |
| `svc.id.goog` absent de la metadata | Workload Identity non activé sur le cluster |

```bash
# Vérifier la liaison IAM
gcloud iam service-accounts get-iam-policy \
  ${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com

# Debug metadata API depuis un pod
curl -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/"
```
