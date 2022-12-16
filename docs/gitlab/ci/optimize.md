# Optimiser sa CI Gitlab

Les CI c'est bien, une CI optimisée c'est mieux. Voici quelques tips
pour l'optimiser. Il y a également des optimisations spécifiques aux
différents langages.

## Skip Docker

Pour gagner du temps, il est possible de ne pas utiliser Docker afin de
ne pas attendre que le daemon Docker soit prêt. Nous pouvons à la place
utiliser buildah. La syntaxe est identique à celle de Docker :

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

Le runner Gitlab est hautement configurable. Nous pouvons le
personnaliser pour augmenter la vitesse de mise en cache ou autre. A
partir de la version 13.6, nous avons la feature Fastzip qui nous permet
de compresser/décompresser bien plus rapidement les potentiels artefacts
ou fichiers de cache

```yaml
variables:
  FF_USE_FASTZIP: "true"
  # These can be specified per job or per pipeline
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

Cet exemple basique nous permet de mettre plusieurs éléments en avant :

-   **GIT_STRATEGY** : Ici, nous ne clonons par le repository Git. Nul
    nécessaire de le cloner si nous n'en avons pas besoin

Nous allons utiliser un artifact, expirant dans 1h pour stocker le
résultat d'une commande

## Optimisations par langages

Nous pouvons également faire des optimisations des CI en fonction des
langages (généralement en jouant sur les caches)

### PHP

Dans le cadre de l'utilisation de composer, il peut être intéressant de
mettre en cache le résultat d'un composer install. Il faut l'indiquer
de cette manière dans votre YAML

```yaml
# Cache libraries in between jobs
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - vendor/
```

### Python

De la même manière qu'avec PHP & composer, nous pouvons mettre en cache
le .pip d'un projet en Python mais également le dossier venv :

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

D'autres caches sont possibles pour d'autres langages (Go, Ruby...),
je vous laisse consulter la [documentation
officielle](https://docs.gitlab.com/ee/ci/caching/index.html#cache-nodejs-dependencies)
