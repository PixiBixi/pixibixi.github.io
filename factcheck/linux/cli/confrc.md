---
article: docs/linux/cli/confrc.md
checked: '2026-11-10'
commit: b47e73ec7cc512449b1851d45ddea51a68b20eb9
sources: []
unpinned: 9
---

# docs/linux/cli/confrc.md

Source de référence : dépôt local ~/Documents/perso/git/dotfiles @ 698d2ae (2026-11-08), working tree propre sur config/ et packages/.

## Findings

- L111 ERROR corrigé : `alias dig='dog'` devient `alias dig='doggo'`. Preuve : dotfiles config/.zsh_alias:5 `alias dig='doggo'`, packages/Brewfile:94 `brew "doggo"`
- L29 IMPRECISE corrigé : liste du Brewfile alignée (switch au lieu de kubeswitch, IaC Terraform + Vault, GUI TablePlus, Ghostty, WezTerm). Preuve : packages/Brewfile:252 switch, :259 vault, :283 ghostty, :299 tableplus, :309 wezterm@nightly ; aucune entrée arc, dbeaver, consul
- L45 IMPRECISE corrigé : zsh-defer présenté comme plugin tiers romkatv/zsh-defer à cloner dans ~/.oh-my-zsh/custom/plugins/. Preuve : scripts/init_mac.sh:269 `"zsh-defer|https://github.com/romkatv/zsh-defer"`, présent dans ~/.oh-my-zsh/custom/plugins, absent de ~/.oh-my-zsh/plugins
- L62 IMPRECISE corrigé : bloc remplacé par les vraies lignes `zsh-defer -c '...'` (functions, alias, mac/linux, ~/.fzf.zsh) et ajout de l'exemple de wrapper lazy-load pour gcloud/kafkactl/delta. Preuve : config/.zshrc:154-184
- L129 IMPRECISE corrigé : aliases kctx/kubectx="switch", kubens="switch ns", lien vers danielfoehrkn/kubeswitch. Preuve : config/.zsh_alias:13-15
- L144 IMPRECISE corrigé : pullparallel et pullrecursive recopiés du dépôt, phrase d'intro réécrite. Preuve : config/.zsh_alias:24-25
- L210 IMPRECISE corrigé : `status -sb` devient `status --short`. Preuve : config/.gitconfig:59
- L222 IMPRECISE corrigé : includeIf sur ~/Documents/perso/git/ et ~/Documents/work/git/. Preuve : config/.gitconfig:75-79
- L269 IMPRECISE corrigé : ajout du `mkdir -m 700 -p ~/.ssh/private` et précision que %C est le hash hôte/port/utilisateur. Le finding disait "échoue silencieusement", c'est faux : la connexion échoue tout court. Preuve : `ssh -o ControlMaster=auto -o ControlPath=/nonexistent_dir_x/master-%C.socket perso-ovh...` -> `unix_listener: cannot bind to path ... No such file or directory`, exit 255 ; man ssh_config (OpenSSH 10.6p1) `%C Hash of %l%h%p%r%j`

## En plus

- `allowedSignersFile = ~/.ssh/allowed_signers` devient `~/.config/git/allowed_signers`. Preuve : config/.gitconfig:87
- `extract archive.rar # rar x` devient `unrar x`. Preuve : config/.zsh_functions:6
- `alias kubectl='kubecolor'` aligné sur la forme du dépôt (`alias kubectl=kubecolor`, config/.zsh_alias:36), cosmétique
- Chemin du script : `init_mac.sh` devient `scripts/init_mac.sh` (dépôt : scripts/init_mac.sh)
- Structure : la section "Voir aussi" était au milieu des aliases (les sous-sections Kubernetes et Git sur plusieurs dépôts tombaient sous "Voir aussi"). Déplacée en fin d'article, le `---` parasite retiré

## Modernisation

- Appliqué : `brew bundle --file=packages/Brewfile` (install est la sous-commande par défaut ; chemin réel du Brewfile, packages/Brewfile)
- Appliqué : pullparallel version dépôt (cible les dossiers .git)

## Tests

- OpenSSH_10.6p1 local (test ControlPath sur répertoire absent)
- markdownlint-cli2 0.23.0, check_code_blocks.py : OK

## À signaler

- La description et le titre citent WezTerm comme terminal ; le README dotfiles mentionne aussi une config Ghostty portée. Non modifié.
