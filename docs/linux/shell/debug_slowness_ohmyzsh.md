---
description: Mesurer le démarrage de Zsh avec oh-my-zsh (zprof, xtrace horodaté), supprimer les forks évitables et les reconstructions du compdump
tags:
  - Zsh
  - oh-my-zsh
---

# Lenteurs oh-my-zsh : mesure, forks et compdump

Un shell qui s'ouvre lentement vient rarement d'un seul plugin. Le temps se perd surtout dans 2 endroits que le profiler natif de Zsh voit mal : les process externes lancés au démarrage et la reconstruction du dump de complétion.

## Mesurer le temps d'ouverture

```bash
time (for i in {1..10}; do zsh -i -c exit; done)
```

Le total divisé par 10 donne le temps moyen d'ouverture. 2 indices se lisent directement dans la sortie :

- un premier lancement bien plus lent que les suivants signale une reconstruction du compdump (voir plus bas)
- un pourcentage de CPU très bas (`6% cpu`) veut dire que le shell attend plus qu'il ne calcule, ce sont les process lancés au démarrage qui coûtent

## Profiler les fonctions avec zprof

Inutile de modifier son `.zshrc` : un `ZDOTDIR` temporaire charge `zprof` autour de la config existante.

```bash
ZD=$(mktemp -d)
printf 'zmodload zsh/zprof\nsource ~/.zshenv\n' > "$ZD/.zshenv"
printf 'source ~/.zshrc\nzprof\n' > "$ZD/.zshrc"
ZDOTDIR=$ZD zsh -i -c exit | head -15
```

oh-my-zsh place son dump dans `$ZDOTDIR`, donc le premier lancement le reconstruit : on lit le profil du 2e lancement.

```text
num  calls                time                       self            name
-----------------------------------------------------------------------------------
 1)    2          44.26    22.13   37.83%     44.26    22.13   37.83%  compaudit
 2)   28          54.63     1.95   46.69%     29.42     1.05   25.15%  _omz_source
 3)    1          13.29    13.29   11.36%     13.17    13.17   11.25%  _kube_ps1_init
 4)    1           9.83     9.83    8.40%      9.83     9.83    8.40%  zrecompile
 5)    1          51.90    51.90   44.36%      7.64     7.64    6.53%  compinit
```

La colonne `self` compte le temps passé dans la fonction elle-même, hors appels. Plus bas dans la sortie, chaque ligne est détaillée avec ses appels :

```text
 1)    1         642.37   642.37   85.74%    369.76   369.76   49.36%  compinit
       1/2        28.07    28.07    3.75%      0.17     0.17             compaudit [5]
       1/1       107.30   107.30   14.32%    107.30   107.30             compdump [3]
     800/816     137.23     0.17   18.32%    137.23     0.17             compdef [2]
```

`compdump` dans le profil veut dire que le dump a été reconstruit à cette ouverture. Sur un shell chaud, il ne doit pas apparaître.

La limite de `zprof` : il ne voit que les fonctions zsh. Un `eval "$(brew shellenv)"` en haut du `.zshrc` ou un `$(id -un)` dans le `.zshenv` n'apparaissent nulle part. Dans le profil ci-dessus, les fonctions totalisent environ 110ms pour un shell qui en met 330.

## Trouver les commandes lentes avec xtrace

Le mode `-x` trace chaque ligne exécutée. Avec un `PS4` horodaté à la microseconde, l'écart entre 2 lignes donne le coût de la première, process externes compris.

```bash
PS4='+%D{%s.%6.} %N:%i> ' zsh -i -x -c exit 2> /tmp/zsh-trace.log > /dev/null
awk '/^\+[0-9]+\.[0-9]+ /{t=substr($1,2)+0; if(p) printf "%.1f\t%s\n",(t-p)*1000,substr(prev,1,150); p=t; prev=$0}' \
  /tmp/zsh-trace.log | sort -rn | head -15
```

```text
20.4    +1792103660.383005 test-ls-args:3> ls -G /dev/null
19.3    +1792103660.463469 _kube_ps1_init:7> tput setaf 1
17.5    +1792103660.214463 /Users/jeremy/.oh-my-zsh/oh-my-zsh.sh:119> grep -q -Fx '#omz fpath: ...
12.1    +1792103660.084020 /Users/jeremy/.zshenv:6> id -un
```

Sur le Mac mesuré, chaque process externe coûte entre 10 et 25ms. Le levier n'est donc pas le contenu des plugins mais le nombre de process lancés. Le nombre de lignes de la trace est aussi un indicateur : 2 700 lignes pour une ouverture normale, 71 000 quand le compdump est reconstruit.

## Supprimer les forks évitables

Chaque commande se chronomètre à part pour savoir ce qu'elle coûte :

```bash
zmodload zsh/datetime
s=$EPOCHREALTIME; /opt/homebrew/bin/brew shellenv > /dev/null; echo $(( (EPOCHREALTIME-s)*1000 ))
```

