---
description: "Valider une config Renovate avec renovate-config-validator : clés inconnues, managers qui n'existent pas et le silence de Renovate sur les forks avec forkProcessing."
tags:
  - GitHub Actions
  - CI/CD
  - Renovate
  - Supply chain
---

# Renovate : valider la config, managers et forks

Un `renovate.json` invalide ne se signale pas toujours. Certaines erreurs font ouvrir une issue et arrêtent toutes les PR, d'autres sont ignorées en silence. Sur un fork, c'est un silent fail complet : Renovate ne fait rien et rien ne le signale. Les 3 cas sont arrivés sur 2 repos le même après-midi. Le validateur en attrape une partie et il faut savoir laquelle.

## Valider avant de pousser

Renovate publie son validateur dans son paquet npm, on n'a pas besoin d'attendre son prochain passage sur le repo pour savoir si la config tient :

```bash
cd /le/repo
npx --yes --package renovate@44.39.2 -- renovate-config-validator --strict
```

Sortie sur une config saine :

```text
 INFO: Validating renovate.json
 INFO: Config validated successfully against 1 file(s)
```

2 détails de l'invocation changent le résultat.

### Fixer la version de Renovate dans l'appel npx

Sans tag, la forme `--package renovate` de la [doc officielle](https://docs.renovatebot.com/config-validation/) laisse npx utiliser la version qu'il a en cache. Le cache local datait de plusieurs majeures et refusait une config que Renovate 44 accepte : le validateur donnait tort à une config juste. `@latest` règle le cache mais pas la reproductibilité : une nouvelle version de Renovate peut faire échouer une PR qui ne touche pas à la config. On épingle donc une version précise, que Renovate met à jour comme le reste.

### Valider en mode repo, pas en mode global

Passer un chemin en argument fait valider le fichier comme config **globale**, celle d'une instance self-hosted et pas comme config de repo. `--no-global`, ajouté au validateur en janvier 2026, force le mode repo, et la ligne de sortie annonce alors le mode :

```text
 INFO: Validating renovate.json as global config
 INFO: Validating renovate.json as repo config
```

Le suffixe `as <mode> config` n'apparaît que quand on passe un fichier en argument. Sans argument, le validateur découvre les emplacements par défaut, valide en mode repo et se contente de `INFO: Validating renovate.json`, comme dans [la sortie d'une config saine](#valider-avant-de-pousser).

Une clé inconnue est refusée dans les 2 modes, et on en conclut vite que le mode ne change rien. En mode global pourtant, les options réservées à la config globale passent en silence, alors qu'en mode repo elles sont rejetées. Testé avec Renovate 44 sur `{"autodiscover": true, "binarySource": "install"}` :

```text
$ renovate-config-validator c.json
 INFO: Config validated successfully against 1 file(s)

$ renovate-config-validator --no-global c.json
       "message": "The \"autodiscover\" option is a global option reserved only for Renovate's
                    global configuration and cannot be configured within a repository's config file"
```

Valider une config de repo en mode global laisse donc passer ce que le run réel de Renovate refusera, et `--no-global` n'a rien d'une préférence.

Avec `--strict`, la validation échoue aussi quand une migration de config est nécessaire. Sans lui, Renovate se contente de la proposer par une case à cocher dans le dependency dashboard. On le passe partout, en local comme en CI : une config à migrer finit toujours par casser, autant le savoir dans la PR qui l'introduit.

## Épingler la version avec le hook pre-commit

Renovate publie [ses hooks](https://github.com/renovatebot/pre-commit-hooks) et leur `rev` **est** la version de Renovate. Le hook installe `renovate@<rev>` en dépendance et le problème de cache npx disparaît :

```yaml title=".pre-commit-config.yaml"
repos:
  - repo: https://github.com/renovatebot/pre-commit-hooks
    rev: 44.39.2
    hooks:
      - id: renovate-config-validator
        args: [--no-global, --strict]
```

Le hook cible `renovate.json`, `.renovaterc`, `renovate.json5` et leurs variantes. Il demande pre-commit 3.6.0 au minimum. Comme pre-commit passe les fichiers matchés en arguments, le hook valide par défaut en mode global, d'où le `--no-global` dans `args`.

Renovate ne met pas ce `rev` à jour de lui-même, parce que son manager `pre-commit` est livré avec `enabled: false`. Sans opt-in explicite, le `rev` reste sur sa version de départ et le validateur du hook décroche de la version de Renovate qui tourne vraiment. On active le manager avec un preset :

```json title="renovate.json"
{
  "extends": [":enablePreCommit"]
}
```

Le même réglage s'écrit `{"pre-commit": {"enabled": true}}`. Les mainteneurs de pre-commit ne supportent pas ce manager, et Renovate le rappelle dans le corps de ses PR.

## Documenter une config sans la casser

La convention `"// commentaire"` passe dans plusieurs outils qui manipulent du JSON. Renovate, lui, refuse toute clé qu'il ne connaît pas :

```json title="renovate.json, ce qui casse"
{
  "// forkProcessing": "ce repo est un fork, à traiter même en autodiscover",
  "forkProcessing": "enabled"
}
```

Renovate ouvre alors une issue `Action Required: Fix Renovate Configuration` et **arrête d'ouvrir des PR** jusqu'à correction. Le champ prévu pour documenter est `description`, valable au niveau racine comme dans une `packageRule`. Un `renovate.json5` accepte aussi les commentaires natifs, mais `description` marche quel que soit le format du fichier :

```json title="renovate.json, ce qui passe"
{
  "description": "ce repo est un fork, à traiter même en autodiscover",
  "forkProcessing": "enabled"
}
```

## Cibler les labels de runner par leur datasource

Renovate sépare 2 rôles. Un manager lit un type de fichier du repo et en extrait les dépendances, une datasource est la source où il va chercher les versions disponibles de ces dépendances.

[`github-runners`](https://docs.renovatebot.com/modules/datasource/github-runners/) suit les labels de runner (`ubuntu-24.04`, `macos-26`). C'est une **datasource** et pas un manager : les labels sont détectés par le manager `github-actions`, qui lit les workflows. Une règle sur `github-actions` seul les couvre donc déjà.

| Ce qu'on veut | La clé |
|---|---|
| Tout ce que le manager github-actions détecte, actions et labels de runner | `"matchManagers": ["github-actions"]` |
| Seulement les labels de runner | `"matchDatasources": ["github-runners"]` |

Sur ce point, le validateur ne voit rien. Renovate 44 accepte n'importe quelle chaîne dans `matchManagers`, y compris `ceci-nexiste-absolument-pas` et sort en succès. Une version plus ancienne refusait, avec la liste des managers valides dans le message :

```text
ERROR: Found errors in configuration
  "message": "packageRules: You have included an unsupported manager in a
  package rule. Your list: github-actions,github-runners.
  Supported managers are: (ansible, ..., github-actions, gitlabci, ...)"
```

Ce contrôle a disparu et seule la doc permet de savoir si un manager existe. Une règle qui cible un manager inexistant ne correspond à rien, sans erreur ni avertissement. Elle semble fonctionner alors que son `semanticCommitType` ou son `groupName` ne s'applique jamais.

## Le silence de Renovate sur les forks

`forkProcessing` vaut `auto` par défaut, et `auto` veut dire « sauter les forks en mode `autodiscover` ».

C'est le cas de l'app Mend installée sur « All repositories », et d'une instance self-hosted lancée en autodiscover.

Renovate n'ouvre alors sur un fork ni PR d'onboarding, ni dependency dashboard, ni issue de config. C'est le défaut le plus coûteux à diagnostiquer, parce qu'il ne produit aucun signal.

En dehors de l'autodiscover, quand les repos sont listés explicitement, les forks sont traités comme les autres repos. Le comportement dépend du mode d'exécution, d'où les retours contradictoires qu'on lit à ce sujet.

Sur un repo créé par fork, sans savoir que l'option existe, on regarde une config correcte en se demandant pourquoi rien ne bouge. La correction tient en une clé, documentée par `description` comme [plus haut](#documenter-une-config-sans-la-casser) :

```json title="renovate.json"
{
  "description": "ce repo est un fork, à traiter même en autodiscover",
  "forkProcessing": "enabled"
}
```

Vérifier si un repo est un fork tient en une commande :

```bash
gh api repos/OWNER/REPO --jq '{fork: .fork, parent: .parent.full_name}'
```

GitHub crée aussi chaque fork avec les **issues désactivées**, quel que soit l'état du parent. Renovate publie son dependency dashboard dans une issue : tant qu'elles restent fermées, il n'a aucun endroit où lister les mises à jour qu'il retient. Les PR continuent d'arriver, mais on perd la vue d'ensemble et la case qui relance Renovate depuis le dashboard. L'issue qui signale une config invalide ne peut pas s'ouvrir non plus : sur un fork, une config cassée arrête les PR sans qu'aucun message n'apparaisse.

## Valider la config en CI avant que Renovate la lise

Le validateur tourne dans un job de CI. L'erreur apparaît dans la PR qui l'introduit, au lieu d'une issue que Renovate ouvre à son passage suivant :

```yaml title=".github/workflows/renovate-config.yml"
name: renovate-config

on:
  pull_request:
    paths: ['renovate.json*', '.renovaterc*', '.github/renovate.json*']

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - env:
          # renovate: datasource=npm depName=renovate
          RENOVATE_VERSION: 44.39.2
        run: npx --yes --package "renovate@${RENOVATE_VERSION}" -- renovate-config-validator --strict
```

Le commentaire `# renovate:` n'est lu que par un `customManager` regex qui cible les workflows, comme celui du [`renovate.json` de gopen](https://github.com/PixiBixi/gopen/blob/main/renovate.json).

!!! tip "Durcissement et pièges propres à gomod"
    Le durcissement de la CI et les presets Renovate associés (`helpers:pinGitHubActionDigests`, `minimumReleaseAge`, l'automerge) sont détaillés dans [Durcir une CI GitHub Actions](hardening.md). Les pièges propres au manager `gomod` sont dans [Renovate et les modules Go](renovate-gomod.md) : la config y est valide et aucun validateur ne les voit.
