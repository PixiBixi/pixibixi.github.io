---
description: Intégrer Trivy dans la CI GitLab pour scanner les vulnérabilités des images Docker
---

# Intégrer un scan d'image à sa CI

Avoir une CI qui créé une image, c'est bien. Si l'on peut y ajouter des tests de sécurité, c'est mieux :)

[Trivy](https://github.com/aquasecurity/trivy) est un scanner de vulnérabilité rapide & simple à utiliser. Il peut nous aider à scanner un repository Git, un filesystem, ou bien comme dans notre cas, une image.

## .gitlab-ci.yml

Voilà le bout de code à ajouter à sa CI pour intégrer un scan à sa CI, générant un rapport détaillé

```yaml
Trivy_container_scanning:
  stage: test
  image:
    name: alpine:3.11
  variables:
    # Override the GIT_STRATEGY variable in your `.gitlab-ci.yml` file and set it to `fetch` if you want to provide a `clair-whitelist.yml`
    # file. See https://docs.gitlab.com/ee/user/application_security/container_scanning/index.html#overriding-the-container-scanning-template
    # for details
    GIT_STRATEGY: none
    IMAGE: "$CI_REGISTRY_IMAGE"
  allow_failure: true
  before_script:
    - export TRIVY_VERSION=$(wget -qO - "https://api.github.com/repos/aquasecurity/trivy/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    - apk add --no-cache curl docker-cli
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY
    - curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin ${TRIVY_VERSION}
    - curl -sSL -o /tmp/trivy-gitlab.tpl https://github.com/aquasecurity/trivy/raw/${TRIVY_VERSION}/contrib/gitlab.tpl
  script:
    # --cache-dir global arg, then before image
    - trivy --cache-dir .trivycache/ image --exit-code 0  --no-progress --format template --template "@/tmp/trivy-gitlab.tpl" -o gl-container-scanning-report.json $IMAGE
  cache:
    paths:
      - .trivycache/
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json
  dependencies: []
```

Il s'agit ici de la configuration que j'ai souhaité, je vous invite bien évidemment à l'adapter (Nom de l'image, génération de rapport en utilisant un artefact...).

A noter que la [documentation de Trivy](https://aquasecurity.github.io/trivy/v0.28.1/docs/integrations/gitlab-ci/) intègre un exemple pour Gitlab-CI, mais également d'autres pour Travis, Circle...
