---
description: Optimiser sa CI GitLab — buildah, fastzip, GIT_DEPTH, interruptible, cache policy, feature flags et DAG pour des pipelines plus rapides
tags:
  - GitLab CI
  - CI/CD
---

# Optimiser sa CI Gitlab

Les CI c'est bien, une CI optimisée c'est mieux. Voici quelques tips pour l'optimiser. Il y a également des optimisations spécifiques aux différents langages.

## Clone superficiel

Sur un gros repo, le `git clone` peut représenter 30-50% du temps d'un job. `GIT_DEPTH: 1` ne récupère que le dernier commit — suffisant dans 95% des cas.

```yaml
variables:
  GIT_DEPTH: 1
```

Si un job a besoin de l'historique (génération de changelog, `git describe`...), on surcharge localement :

```yaml
release-job:
  variables:
    GIT_DEPTH: 0  # historique complet pour ce job uniquement
```

## Annuler les pipelines obsolètes

Quand on push plusieurs commits rapprochés, les vieux pipelines continuent de tourner pour rien. `interruptible: true` les annule dès qu'un nouveau pipeline démarre sur la même branche.

```yaml
default:
  interruptible: true
```

On peut aussi le définir job par job. Les jobs de deploy restent souvent non-interruptibles pour éviter un rollback partiel.

## Skip Docker

Pour gagner du temps, on peut ne pas utiliser Docker afin de ne pas attendre que le daemon Docker soit prêt. On peut à la place utiliser buildah. La syntaxe est identique à celle de Docker :

```yaml
Docker Build:
  before_script:
    # to skip default before_script
    - buildah info
    - buildah login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  stage: package
  image: quay.io/buildah/stable:latest
  script:
    - buildah build
      -t ${CI_REGISTRY_IMAGE}/gprg:prod
      -t ${CI_REGISTRY_IMAGE}/gprg:latest .
    - buildah push ${CI_REGISTRY_IMAGE}/gprg
```

## Optimisation niveau runner

Le runner GitLab expose des feature flags via des variables CI. À partir de la version 13.6, Fastzip compresse/décompresse bien plus vite les artefacts et le cache.

```yaml
variables:
  FF_USE_FASTZIP: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fast"
  CACHE_COMPRESSION_LEVEL: "fast"
```

2 autres feature flags utiles :

- **`FF_TIMESTAMPS: "true"`** — ajoute des timestamps dans les logs, pratique pour identifier où un job rame
- **`FF_ENABLE_BASH_EXIT_CODE_CHECK: "true"`** — force la détection d'erreur dans les pipes bash (`cmd1 | cmd2` masque sinon l'exit code de `cmd1`)

```yaml
variables:
  FF_USE_FASTZIP: "true"
  FF_TIMESTAMPS: "true"
  FF_ENABLE_BASH_EXIT_CODE_CHECK: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fast"
  CACHE_COMPRESSION_LEVEL: "fast"
```

## Divers

```yaml
build-job:
  stage: build
  script:
    - echo Hello World > hello-world.txt
  artifacts:
    expire_in: 1 hour
    paths:
      - hello-world.txt

test-job:
  stage: test
  variables:
    GIT_STRATEGY: none
  script:
    - cat hello-world.txt
```

Cet exemple basique met plusieurs éléments en avant :

- `GIT_STRATEGY` : on ne clone pas le repository Git. Pas besoin de le cloner si on n'en a pas besoin.

On utilise un artifact, expirant dans 1h, pour stocker le résultat d'une commande.

## Optimisations par langages

On peut également faire des optimisations de CI en fonction des langages (généralement en jouant sur les caches).

### PHP

Dans le cadre de l'utilisation de composer, il peut être intéressant de mettre en cache le résultat d'un composer install. Il faut l'indiquer de cette manière dans le YAML :

```yaml
# Cache libraries in between jobs
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - vendor/
```

### Python

De la même manière qu'avec PHP & composer, on peut mettre en cache le `.pip` d'un projet Python mais également le dossier venv :

```yaml
# Change pips cache directory to be inside the project directory since we can
# only cache local items.
variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"

# Pips cache doesnt store the python packages
# https://pip.pypa.io/en/stable/reference/pip_install/#caching
#
# If you want to also cache the installed packages, you have to install
# them in a virtualenv and cache it as well.
cache:
  paths:
    - .cache/pip
    - venv/
```

D'autres caches sont possibles pour d'autres langages (Go, Ruby...), voir la [documentation officielle](https://docs.gitlab.com/ee/ci/caching/index.html#cache-nodejs-dependencies).

## Cache policy

Par défaut, chaque job fait un pull + push du cache. Les jobs de test ou de lint n'ont pas besoin de repusher — ils consomment juste le cache généré par le build.

```yaml
build-job:
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - vendor/
    policy: pull-push  # default, génère le cache

test-job:
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths:
      - vendor/
    policy: pull  # consomme uniquement, pas de re-upload
```

Sur un pipeline avec 5 jobs de test en parallèle, on économise 4 uploads inutiles.

## Héritage des variables

Tous les jobs héritent par défaut de toutes les variables globales. Sur un pipeline avec beaucoup de secrets ou de variables d'env, ça pollue et ça ralentit. On peut couper l'héritage et être explicite :

```yaml
test-job:
  inherit:
    variables: false  # n'hérite d'aucune variable globale
  variables:
    NODE_ENV: test  # uniquement ce dont on a besoin
```

## DAG — parallélisme réel

Les stages s'exécutent en séquence même si les jobs sont indépendants. Avec `needs:`, on court-circuite les stages et on lance un job dès que ses dépendances sont terminées.

```yaml
lint:
  stage: test
  script: eslint .

unit-tests:
  stage: test
  script: jest

build:
  stage: build
  needs: [lint, unit-tests]  # démarre sans attendre les autres jobs du stage test
  script: docker build .

deploy:
  stage: deploy
  needs: [build]
  script: kubectl apply -f k8s/
```

`needs: []` (liste vide) = le job démarre immédiatement, sans attendre aucun autre job.
