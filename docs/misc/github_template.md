---
description: Créer des templates de Pull Request et d'Issue GitHub pour standardiser les contributions
---

# Générer un template pour ses Pull Request et ses Issues

Si vous avez un repository à fort influence, vous avez comme il est
gênant de n'avoir qu'une partie des informations lors d'un issue, ou
alors un Pull Request qui ne détaille pas ses modifications.

Heureusement, GitHub a pensé à nous, et il est possible de créer des
templates afin d'avoir une structure.

Voici un exemple de Pull Request et d'Issue pour le repo [aframe](https://github.com/aframevr/aframe/issues/new) :

![Template PR Github](./_img/template_pr_github.webp)

Pour se faire, c'est très simple

## Créer ses templates

À la racine de votre projet, il vous faut créer un dossier .github

Dans celui-ci, il faudra faire 2 fichiers :

* `ISSUE_TEMPLATE.md` : Pour vos issues
* `PULL_REQUEST_TEMPLATE.md` : Pour vos pull request

Et voici des exemples de templates :

```markdown
**Description:**

- A-Frame Version:
- Platform / Device:
- Reproducible Code Snippet or URL:

<!-- If you have a support question, please ask at https://stackoverflow.com/questions/ask/?tags=aframe rather than filing an issue. -->
```

```markdown
**Description:**

**Changes proposed:**
-
-
-
```
