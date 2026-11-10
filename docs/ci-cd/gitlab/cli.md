---
description: Utiliser la CLI officielle GitLab - cloner des dépôts, créer des MR, gérer les clés SSH et configurer plusieurs instances
tags:
  - GitLab
  - CLI
---

# Utilisation de la CLI officielle

## Repository

La CLI gitlab peut être utile en de nombreux points. Pour l'instant, voici l'intérêt principal pour moi de cette CLI, le clonage récursif.

```bash
glab repo clone -g tecteam --archived=false --paginate -p
```

Via cette simple ligne, je peux cloner tous les projets non archivés en conservant la structure de dossier de l'ensemble de l'organisation. Pour ma part, étant donné que je navigue entre beaucoup de projets Git, j'aime posséder l'intégralité des repositories sur lesquels je suis potentiellement amené à travailler.

Pour sauter un sous-groupe trop gros ou sans intérêt, on ajoute `--exclude-subgroup <chemin/relatif>` (répétable).

## Merge Request

Pour créer une MR depuis la branche courante, titre et description repris des commits :

```bash
glab mr create --fill --yes
```

Une petite commande magique pour créer une MR sans rien faire, juste magique. Attention, `--fill` pousse aussi la branche sur le remote, on ajoute `--push=false` si on l'a déjà poussée ou si on ne veut pas pousser.

## Configuration

Des opérations sont particulièrement pénibles en GUI sur GitLab tel que l'ajout de clé, c'est pourquoi nous pouvons le faire en CLI sans aucun probleme

```bash
glab ssh-key add ~/.ssh/id_ed25519.pub -t "ED25519 Mac"
```

## Divers

Si tout comme moi vous avez plusieurs GitLab, vous pouvez définir sur quel GitLab vous souhaitez effectuer vos actions avec la variable `GL_HOST` (ou `GITLAB_HOST`)

```bash
GL_HOST=gitlab.myorg.com glab repo search -s myproject
```

Ici, nous allons rechercher le projet `myproject` dans le gitlab `gitlab.myorg.com`

---

Comme toute CLI moderne, glab vient avec sa propre auto completion disponible sous Bash, zsh, Fish et PowerShell

!!! warning "Lenteurs"
    Pour ma part, je n'ai pas activé cette autocompletion, je trouve mon shell (zsh) lent à charger après ajout de cette completion

=== "Fish"
    ```fish
    glab completion -s fish > ~/.config/fish/completions/glab.fish
    ```

=== "Zsh"
    ```bash
    echo "source <(glab completion -s zsh); compdef _glab glab" >> ~/.zshrc
    ```

=== "Bash"
    ```bash
    echo 'source <(glab completion -s bash)' >> ~/.bashrc
    ```

Pour une documentation beaucoup plus exhaustive, je vous invite à aller voir [l'excellent article de blog](https://blog.stephane-robert.info/docs/pipeline-cicd/gitlab/cli/) de Stephane Robert