| Avant | Après | Gain mesuré |
|---|---|---|
| `eval "$(brew shellenv)"` | les exports de `brew shellenv` copiés en dur | 90ms |
| `eval "$(kafkactl completion zsh)"` | fonction chargée au premier appel | 1,2s |
| `eval "$(delta --generate-completion=zsh)"` | fonction chargée au premier appel | 110ms |
| `source <(tickler completion zsh)` | `zsh-defer -c 'source <(tickler completion zsh)'` | 30ms sortis du chemin bloquant |
| `export USER="$(id -un)"` | `export USER="$USERNAME"` | 12ms, aussi sur chaque `zsh -c` |

`$USERNAME` est rempli par zsh depuis la base passwd (`getpwuid`), pas depuis l'environnement : il donne la même valeur que `id -un` même quand le `USER` hérité est faux.

Le chargement au premier appel remplace la commande par une fonction qui s'efface, charge la complétion puis relance la vraie commande :

```zsh
kafkactl() {
    unfunction kafkactl
    eval "$(command kafkactl completion zsh)"
    kafkactl "$@"
}
```

!!! warning "DISABLE_COMPFIX ne fait rien"
    oh-my-zsh lit `ZSH_DISABLE_COMPFIX`, la variable sans préfixe est ignorée. Avec la bonne variable, `compinit -u` remplace `compinit -i` et `compfix.zsh` n'est plus chargé, mais le gain reste marginal : `compinit` lance toujours ses 2 `compaudit`. Le vrai effet est de ne plus avertir des dossiers du `fpath` inscriptibles par un autre utilisateur, donc à réserver à une machine où ce n'est pas le cas.

## Éviter les reconstructions du compdump

