# Remplacer les commandes de base Linux

Les commandes Unix historiques font le job, mais des alternatives modernes
— souvent écrites en Rust — offrent une meilleure ergonomie, une sortie
colorisée, et parfois des gains de performance significatifs.

!!! note "Installation"
    Tous ces outils sont disponibles via Homebrew (`brew install <tool>`)
    et la plupart via `apt`/`dnf` sur Linux.

---

## Fichiers & répertoires

### `ls` → `lsd`

[lsd](https://github.com/lsd-rs/lsd) ajoute icônes, couleurs, et une vue
arborescente intégrée :

```bash
lsd                   # liste classique avec icônes
lsd -la               # détails complets
lsd --tree            # vue arborescente (remplace tree)
lsd --tree --depth 2  # limiter la profondeur
```

!!! note "exa / eza"
    [exa](https://the.exa.website/) était l'alternative historique mais le
    projet est archivé depuis 2022. Son fork
    [eza](https://github.com/eza-community/eza) continue mais `lsd` reste
    mon choix par défaut.

---

### `cat` → `bat`

[bat](https://github.com/sharkdp/bat) ajoute numéros de ligne, coloration
syntaxique, intégration git, et pagination automatique :

```bash
bat script.sh            # affichage colorisé
bat --style=plain file   # sans décoration (alias cat)
bat -A file              # affiche les caractères non-imprimables
```

Intégration git : les lignes modifiées sont marquées dans la gouttière
gauche par rapport à l'index git.

---

### `find` → `fd`

[fd](https://github.com/sharkdp/fd) est plus rapide, respecte `.gitignore`
par défaut, et a une syntaxe simplifiée :

```bash
fd pattern              # recherche par nom (récursif)
fd -e md                # filtrer par extension
fd -t f pattern         # fichiers uniquement
fd -t d pattern         # répertoires uniquement
fd --hidden pattern     # inclure les fichiers cachés
fd pattern -x cmd {}    # exécuter une commande sur chaque résultat
```

---

### `du` → `dust`

[dust](https://github.com/bootandy/dust) affiche les plus gros éléments
avec une barre visuelle de proportion :

```bash
dust            # analyse du répertoire courant
dust -d 2       # limiter la profondeur
dust /var/log   # sur un répertoire spécifique
```

---

### `df` → `dfc`

[dfc](https://github.com/Rolinh/dfc) est un `df` légèrement plus lisible,
avec graphe d'utilisation en ASCII :

```bash
dfc             # vue globale avec barres de progression
dfc -T          # affiche le type de système de fichiers
```

Pour un rendu encore plus visuel, [duf](https://github.com/muesli/duf)
est une alternative en Go avec une UI colorisée et des filtres :

```bash
duf             # tableau complet par type de montage
duf /home       # filtré sur un point de montage
```

---

### `rm` → `rip`

[rip](https://github.com/nivekuil/rip) déplace les fichiers dans un
répertoire temporaire plutôt que de les supprimer définitivement :

```bash
rip file.txt        # "suppression" récupérable
rip --seance        # liste les fichiers supprimés
rip --unbury file   # restaurer un fichier
```

Filet de sécurité indispensable quand on travaille vite.

---

## Recherche dans les fichiers

### `grep` → `ripgrep`

[ripgrep](https://github.com/BurntSushi/ripgrep) est en moyenne 2× plus
rapide que grep. Il respecte `.gitignore` par défaut et supporte les
expressions régulières avancées :

```bash
rg pattern              # recherche dans le répertoire courant
rg pattern -t py        # filtrer par type de fichier
rg -l pattern           # afficher uniquement les noms de fichiers
rg -i pattern           # insensible à la casse
rg pattern --hidden     # inclure les fichiers cachés
rg -A 3 -B 3 pattern    # contexte avant/après
```

---

## Processus & système

### `top` → `htop` / `bottom`

[htop](https://htop.dev/) est le successeur naturel de `top`, avec une
interface interactive et des filtres :

```bash
htop
htop -u username    # filtrer par utilisateur
```

[bottom](https://github.com/ClementTsang/bottom) (`btm`) va plus loin
avec graphes CPU/mémoire/réseau en temps réel :

```bash
btm             # vue graphique complète
btm --basic     # mode simplifié
```

---

### `ps` → `procs`

[procs](https://github.com/dalance/procs) affiche les processus de manière
lisible avec coloration et recherche :

```bash
procs               # liste tous les processus
procs nginx         # filtrer par nom
procs --tree        # vue arborescente des processus
```

---

## Réseau

### `dig` → `dog`

[dog](https://github.com/ogham/dog) offre une sortie colorisée et une
syntaxe plus intuitive que `dig` :

```bash
dog example.com          # requête A par défaut
dog example.com MX       # enregistrement MX
dog example.com @8.8.8.8 # serveur DNS spécifique
```

!!! warning "Limitation"
    `dog` ne supporte pas l'équivalent de `dig -x` (reverse DNS).
    Pour le reverse DNS, utiliser `dig -x` ou `host`.

---

### `ping` / `mtr` → `trippy`

[trippy](https://github.com/fujiapple852/trippy) (`trip`) combine ping et
traceroute dans une UI interactive :

```bash
trip example.com        # traceroute interactif
trip -p udp example.com # mode UDP
```

---

### `curl` → `httpie`

[HTTPie](https://httpie.io/) (`http`) simplifie les requêtes HTTP avec une
syntaxe intuitive et une sortie colorisée :

```bash
http GET example.com/api
http POST api.example.com/users name=john email=j@example.com
http -A bearer -a token123 GET api.example.com/secure
http --download example.com/file.zip
```

---

## Compression

### `gzip` → `pigz`

[pigz](https://zlib.net/pigz/) est un `gzip` multithread — gain de
performance de ×3 sur les machines multi-cœurs :

```bash
pigz file.txt           # compression (remplace gzip)
pigz -d file.txt.gz     # décompression
tar -I pigz -czf archive.tar.gz dir/  # via tar
```

---

## Git

### `diff` → `delta`

[delta](https://github.com/dandavison/delta) remplace le pager de diff de
git avec coloration syntaxique et affichage côte-à-côte :

```ini title="~/.gitconfig"
[core]
    pager = delta

[interactive]
    diffFilter = delta --color-only
```

Voir la [configuration complète dans les dotfiles](confrc.md#git).

---

### `git log` → `tig`

[tig](https://github.com/jonas/tig) est une interface ncurses légère pour
naviguer dans l'historique git :

```bash
tig                 # historique interactif
tig blame file.txt  # blame interactif
tig status          # vue status interactive
```

---

## Lecture & exploration

### `man` / docs → `glow`

[glow](https://github.com/charmbracelet/glow) rend le Markdown dans le
terminal avec style :

```bash
glow README.md          # affichage formaté
glow -p README.md       # avec pagination
glow                    # naviguer dans les .md du répertoire
```

---

## Récapitulatif

| Commande | Remplacement | Langage | Alias |
|----------|-------------|---------|-------|
| `ls` | `lsd` | Rust | `alias ls='lsd'` |
| `cat` | `bat` | Rust | `alias cat='bat --style=plain'` |
| `find` | `fd` | Rust | `alias f='fd'` |
| `du` | `dust` | Rust | — |
| `df` | `dfc` | C | `alias df='dfc'` |
| `rm` | `rip` | Rust | `alias rm='rip'` |
| `grep` | `ripgrep` | Rust | — |
| `top` | `htop` / `bottom` | C / Rust | — |
| `ps` | `procs` | Rust | — |
| `dig` | `dog` | Rust | `alias dig='dog'` |
| `ping`/`mtr` | `trippy` | Rust | — |
| `curl` | `httpie` | Python | — |
| `gzip` | `pigz` | C | — |
| `git diff` | `delta` | Rust | (pager git) |
| `vim` | `nvim` | C | `alias vim='nvim'` |
