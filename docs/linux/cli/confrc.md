---
description: Configuration de l'environnement de travail - zsh, aliases, fonctions, git, SSH, tmux et WezTerm via le dépôt dotfiles.
tags:
  - Dotfiles
  - Zsh
  - Git
  - Productivity
---

# Dotfiles

L'ensemble de mes fichiers de configuration est disponible sur
[GitHub](https://github.com/PixiBixi/dotfiles). Ce dépôt centralise la
configuration de mon environnement de travail : shell, éditeur, outils
de développement et amorçage d'un nouveau poste.

## Bootstrap

Le fichier `Brewfile` permet de restaurer un environnement complet en une
commande sur macOS :

```bash
brew bundle --file=packages/Brewfile
```

Il installe l'intégralité de la toolchain : outils CLI (ripgrep, bat, fzf, lsd, fd...), Kubernetes (kubectl, helm, krew, switch...), cloud providers (AWS CLI, gcloud, az...), IaC (Terraform, Vault) et applications GUI (TablePlus, Ghostty, WezTerm...).

Le script `scripts/init_mac.sh` orchestre l'installation complète de manière
idempotente.

---

## Zsh

### Plugins oh-my-zsh

La configuration s'appuie sur [oh-my-zsh](https://ohmyz.sh/) avec les
plugins suivants :

| Plugin | Rôle |
|--------|------|
| `zsh-defer` | Chargement différé pour accélérer le démarrage (plugin tiers [romkatv/zsh-defer](https://github.com/romkatv/zsh-defer), à cloner dans `~/.oh-my-zsh/custom/plugins/`) |
| `ssh-agent` | Gestion automatique des clés SSH |
| `terraform` | Autocompletion Terraform |
| `kubectl` | Autocompletion kubectl |
| `kube-ps1` | Contexte Kubernetes dans le prompt |
| `helm` | Autocompletion Helm |
| `aws` | Autocompletion AWS CLI |

### Chargement différé (performance)

Les fichiers d'aliases, de fonctions et fzf sont chargés via `zsh-defer` pour ne pas pénaliser le démarrage du shell :

```zsh
zsh-defer -c '[ -f ~/.zsh_functions ] && source ~/.zsh_functions'
zsh-defer -c '[[ -f ~/.zsh_alias ]] && source ~/.zsh_alias'
zsh-defer -c '[[ $(uname) == "Darwin" ]] && source ~/.zsh_mac'
zsh-defer -c '[[ $(uname) == "Linux" ]] && source ~/.zsh_linux'
zsh-defer -c '[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh'
```

Les completions de `gcloud`, `kafkactl` et `delta` vont plus loin : une fonction wrapper les charge au premier appel de la commande, puis s'efface :

```zsh
kafkactl() {
    unfunction kafkactl
    eval "$(command kafkactl completion zsh)"
    kafkactl "$@"
}
```

### Historique

```zsh
HISTSIZE=1000000000
SAVEHIST=1000000000
```

Un milliard d'entrées - l'historique ne se perd plus jamais.

### Prompt

Le prompt droit affiche le contexte Kubernetes courant via `kube_ps1` :

```zsh
RPROMPT='$(kube_ps1)'
```

### Détection de plateforme

Les fichiers `~/.zsh_mac` et `~/.zsh_linux` permettent d'avoir des
configurations spécifiques par OS, chargés dynamiquement selon la
plateforme détectée.

---

## Aliases

### Raccourcis de commandes

```zsh
alias k='kubectl'
alias tf='terraform'
alias g='git'
alias f='fd'
alias s='ssh'
```

### Remplacement par des outils modernes

```zsh
alias vim='nvim'
alias cat='bat --style=plain'
alias df='dfc'
alias dig='doggo'
alias rm='rip'
alias ls='lsd'
```

Voir [Remplacer les commandes de base](replace_base_commands.md) pour
le détail de chaque outil.

### Kubernetes

Le changement de contexte et de namespace passe par [switch](https://github.com/danielfoehrkn/kubeswitch) :

```zsh
alias kctx="switch"             # switch de contexte
alias kubectx="switch"
alias kubens="switch ns"        # switch de namespace
```

Avec `kubecolor` pour coloriser la sortie de `kubectl` :

```zsh
alias kubectl=kubecolor
```

### Git sur plusieurs dépôts

Les 2 aliases cherchent les vrais dépôts (dossiers `.git`) sous le répertoire courant, à n'importe quelle profondeur :

```zsh
# git pull en parallèle (30 à la fois) sur tous les dépôts trouvés
alias pullparallel="fd -Hu -t d '^\\.git$' -x dirname {} | xargs -P30 -I % git -C % pull"

# même chose, un dépôt après l'autre
alias pullrecursive="find . -type d -name .git -exec sh -c \"cd \"{}\"/../ && pwd && git pull\" \;"
```

---

## Fonctions personnalisées

### `extract` - décompression universelle

Identifie l'extension et applique la commande adaptée :

```zsh
extract archive.tar.gz   # tar xzf
extract archive.zip      # unzip
extract archive.7z       # 7z x
extract archive.rar      # unrar x
# ... gzip, bzip2, xz, lzma, uncompress
```

### `kevents` - événements Kubernetes formatés

Affiche les événements d'un cluster en tableau trié et paginé :

```zsh
kevents
# → namespace | type | reason | object | message
```

Utilise `kubectl get events -o json | jq` + `column` + `less`.

### `mergebranch` - merge GitLab via CLI

Approuve et merge la branche courante en une commande via `glab` :

```zsh
mergebranch
# → glab mr approve + glab mr merge --rebase --remove-source-branch
```

---

## Git

### Pager : delta

Toutes les diffs passent par [delta](https://github.com/dandavison/delta)
pour une lecture colorisée et lisible :

```ini
[core]
    pager = delta

[interactive]
    diffFilter = delta --color-only
```

### Aliases essentiels

| Alias | Commande |
|-------|----------|
| `g c` | `commit` |
| `g cm` | `commit -S -m` (commit signé) |
| `g cma` | `commit --amend` |
| `g d` | `diff` |
| `g dc` | `diff --cached` |
| `g st` | `status --short` |
| `g co` | `checkout` |
| `g nah` | Hard reset + clean (abandon tout) |
| `g psf` | `push --force-with-lease` (force safe) |
| `g psmr` | Push + création MR GitLab via `glab` |
| `g smu` | Update submodules en parallèle |

### Inclusions conditionnelles (work/perso)

```ini
[includeIf "gitdir:~/Documents/perso/git/"]
    path = ~/.gitconfig_perso

[includeIf "gitdir:~/Documents/work/git/"]
    path = ~/.gitconfig_work
```

L'identité (nom, email) change automatiquement selon le répertoire du projet.

### Signature SSH des commits

```ini
[gpg]
    format = ssh

[commit]
    gpgsign = true

[gpg "ssh"]
    allowedSignersFile = ~/.config/git/allowed_signers
```

La signature se fait via une clé SSH plutôt que GPG - plus simple à gérer.

### Autres réglages notables

```ini
[pull]
    rebase = true          # rebase par défaut sur pull

[merge]
    conflictstyle = zdiff3 # diff3 amélioré pour les conflits

[rebase]
    autostash = true       # stash auto avant rebase

[branch]
    sort = -committerdate  # branches triées par date de commit
```

---

## SSH

Multiplexage de connexions activé globalement :

```ini
Host *
    User jdelgado
    ControlMaster auto
    ControlPath ~/.ssh/private/master-%C.socket
    ControlPersist 10m
```

Le répertoire du socket doit exister avant la première connexion. Sans lui, ssh ne peut pas créer le socket (`unix_listener: cannot bind to path`) et la connexion échoue :

```bash
mkdir -m 700 -p ~/.ssh/private
```

Une seule connexion TCP est établie par combinaison hôte, port et utilisateur (`%C` en est le hash), réutilisée pendant 10 minutes.
Gain significatif sur les workflows avec beaucoup de connexions répétées
(déploiements, tunnels, Ansible...).

---

## Tmux

Configuration minimale avec réorganisation automatique des panes :

```bash
set-hook -g after-kill-pane 'select-layout tiled'
set-hook -g pane-exited 'select-layout tiled'
```

Quand un pane est fermé, la disposition `tiled` est appliquée automatiquement.
Plus besoin de réorganiser manuellement après avoir tué un processus.

---

## Terminal : WezTerm

[WezTerm](https://wezfurlong.org/wezterm/) est le terminal utilisé,
configuré via `.wezterm.lua`. Il remplace iTerm2 avec le bénéfice d'une
configuration as-code en Lua, versionnable dans le dépôt.

---

## Voir aussi

- [tmux](tmux.md) - configuration de session persistante
- [Remplacer les commandes de base](replace_base_commands.md) - alternatives modernes à df, rm, ls, cat, etc.
