---
description: "Migrer les git hooks de pre-commit vers Lefthook, partager une config commune entre repos avec remotes, épingler un remote sur un tag contre le risque supply chain, aligner la CI sur les hooks locaux et borner une allowlist gitleaks."
tags:
  - Lefthook
  - Git hooks
  - pre-commit
  - gitleaks
  - Supply chain
  - CI/CD
---

# Lefthook : migrer de pre-commit, config partagée, remote épinglé et CI

Avec une vingtaine de repos d'infra, la même liste de hooks (lint YAML, gitleaks, validation de manifests) est recopiée dans chaque `.pre-commit-config.yaml`, avec des `rev` qui dérivent d'un repo à l'autre. Migrer vers Lefthook et tirer la config d'un repo partagé via `remotes` règle la dérive, mais déplace la confiance : ce repo exécute du code sur chaque poste et chaque runner CI. La suite détaille la migration, le partage, l'épinglage du remote sur un tag, la parité avec la CI et le scope d'une allowlist gitleaks.

## De pre-commit à Lefthook

Lefthook est un binaire unique (Go), sans runtime Python ni environnements par hook à construire. pre-commit télécharge et isole chaque hook dans son propre env, Lefthook exécute des commandes déjà présentes sur la machine : les outils (`yamllint`, `gitleaks`...) s'installent à part, par Homebrew, mise ou l'image CI.

La correspondance des notions, telle qu'on l'a appliquée :

