# Utilisation de la CLI officielle

## Repository

La CLI gitlab peut être utile en de nombreux points. Pour l'instant, voici l'intérêt principale pour moi de cette CLI, le clonage récursif.

```bash
glab repo clone -g tecteam --archived=false --paginate -p
```

Via cette simple ligne, je peux cloner tous les projets non archiver en concernant la structure de dossier de l'ensemble de l'organisation. Pour ma part, étant donné que je navigue entre beaucoup de projets Git, j'aime posséder l'intégralité des repositories sur lesquels je serai potentiellement être amené à travailler 


## Configuration

Des opérations sont particulièrement pénibles en GUI sur Gitlab tel que l'ajout de clé, c'est pourquoi nous pouvons le faire en CLI sans aucun probleme 

```bash
glab ssh-key add ~/.ssh/id_ed25519.pub -t "ED25519 Mac"
```

## Divers

Si tout comme moi vous avez plusieurs Gitlab, vous pouvez définir sur quel Gitlab vous souhaitez effectuer vos actions avec la variable `GL_HOST` (ou `GITLAB_HOST`)


```bash
GL_HOST=gitlab.myorg.com glab repo search -s myproject
```

Ici, nous allons rechercher le projet `myproject` dans le gitlab `gitlab.myorg.com`

---

Comme toute CLI en 2023, Gitlab vient avec sa propre auto completion disponible sous Bash, zsh et Fish

!!! warning "Lenteurs"
    Pour ma part, je n'ai pas activé cette autocompletion, je trouve mon shell (zsh) lent à charger après ajout de cette completion

**Fish**
```bash
glab completion -s fish > ~/.config/fish/completions/glab.fish
```

**Zsh**
```bash
echo "source <(glab completion -s zsh); compdef _glab glab" >> ~/.zshrc
```

**Bash**
```bash
echo "source <(glab completion bash) >> ~/.bashrc"
```

Pour une documentation beaucoup plus exhaustive, je vous invite à aller voir [l'excellent article de blog](https://blog.stephane-robert.info/docs/pipeline-cicd/gitlab/cli/) de Stephane Robert
