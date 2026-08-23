---
description: "Valider une config Renovate avec renovate-config-validator : clés inconnues, managers qui n'existent pas et le silence de Renovate sur les forks avec forkProcessing."
tags:
  - GitHub Actions
  - CI/CD
  - Renovate
  - Supply chain
---

# Renovate : valider la config et son silence sur les forks

Une `renovate.json` invalide ne se signale pas toujours. Certaines erreurs font ouvrir une issue et arrêtent toutes les PR, d'autres sont ignorées en silence et sur un fork Renovate peut ne jamais rien faire sans que ça apparaisse nulle part. Les 3 cas sont arrivés sur 2 repos le même après-midi. Le validateur en attrape une partie et il faut savoir laquelle.

## Valider avant de pousser

Renovate publie son validateur dans le paquet npm, donc pas besoin d'attendre un cycle sur la plateforme :

```bash
cd /le/repo
npx --yes --package renovate@latest -- renovate-config-validator
```

Sortie sur une config saine :

```text
 INFO: Validating renovate.json
 INFO: Config validated successfully against 1 file(s)
```

Deux détails de l'invocation valent le détour.

**Épingler la version.** `--package renovate` sans tag, qui est la forme de la [doc officielle](https://docs.renovatebot.com/config-validation/), laisse npx servir ce qu'il a en cache. Le mien datait de plusieurs majeures et refusait une config que la 44 accepte, ce qui suffit à conclure l'inverse de la réalité sur le point qu'on cherchait à vérifier.

**Savoir dans quel mode il tourne.** Passer un chemin en argument fait valider le fichier comme config **globale**, celle d'une instance self-hosted et pas comme config de repo. `--no-global` force le mode repo et la première ligne de sortie dit toujours lequel a tourné :

```text
 INFO: Validating renovate.json as global config
 INFO: Validating renovate.json as repo config
```

Sans argument du tout, il détecte les emplacements par défaut et prend le mode repo. Je n'ai pas trouvé de cas où le mode change le verdict, une clé inconnue est refusée dans les 2, mais autant valider dans le mode qui correspond au fichier.

`--strict` fait en plus échouer la validation quand une migration de config est nécessaire, ce que Renovate propose sinon via une case à cocher dans le dependency dashboard.

## Le hook pre-commit, qui épingle la version pour vous

Renovate publie [ses hooks](https://github.com/renovatebot/pre-commit-hooks) et leur `rev` **est** la version de Renovate. Le problème de cache npx disparaît, puisque le hook installe `renovate@<rev>` en dépendance :

```yaml title=".pre-commit-config.yaml"
repos:
  - repo: https://github.com/renovatebot/pre-commit-hooks
    rev: 44.39.2
    hooks:
      - id: renovate-config-validator
```

Le hook matche `renovate.json`, `.renovaterc`, `renovate.json5` et leurs variantes et demande pre-commit 3.6.0 au minimum. Comme pre-commit passe les fichiers matchés en arguments, il valide en mode global : ajouter `args: [--no-global]` remet le mode repo.

Renovate met à jour ce `rev` tout seul, donc le validateur suit la version qui tourne réellement sur le dépôt.

## Documenter une config sans la casser

La convention `"// commentaire"` marche dans plusieurs outils qui manipulent du JSON. Renovate valide strictement et refuse toute clé qu'il ne connaît pas :

```json title="renovate.json, ce qui casse"
{
  "// forkProcessing": "ce repo est un fork, renovate saute les forks par défaut",
  "forkProcessing": "enabled"
}
```

Renovate ouvre alors une issue `Action Required: Fix Renovate Configuration` et **arrête d'ouvrir des PR** jusqu'à correction. Le champ prévu pour documenter est `description`, valable au niveau racine comme dans une `packageRule` :

```json title="renovate.json, ce qui passe"
{
  "description": "ce repo est un fork, renovate saute les forks par défaut",
  "forkProcessing": "enabled"
}
```

## github-runners : une datasource, pas un manager

[`github-runners`](https://docs.renovatebot.com/modules/datasource/github-runners/) suit les labels de runner (`ubuntu-24.04`, `macos-15`). C'est une **datasource**, il n'existe pas de page de manager pour elle et les labels sont détectés par le manager `github-actions` qui lit les workflows. Donc une règle sur `github-actions` seul les couvre déjà.

| Ce qu'on veut | La clé |
|---|---|
| Tout ce que le manager github-actions détecte, actions et labels de runner | `"matchManagers": ["github-actions"]` |
| Seulement les labels de runner | `"matchDatasources": ["github-runners"]` |

Et c'est là que le validateur ne sert à rien. Renovate 44 accepte n'importe quelle chaîne dans `matchManagers`, y compris `ceci-nexiste-absolument-pas` et sort en succès. Une version plus ancienne refusait, avec la liste des managers valides dans le message :

```text
ERROR: Found errors in configuration
  "message": "packageRules: You have included an unsupported manager in a
  package rule. Your list: github-actions,github-runners.
  Supported managers are: (ansible, ..., github-actions, gitlabci, ...)"
```

Ce contrôle a disparu, donc sur ce point c'est la doc qui tranche, pas l'outil. Une règle qui cible un manager inexistant ne matche rien et ne le dit pas : elle a l'air de fonctionner et le `semanticCommitType` ou le `groupName` qu'elle porte ne s'applique jamais.

## Le silence de Renovate sur les forks

`forkProcessing` vaut `disabled` par défaut, donc sur un fork Renovate n'ouvre ni PR d'onboarding, ni dependency dashboard, ni issue de config et c'est le défaut le plus coûteux à diagnostiquer parce qu'il ne produit aucun signal.

Sur un repo créé par fork, sans savoir que l'option existe, on regarde une config correcte en se demandant pourquoi rien ne bouge.

```json title="renovate.json"
{
  "description": "ce repo est un fork, renovate saute les forks par défaut",
  "forkProcessing": "enabled"
}
```

Vérifier si un repo est un fork tient en une commande :

```bash
gh api repos/OWNER/REPO --jq '{fork: .fork, parent: .parent.full_name}'
```

Un fork hérite aussi des **issues désactivées**. Renovate y met son dependency dashboard, donc tant qu'elles sont fermées il n'a nulle part où lister ce qu'il retient. Ça n'empêche pas les PR, mais on perd la vue d'ensemble et la case « lancer maintenant ».

## Attraper l'erreur avant que Renovate la trouve

Le validateur tient dans un job, ce qui évite de découvrir l'erreur par une issue que Renovate ouvre 6 heures plus tard :

```yaml title=".github/workflows/renovate-config.yml"
name: renovate-config

on:
  pull_request:
    paths: ['renovate.json']

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - run: npx --yes --package renovate@latest -- renovate-config-validator
```

!!! tip "Aller plus loin"
    Le durcissement de la CI et les presets Renovate qui vont avec, `helpers:pinGitHubActionDigests`, `minimumReleaseAge` et l'automerge, sont détaillés dans [Durcir une CI GitHub Actions](hardening.md).