| pre-commit | Lefthook |
|---|---|
| `repos[].hooks[]` | `commands:` (ou `jobs:`) d'un hook comme `pre-commit` |
| `files:` (regex) | [`glob`](https://lefthook.dev/configuration/glob.html), un glob et non une regex |
| `pass_filenames: true` | `{staged_files}` dans `run` |
| `pass_filenames: false` | `run` sans template de fichiers |
| `pre-commit run --all-files` | `lefthook run pre-commit --all-files` |
| `SKIP=gitleaks git commit` | `LEFTHOOK_EXCLUDE=gitleaks git commit` ou `LEFTHOOK=0` pour tout couper |
| `rev:` obligatoire | `ref:` optionnel, voir plus bas |

Un hook pre-commit se traduit en quelques lignes. Le gitleaks officiel déclare `gitleaks git --pre-commit --redact --staged --verbose` dans son `.pre-commit-hooks.yaml`, on reprend la même commande.

```yaml title="lefthook.yml"
pre-commit:
  parallel: true
  commands:
    gitleaks:
      run: gitleaks git --pre-commit --redact --staged --verbose
    yamllint:
      glob: "*.{yml,yaml}"
      run: yamllint {staged_files}
```

Le fichier est relu à chaque exécution : seule la première installation demande `lefthook install`, qui pose les scripts dans `.git/hooks`.

```bash
lefthook install
lefthook run pre-commit --all-files
```

On désinstalle pre-commit dans le même commit que l'ajout de `lefthook.yml` (`pre-commit uninstall`, suppression du `.pre-commit-config.yaml`). Laisser les 2 outils branchés sur le même hook git ferait tourner chaque contrôle 2 fois. Si `core.hooksPath` est défini, `lefthook install` s'arrête avec une erreur tant qu'on ne passe pas `--force` ou `--reset-hooks-path`.

## Partager une config avec remotes

Au lieu de recopier les commandes, un repo dédié porte les fichiers de config (`common.yml`, `yaml.yml`...) et chaque projet les référence. Lefthook clone le repo, puis fusionne les fichiers listés dans `configs` avec le `lefthook.yml` local.

```yaml title="lefthook.yml"
remotes:
  - git_url: git@gitlab.example.com:platform/lefthook-configs.git
    ref: v1.4.0
    configs:
      - common.yml
      - yaml.yml
```

Quelques comportements, tous dans la [doc de `remotes`](https://lefthook.dev/configuration/remotes.html) et le code de `internal/command/install.go` :

- le clone vit dans `.git/info/lefthook-remotes/<repo>-<ref>` et un remote qui n'est plus référencé est supprimé de ce dossier
- `git_url` est accessible avec les droits de la machine qui exécute Lefthook, donc un repo privé demande une clé SSH ou un token sur chaque poste et chaque runner
- `configs` vaut `[lefthook.yml]` par défaut avec des chemins relatifs à la racine du remote
- si le fetch échoue, Lefthook ne s'arrête pas : il avertit, puis réutilise un clone existant du même repo (parfois celui d'un autre `ref`, le message le nomme) ou ignore le remote s'il n'y en a aucun

L'ordre de priorité compte autant que le partage. Selon la doc de `extends`, `remotes` écrase `lefthook.yml` et `lefthook-local.yml` écrase tout. Une commande du repo qui porte le même nom qu'une commande du remote est donc remplacée par celle du remote. C'est ce qu'on veut pour imposer un socle. C'est aussi ce qui rend le remote sensible.

Pour que les jobs d'un remote restent lisibles, on les garde indépendants les uns des autres, comme le recommande la doc de `remotes`.

## Épingler un remote sur un tag

`ref` est optionnel. Sans `ref`, Lefthook clone la branche par défaut. Avec `ref: main`, il suit une branche. Dans les 2 cas, le contenu du remote change quand quelqu'un pousse sur cette branche, sans aucun commit dans les repos consommateurs.

La synchronisation suit ces règles, d'après `shouldRefetch` :

- remote jamais cloné : fetch systématique, donc un runner CI sur un checkout neuf prend toujours le dernier état de la branche
- `refetch: true` ou `refetch_frequency: always` : fetch à chaque exécution
- `refetch_frequency: 24h` : fetch quand le dernier est plus vieux que 24h
- rien de configuré : plus de fetch après le premier clone, chaque poste garde la version qu'il avait au premier `lefthook install`

La doc de `refetch_frequency` recommande d'ailleurs un refetch périodique pour les références mutables, y compris les remotes sans `ref`. C'est confortable pour un poste de dev et l'inverse de ce qu'on veut côté supply chain : un commit malveillant (ou une simple régression) poussé sur la branche `main` du repo partagé atteint tous les postes en 24h et toutes les CI au pipeline suivant. Le contenu est du `run:` exécuté en shell sur chaque commit.

Quand la config fait tourner des commandes arbitraires avec les droits du développeur, un remote sur branche mutable donne à quiconque peut pousser sur ce repo un accès d'exécution sur toute la flotte. La parade est la même que pour une image ou une action CI : épingler une version immuable.

```yaml title="lefthook.yml"
remotes:
  - git_url: git@gitlab.example.com:platform/lefthook-configs.git
    ref: v1.4.0
    configs:
      - common.yml
      - yaml.yml
```

Avec un tag, la montée de version devient un commit explicite dans chaque repo, relu en MR. Renovate n'a pas de manager pour les `remotes` Lefthook, l'automatiser demande un `customManager` regex. 3 réserves :

- un tag git se déplace avec `git tag -f` suivi d'un push forcé : on le protège côté forge (tags protégés sur GitLab, rulesets sur GitHub), sinon le pin est cosmétique
- le `ref` est une branche ou un tag, pas un SHA : le premier clone passe par `git clone --depth 1 --branch <ref>` (`internal/git/wrapper/clone.go`) et git répond `Remote branch <sha> not found in upstream origin`. Un tag protégé reste aussi plus lisible dans un diff
- la doc de `ref` précise qu'un `ref` ajouté puis retiré laisse les installations locales sur l'ancien : une fois qu'on pin, on garde le `ref` pour toujours

Le repo partagé mérite le même traitement qu'un repo de CI : branche par défaut protégée, review obligatoire, pas de push direct.

## Même hooks en CI

Un hook local se contourne avec `--no-verify` ou `LEFTHOOK=0`. Seule la CI donne la garantie, à condition qu'elle lance exactement la même config. Comme les hooks git ne sont pas installés sur un runner, on appelle Lefthook explicitement sur tout le dépôt.

```yaml title=".gitlab-ci.yml"
lefthook:
  stage: test
  script:
    - lefthook run pre-commit --all-files
```

Quelques points qui font la différence :

- le runner clone le remote à chaque job, il lui faut donc l'accès au repo partagé (deploy token ou clé de déploiement), sinon Lefthook avertit puis continue sans le remote et le job passe vert sans rien vérifier
- les outils appelés (`gitleaks`, `yamllint`) doivent être dans l'image du job, aux mêmes versions que sur les postes, sinon le local et la CI divergent
- [`min_version`](https://lefthook.dev/configuration/min_version.html) refuse un binaire trop ancien pour les options utilisées
- avec `stage_fixed: true`, un formateur modifie les fichiers au commit sans bruit. En CI, [`fail_on_changes: ci`](https://lefthook.dev/configuration/fail_on_changes.html) fait échouer le job (quand la variable `CI` est définie, ce que fait GitLab CI) si un hook a modifié un fichier suivi. L'auto-fix local reste ainsi confortable et la CI stricte

Le premier point mérite une vérification : retirer volontairement l'accès au remote sur une branche de test et constater que le job échoue. Si le job passe, la CI ne contrôle rien.

## Borner l'allowlist gitleaks

Un hook gitleaks sur un repo d'infra remonte vite des faux positifs : des valeurs de test, des placeholders de templates, des hash. La tentation est d'ajouter une allowlist large dans la config partagée pour que tout le monde arrête de voir le bruit.

Une allowlist globale s'applique à toutes les règles avec une précédence supérieure à celle des allowlists d'une règle. Un `paths` qui contient une regex lâche peut donc masquer une vraie fuite dans n'importe quel fichier qui matche, pour tous les repos qui tirent la config. Depuis gitleaks 8.25.0, `targetRules` limite une allowlist à des règles précises.

```toml title=".gitleaks.toml"
[extend]
useDefault = true

[[allowlists]]
description = "Jinja placeholders in the app template trip the generic rule"
targetRules = ["generic-api-key"]
paths = ['''^apps/\.app_template/''']
```

Les règles pour garder une allowlist honnête :

- une description qui dit pourquoi et une `targetRules` plutôt qu'un scope global
- des regex de chemin ancrées (`^apps/\.app_template/`), jamais un motif nu comme `template` ou `test`
- pour une valeur isolée, `gitleaks:allow` en commentaire sur la ligne ou une entrée `.gitleaksignore` avec l'empreinte du finding : l'exception est visible dans le diff du repo concerné
- `gitleaks` lit `.gitleaks.toml` à la racine de la cible, après `--config` et les variables `GITLEAKS_CONFIG` et `GITLEAKS_CONFIG_TOML`. L'allowlist reste donc dans chaque repo consommateur, relue par ses reviewers, tandis que le remote ne partage que la commande

Le remote de config partagée ne doit pas porter d'exception par repo : un `paths` ajouté là pour un projet masque aussi les autres.

## Checklist de migration

- ajouter `lefthook.yml`, supprimer `.pre-commit-config.yaml` et désinstaller le hook pre-commit dans le même commit
- `remotes` avec un `ref` en tag protégé, jamais de branche
- `lefthook run pre-commit --all-files` en CI, avec accès au remote testé
- un `README` qui liste les outils à installer et rappelle `lefthook install` après un clone
- les allowlists gitleaks dans chaque repo, avec `targetRules` et chemins ancrés

## Voir aussi

- [Configuration Lefthook](https://lefthook.dev/configuration/) et son [`remotes`](https://lefthook.dev/configuration/remotes.html)
- [Configuration gitleaks](https://github.com/gitleaks/gitleaks#configuration)
- [Renovate : configuration](../github/renovate-config.md) pour automatiser la montée du tag
