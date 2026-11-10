---
description: Intégrer Trivy dans la CI GitLab pour scanner les vulnérabilités des images Docker
tags:
  - GitLab CI
  - Security
tested_with:
  - "Trivy 0.76.2"
---

# Intégrer un scan d'image à sa CI

Avoir une CI qui crée une image, c'est bien. Si l'on peut y ajouter des tests de sécurité, c'est mieux :)

[Trivy](https://github.com/aquasecurity/trivy) est un scanner de vulnérabilité rapide & simple à utiliser. Il peut nous aider à scanner un repository Git, un filesystem, ou bien comme dans notre cas, une image.

## .gitlab-ci.yml

Depuis GitLab 15.0, le scan de containers intégré à GitLab utilise déjà Trivy : si le template officiel suffit, une ligne fait le travail.

```yaml
include:
  - template: Security/Container-Scanning.gitlab-ci.yml
```

Pour garder la main sur le job, voilà le bout de code à ajouter à sa CI, générant un rapport détaillé. On part de l'image officielle `aquasec/trivy`, qui embarque déjà le template GitLab sous `/contrib/gitlab.tpl` : plus rien à installer à chaque run.

```yaml
Trivy_container_scanning:
  stage: test
  image:
    name: aquasec/trivy:0.76.2
    entrypoint: [""]
  variables:
    GIT_STRATEGY: none
    IMAGE: "$CI_REGISTRY_IMAGE"
    # Trivy lit ces variables pour s'authentifier sur la registry, pas besoin de docker login
    TRIVY_USERNAME: "$CI_REGISTRY_USER"
    TRIVY_PASSWORD: "$CI_REGISTRY_PASSWORD"
    TRIVY_CACHE_DIR: ".trivycache/"
    TRIVY_NO_PROGRESS: "true"
  allow_failure: true
  script:
    - trivy image --exit-code 0 --format template --template "@/contrib/gitlab.tpl" -o gl-container-scanning-report.json "$IMAGE"
  cache:
    paths:
      - .trivycache/
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json
  dependencies: []
```

Il s'agit ici de la configuration que j'ai souhaité, je vous invite bien évidemment à l'adapter (Nom de l'image, génération de rapport en utilisant un artefact...). Avec `allow_failure: true` et `--exit-code 0`, un job cassé ne se voit pas dans la pipeline : on vérifie de temps en temps que le rapport sort bien.

A noter que la [documentation de Trivy](https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/) intègre un exemple pour GitLab-CI, mais également d'autres pour Travis, Circle...
