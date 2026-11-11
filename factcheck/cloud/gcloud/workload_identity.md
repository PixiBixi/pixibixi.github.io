---
article: docs/cloud/gcloud/workload_identity.md
checked: '2026-11-11'
commit: fc9123292deaf05f37f9393047e99e01f6910ed0
sources: []
unpinned: 4
---

# docs/cloud/gcloud/workload_identity.md

## Findings

- L12 IMPRECISE corrigé : nom officiel ajouté ("renommé Workload Identity Federation for GKE"), paragraphe sur les 2 variantes (impersonation d'un GSA, accès direct) et nouvelle section "Accès direct sans GSA" avec un `google_project_iam_member` sur `principal://iam.googleapis.com/projects/<number>/locations/global/workloadIdentityPools/<project>.svc.id.goog/subject/ns/<ns>/sa/<ksa>` (numéro via `data "google_project"`). Preuve : docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity (WebFetch du jour) : nom "Workload Identity Federation for GKE", impersonation introduite par "Alternatively, you can configure Kubernetes ServiceAccounts to impersonate IAM service accounts", format `principal://` ; terraform-provider-google `website/docs/d/project.html.markdown` L49 (attribut `number`).
- L22 IMPRECISE corrigé : Autopilot toujours activé, les nouveaux node pools passent seuls en GKE_METADATA, seuls les existants sont à migrer (warning renommé "Node pools existants"), plus la mention de l'API IAM Service Account Credentials pour l'impersonation. Preuve : même page, "In Autopilot, Workload Identity Federation for GKE is always enabled." et "Existing node pools are unaffected, but any new node pools in the cluster use Workload Identity Federation for GKE." ; exigence de l'API IAM Service Account Credentials sur la même page.
- L117 IMPRECISE corrigé : ligne réattribuée au metadata server injoignable (NetworkPolicy `169.254.169.252/32` port 988, ou `169.254.169.254/32` port 80 en Dataplane V2, DNS de `metadata.google.internal`) ; l'annotation manquante a sa propre ligne (403, email `PROJECT_ID.svc.id.goog`) ; la ligne 403 inclut propagation IAM (2 à 7 min) et API IAM Credentials désactivée. Preuve : docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/authentication (WebFetch du jour) : "ComputeEngineCredentials cannot find the metadata server", règle NetworkPolicy 988/80, `Permission 'iam.serviceAccounts.getAccessToken' denied` dû à la propagation, "Invalid form of account ID (test_account.svc.id.goog)" qui montre l'identifiant non email par défaut, `iamcredentials.googleapis.com`.
- L120 IMPRECISE corrigé : ligne "`svc.id.goog` absent de la metadata" supprimée, remplacée par les 2 commandes `gcloud container clusters describe --format="value(workloadIdentityConfig.workloadPool)"` et `gcloud container node-pools describe --format="value(config.workloadMetadataConfig.mode)"`. Preuve : page troubleshooting/authentication, section diagnostic.

## En plus

- L119 "Token GSA incorrect | Node pool sans GKE_METADATA" précisé en "Email du SA des nodes dans la metadata" (symptôme observable). Basé sur la page how-to (sans GKE_METADATA les pods voient le SA des nodes), pas testé.

## Modernisation

- Appliqué : nom officiel, accès direct `principal://`, Autopilot, API IAM Service Account Credentials (les 4 suggestions).

## Tests

- Aucun cluster GKE disponible, rien d'exécuté. Sources : 2 pages de doc Google (WebFetch), clone terraform-provider-google.

## À signaler

- Le HCL de l'accès direct n'a pas été appliqué : la doc du provider (`google_project_iam.html.markdown` L168-173) ne liste pas `principal://` parmi les formats de `member`, mais le champ est passé tel quel à l'API IAM. À valider sur un vrai projet.
- Le titre de l'article et le schéma SVG présentent toujours seulement le chemin KSA vers GSA : laissés tels quels, l'article reste centré sur l'impersonation.
