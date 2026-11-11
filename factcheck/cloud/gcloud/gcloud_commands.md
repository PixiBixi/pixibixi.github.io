---
article: docs/cloud/gcloud/gcloud_commands.md
checked: '2026-11-11'
commit: 19624c8a22e7c488eaa8f8d23a32114b0d815d6c
sources: []
unpinned: 4
---

# docs/cloud/gcloud/gcloud_commands.md

## Findings

- L11 OUTDATED corrigé : `gcloud beta sql connect` remplacé par `gcloud sql connect`. Le `beta` avait une raison (en gcloud 535 le GA modifiait les authorized networks et seul le beta passait par le proxy), mais en gcloud 590 GA, beta et alpha appellent tous `RunProxyConnectCommand` avec le proxy v2. Le changement de comportement est mentionné en une phrase. Preuve : `lib/surface/sql/connect.py` L446-484 dans `google-cloud-cli:590.0.0-slim` ; `connect.py` L398-430 et l'aide GA dans le SDK Homebrew 535.0.0 local.
- L11 IMPRECISE corrigé : `--database` retiré de la commande, chevron manquant corrigé, et une phrase précise qu'il ne sert qu'en PostgreSQL et SQL Server. Preuve : `api_lib/sql/constants.py` `EXE_FLAGS['mysql']` sans clé `database` (535 et 590), `GetDatabaseArgs` dans `command_lib/sql/instances.py` L58 lève `InvalidArgumentException` "This instance does not support the database argument".
- L16 IMPRECISE corrigé : le composant s'appelle `cloud-sql-proxy` (Cloud SQL Proxy v2), et non `cloud_sql_proxy`. Preuve : `gcloud components list` (535) ne liste que `cloud-sql-proxy | Cloud SQL Proxy v2` ; en 590 le message d'erreur de `connect.py` L336-341 dit `gcloud components install cloud-sql-proxy` (en 535 il demandait encore le binaire v1 `cloud_sql_proxy`).
- L26 IMPRECISE corrigé : `toolbox` rattaché aux noeuds Container-Optimized OS. Preuve : <https://docs.cloud.google.com/container-optimized-os/docs/how-to/toolbox> ("the pre-installed toolbox utility" sur COS). Absence sur Ubuntu non confirmée (la doc n'en parle pas), donc non écrite.

## En plus

- Phrases d'introduction ajoutées avant les 2 blocs de code (règle de style).

## Modernisation

- `gcloud sql connect` en GA : appliqué (voir plus haut).
- `--tunnel-through-iap` pour les noeuds privés : appliqué en une phrase. Preuve : `gcloud compute ssh --help` (535) liste `--internal-ip | --tunnel-through-iap`.
- Ajouté aussi `--private-ip` (flag de `AddBaseArgs`, connect.py L203-206 en 590).

## Tests

- SDK Homebrew 535.0.0 local (aide et sources), conteneur `gcr.io/google.com/cloudsdktool/google-cloud-cli:590.0.0-slim` (sources). Aucune connexion réelle à une instance Cloud SQL.

## À signaler

- Le comportement "proxy v2 par défaut" dépend de la version de gcloud ; le SDK local de l'auteur (535) a encore l'ancien comportement. Version exacte du changement non identifiée, d'où le "gcloud récent" dans l'article.
