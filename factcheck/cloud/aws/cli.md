---
article: docs/cloud/aws/cli.md
checked: '2026-11-10'
commit: ac2422c4b148ce7b6959564f37bb04a115aafa0a
sources: []
unpinned: 4
---

# docs/cloud/aws/cli.md

## Findings

- L73 ERROR corrigé : plus de "regex", seulement les jokers `*` et `?`, exemple de motif regex qui ne matche rien, et liste de valeurs (OR) pour plusieurs familles. Preuve : EC2 User Guide "Find your Amazon EC2 resources", section "List and filter using the command line" : "You can use wildcards with the filter values. An asterisk (*) matches zero or more characters, and a question mark (?) matches zero or one character." ; les regex n'y sont citées que pour les filtres client de la console.
- L82 ERROR corrigé : filtre remplacé par `--source user` (côté API), `ApplyMethod` retiré du filtre avec une phrase sur son sens. Preuve : botocore @135910e22 `botocore/data/rds/2014-10-31/service-2.json` : `DescribeDBParametersMessage.Source` "Valid Values: user | system | engine-default", `ApplyMethod` enum `immediate | pending-reboot` ("Indicates when to apply parameter updates"). Non vérifié en réel : que `ApplyMethod=='immediate'` ramène des paramètres par défaut (pas de compte AWS testé), la correction tient de toute façon par la sémantique.
- L2 IMPRECISE corrigé : description = "requêtes et filtres EC2, paramètres RDS modifiés" (pas de S3/IAM/EKS dans l'article).
- L75 IMPRECISE corrigé : liens Regex101/Pyrexp retirés, remplacés par l'orientation vers `--query` (JMESPath : `starts_with`, `contains`, pas de regex) ou `jq` `test()` pour un vrai filtre regex.

## En plus

- "modifié" -> "modifiées" dans la phrase RDS, phrase déplacée avant le bloc de code.
- `variables:` ajoutées (`parameter_group`, `region`) pour le bloc RDS ; la commande affiche aussi `ParameterValue`.

## Modernisation

- Ignoré : la suggestion (`--no-cli-pager`, `--output text`) n'apportait rien de vérifié au contenu existant.

## Tests

- Aucun appel AWS (pas de compte). Vérif sur le modèle botocore cloné (`~/Documents/work/src/botocore`, nouveau clone blob:none) et la doc EC2.

## À signaler

- La doc AWS se contredit sur `?` ("zero or one character" dans les considérations, "exactly 1 character" dans l'exemple). L'article dit "un caractère".
- Nouveau clone créé : `~/Documents/work/src/botocore`.