oh-my-zsh ajoute 2 lignes à la fin du dump, `#omz revision:` (le commit d'oh-my-zsh) et `#omz fpath:` (le `$fpath` complet). À chaque ouverture il les cherche avec `grep` : si l'une ne correspond plus, il supprime le dump, que `compinit` reconstruit ensuite en un peu moins d'une seconde.

Après une mise à jour d'oh-my-zsh, c'est attendu. Le cas sournois, c'est quand 2 types de shells construisent un `fpath` différent : chacun invalide le dump écrit par l'autre et la reconstruction revient sans cesse. 2 causes rencontrées :

- **login ou pas** : un hook dans `.zprofile`, par exemple OrbStack qui ajoute ses complétions au `fpath`, n'est lu que par les shells de login. Un onglet de terminal et un `zsh -i` lancé depuis un script n'ont donc pas le même `fpath`.
- **FPATH exporté** : `brew shellenv` fait `export FPATH`. Tout process lancé depuis le shell (éditeur, agent, sous-shell) hérite d'un `fpath` déjà rempli par oh-my-zsh, qui y rajoute ses dossiers dans un autre ordre.

Pour le confirmer, on compare le `fpath` des 2 contextes, puis on vérifie que l'heure du dump ne bouge pas quand on les alterne :

```bash
diff <(zsh -l -i -c 'print -l $fpath') <(zsh -i -c 'print -l $fpath')
zsh -l -i -c exit; ls -l ~/.zcompdump-*-5.9
zsh -i -c exit;    ls -l ~/.zcompdump-*-5.9
```

La correction tient en 3 lignes en haut du `.zshrc`, avant Homebrew et oh-my-zsh : dédoublonner, retirer ce qui a été hérité, puis ajouter inconditionnellement ce que le `.zprofile` n'ajoute qu'en login.

```zsh title="~/.zshrc"
typeset -U path fpath
fpath=(${fpath:#(/opt/homebrew/share/zsh/site-functions|$HOME/.oh-my-zsh/*)})
fpath+=$HOME/.orbstack/shell/completions/zsh
```

## Se passer de oh-my-zsh.sh

Même avec un dump stable, `oh-my-zsh.sh` lance à chaque ouverture `git rev-parse`, 3 `grep`, un `mkdir`, un `rm` et `zrecompile` pour vérifier son dump, soit environ 90ms sur le Mac mesuré. Ses fichiers `lib/grep.zsh` et `lib/theme-and-appearance.zsh` forkent aussi `grep`, `diff` et `ls` pour détecter des flags qui ne changent jamais sur une machine donnée.

Pas besoin de changer de gestionnaire de plugins pour s'en débarrasser : on garde `~/.oh-my-zsh` comme réserve de fichiers et on remplace la ligne `source $ZSH/oh-my-zsh.sh` par un chargeur qui source les mêmes libs, plugins et thème.

```zsh title="~/.zshrc"
ZSH_CUSTOM="$ZSH/custom"
ZSH_CACHE_DIR="$ZSH/cache"
SHORT_HOST="${HOST/.*/}"
fpath=($ZSH_CACHE_DIR/completions $ZSH/{functions,completions} $ZSH_CUSTOM/{functions,completions}
  $ZSH_CUSTOM/plugins/${^plugins}(N/) $ZSH/plugins/${^plugins}(N/) $fpath)

autoload -Uz compinit
ZSH_COMPDUMP="$HOME/.zcompdump-lite-$ZSH_VERSION"
_zcomp_stale=($ZSH_COMPDUMP(N.mh+24))
if [[ -f $ZSH_COMPDUMP && -z $_zcomp_stale ]]; then
  compinit -C -d "$ZSH_COMPDUMP"
else
  compinit -u -d "$ZSH_COMPDUMP"
  { zcompile "$ZSH_COMPDUMP" } &!
fi
unset _zcomp_stale
zcomp-rebuild() { rm -f "$ZSH_COMPDUMP"{,.zwc} && exec zsh }

for _lib (async_prompt clipboard cli completion directories functions git history
  key-bindings misc prompt_info_functions termsupport); do
  source "$ZSH/lib/$_lib.zsh"
done
unset _lib

# Ce que lib/grep.zsh et lib/theme-and-appearance.zsh détectaient, figé en dur
alias grep='grep --color=auto --exclude-dir={.bzr,CVS,.git,.hg,.svn,.idea,.tox,.venv,venv}'
autoload -U colors && colors
setopt prompt_subst
diff() { command diff --color "$@" }
export LS_COLORS="di=1;36:ln=35:so=32:pi=33:ex=31:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43"

for _plugin ($plugins); do
  if [[ -f $ZSH_CUSTOM/plugins/$_plugin/$_plugin.plugin.zsh ]]; then
    source "$ZSH_CUSTOM/plugins/$_plugin/$_plugin.plugin.zsh"
  else
    source "$ZSH/plugins/$_plugin/$_plugin.plugin.zsh"
  fi
done
unset _plugin
source "$ZSH/themes/$ZSH_THEME.zsh-theme"
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
```

Les valeurs figées (`LS_COLORS`, alias `grep`) se récupèrent dans un shell qui tourne encore avec oh-my-zsh, avec `alias grep` et `echo $LS_COLORS`. La liste des libs écarte celles qui ne servent pas (bzr, nvm, spectrum, vcs_info, diagnostics) et `compfix.zsh`.

Le compromis est dans `compinit -C` : le dump n'est plus confronté au `fpath` à chaque ouverture, il est reconstruit quand il a plus de 24h. Après l'installation d'un outil qui apporte sa complétion, `zcomp-rebuild` la rend disponible tout de suite.

!!! warning "SHORT_HOST"
    Le plugin `ssh-agent` nomme son fichier d'état `~/.ssh/environment-$SHORT_HOST`, une variable calculée par `oh-my-zsh.sh`. Sans elle, chaque shell démarre un nouvel agent au lieu de réutiliser celui qui tourne.

Pour vérifier que rien ne manque, on capture l'état du shell avant et après le changement puis on compare :

```bash
mkdir -p /tmp/before
zsh -i -c 'alias | sort > $1/alias.txt; setopt | sort > $1/setopt.txt; zstyle -L | sort > $1/zstyle.txt; bindkey -L | sort > $1/bindkey.txt; print -l ${(ok)functions} > $1/functions.txt' -- /tmp/before
```

Même commande vers `/tmp/after` une fois le chargeur en place, puis `diff -r /tmp/before /tmp/after` : seules les fonctions des libs écartées doivent disparaître.

## Alléger le prompt git

Le prompt git n'apparaît dans aucune des mesures précédentes : il est calculé à chaque affichage du prompt, pas à l'ouverture du shell. Depuis zsh 5.0.6, oh-my-zsh le calcule en asynchrone, donc il ne bloque pas la saisie, mais la branche et le `✗` arrivent avec un temps de retard après chaque commande.

On le mesure en appelant directement la fonction que l'async exécute en arrière-plan, depuis un repo :

```bash
zmodload zsh/datetime
s=$EPOCHREALTIME; _omz_git_prompt_info > /dev/null; echo "total: $(( (EPOCHREALTIME-s)*1000 )) ms"
s=$EPOCHREALTIME; parse_git_dirty > /dev/null; echo "dirty: $(( (EPOCHREALTIME-s)*1000 )) ms"
```

`parse_git_dirty` lance un `git status` qui compte aussi les fichiers non suivis. C'est lui qui coûte le plus :

| Repo | Avec les fichiers non suivis | Sans |
|---|---|---|
| Monorepo Terragrunt | 116ms | 38ms |
| Repo ArgoCD | 84ms | 37ms |

`DISABLE_UNTRACKED_FILES_DIRTY="true"` dans le `.zshrc` retire ce comptage. La contrepartie : un repo qui ne contient que des fichiers jamais ajoutés n'affiche plus de `✗`, alors que les fichiers modifiés ou indexés le déclenchent toujours. Pour un repo vraiment lourd, `git config oh-my-zsh.hide-dirty 1` coupe la détection dans ce repo uniquement et garde la branche.

## Résultat

| Étape | Ouverture moyenne |
|---|---|
| Départ, avec un premier shell à plus d'une seconde | 340ms |
| Forks évitables supprimés et `fpath` stabilisé | 300ms |
| `oh-my-zsh.sh` remplacé par le chargeur minimal | 95ms |

Il reste surtout le plugin `kube-ps1` et ses appels à `tput`, une dizaine de millisecondes.
