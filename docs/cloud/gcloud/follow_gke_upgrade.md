---
description: Suivre en temps réel l'upgrade d'un cluster GKE via la CLI gcloud
---

# Suivre l'upgrade de son cluster GKE

Pour suivre l'upgrade de son cluster, rien de plus simple en CLI

```bash
➜  ~ CLOUDSDK_CORE_PROJECT=infra-tooling-prod gcloud container operations list
NAME                                                          TYPE            LOCATION      TARGET                            STATUS_MESSAGE  STATUS   START_TIME                      END_TIME
operation-1711096877589-18d83587-5e25-450c-b618-b654f799abde  UPGRADE_MASTER  europe-west9  base                                              DONE     2024-03-22T08:41:17.589291471Z  2024-03-22T09:01:56.984453011Z
operation-1711098166505-0ead2ed8-bc2c-4ff0-924f-fe5b826f66f1  UPGRADE_NODES   europe-west9  base-nodes                                        DONE     2024-03-22T09:02:46.505484674Z  2024-03-22T09:15:41.09066521Z
operation-1711184536102-5758fd6d-2243-433a-b476-8dbd31f5084b  UPDATE_CLUSTER  europe-west9  base                                              DONE     2024-03-23T09:02:16.102882095Z  2024-03-23T09:23:14.850134991Z
operation-1711448273774-b837afd1-1408-4541-b019-92c202f6d7b8  UPGRADE_MASTER  europe-west9  base                                              DONE     2024-03-26T10:17:53.77434957Z   2024-03-26T10:39:25.616070515Z
operation-1711449573743-d652f291-4296-4ac4-b70f-90c34955d19c  UPGRADE_NODES   europe-west9  base-nodes                                        DONE     2024-03-26T10:39:33.743427117Z  2024-03-26T10:53:50.945336487Z
operation-1711450953708-c2a224b6-c4ba-42c7-801c-c37b01f84885  UPGRADE_MASTER  europe-west9  base                                              DONE     2024-03-26T11:02:33.70891765Z   2024-03-26T11:22:19.967213551Z
operation-1711452142084-2c24cb00-60f0-453d-971a-bf4aafda29fb  UPGRADE_NODES   europe-west9  base-nodes                                        DONE     2024-03-26T11:22:22.08417734Z   2024-03-26T11:32:23.889954201Z
operation-1711457585106-9929c0ea-8691-49b2-b769-6ca7fad1a804  UPGRADE_MASTER  europe-west9  tooling-gcp-europe-west9                          DONE     2024-03-26T12:53:05.106418842Z  2024-03-26T13:13:13.718667912Z
operation-1711458817372-c0195207-cfe4-4043-b42c-ce7f1a213154  UPGRADE_NODES   europe-west9  tooling-gcp-europe-west9-default                  RUNNING  2024-03-26T13:13:37.372498057Z
```

Il peut être important de préciser le `CLOUDSDK_CORE_PROJECT` si nous souhaitons follow plusieurs projects Google au même moment
