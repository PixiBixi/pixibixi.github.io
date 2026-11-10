---
description: "Homebrew sur macOS : installer brew sur Apple Silicon et Intel, brew install, formules et casks, Brewfile, mise à jour, nettoyage et dépannage du PATH après installation."
tags:
  - Homebrew
  - macOS
---

# Homebrew sur macOS : installer brew, formules et casks

macOS n'a pas de gestionnaire de paquets en ligne de commande. [Homebrew](https://brew.sh/) comble le trou, avec 2 catalogues distincts : les **formules** (des outils CLI compilés ou en binaire pré-construit) et les **casks** (de vraies applications `.app`, Chrome, VLC, Rectangle).

## Installation

Homebrew a besoin des Command Line Tools de Xcode, pas de Xcode entier. Le script d'installation les propose tout seul, mais autant les poser avant :

```bash
xcode-select --install
```

Puis l'installeur officiel, en bash. Les instructions en `ruby -e` qu'on trouve encore partout datent d'avant 2020 (le passage à `install.sh` date de janvier 2020) et le script Ruby qu'elles appellent a été supprimé en 2023 :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## L'étape que le script ne fait pas pour vous

Sur Apple Silicon, Homebrew s'installe dans `/opt/homebrew`, qui n'est **pas** dans le `PATH` par défaut. C'est la raison n°1 du `zsh: command not found: brew` juste après une installation réussie. Le script l'affiche en fin de sortie, dans un pavé que personne ne lit :

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Sur un Mac Intel, le préfixe est `/usr/local`, déjà dans le `PATH` et rien de tout ça n'est nécessaire. `brew --prefix` dit dans quel cas on est, ce qui est utile dans un script de bootstrap qui doit marcher sur les deux.

## Les commandes du quotidien

```bash
brew install htop              # une formule (CLI)
brew install --cask rectangle  # un cask (application)
brew search postgres           # chercher, accepte les regex
brew info htop                 # version, dépendances, options
brew list                      # ce qui est installé
brew uninstall htop
```

`brew cask install` a été supprimé en 2020 : la syntaxe est `brew install --cask`. Les vieux tutos avec `brew cask search` renvoient aujourd'hui une erreur.

## Mettre à jour

Les 2 commandes se confondent facilement et ne font pas du tout la même chose :

```bash
brew update    # met à jour le catalogue de formules, pas les paquets
brew upgrade   # met à jour les paquets installés
```

`brew upgrade` seul met à jour les formules **et** les casks. Il saute seulement les casks marqués `auto_updates true` (les applications qui gèrent leur propre update) et ceux en `version :latest` : `--greedy` les inclut aussi, et `--greedy-auto-updates` ou `--greedy-latest` ciblent l'une des 2 catégories. `--cask` limite la mise à jour aux casks :

```bash
brew upgrade --cask              # uniquement les casks
brew upgrade --greedy-latest     # inclut aussi les casks version :latest
```

Pour figer un paquet dont on ne veut pas la dernière version :

```bash
brew pin terraform
brew unpin terraform
```

## Brewfile : réinstaller un Mac en une commande

`brew bundle` sérialise tout ce qui est installé dans un fichier versionnable, formules, casks et taps compris. C'est le seul moyen propre de reconstruire un poste à l'identique :

```bash
brew bundle dump --force --file=~/Brewfile   # générer (--force écrase un Brewfile existant)
brew bundle install --file=~/Brewfile        # restaurer
brew bundle check --file=~/Brewfile          # que manque-t-il ?
brew bundle cleanup --file=~/Brewfile        # désinstaller ce qui n'y est pas, après confirmation
```

`dump` ajoute par défaut un commentaire de description devant chaque ligne, ce qui rend le fichier relisible 6 mois plus tard (`--no-describe` pour s'en passer). L'ancien `--describe` est désormais refusé avec une erreur. `cleanup` demande confirmation avant de désinstaller quoi que ce soit, et `--force` saute la question. Mon Brewfile est [dans mes dotfiles](https://github.com/PixiBixi/dotfiles/blob/master/Brewfile).

## Faire de la place

Homebrew garde les anciennes versions et les archives téléchargées. Sur une machine de plusieurs années, le cache dépasse facilement les 10 Go :

```bash
brew cleanup -n     # ce qui serait supprimé
brew cleanup        # le faire
du -sh "$(brew --cache)"
```

`brew autoremove` retire les dépendances devenues orphelines et `brew leaves` liste ce qu'on a installé explicitement, par opposition à ce qui est venu en dépendance. Utile pour reprendre un Brewfile à zéro sur une machine encrassée.

## Dépannage

`brew doctor` est le premier réflexe devant un comportement bizarre. Il est bavard et signale des choses parfaitement bénignes, donc on ne cherche pas à obtenir un sans-faute : on y cherche les liens symboliques cassés et les `dylib` d'autres gestionnaires (MacPorts, conda) qui entrent en conflit.

Le `brew update` qui se déclenche tout seul avant un `brew install` (au plus une fois toutes les 24 h par défaut) et ajoute 30 secondes se règle par variable d'environnement, en l'espaçant ou en le coupant :

```bash
export HOMEBREW_AUTO_UPDATE_SECS=604800   # une fois par semaine
export HOMEBREW_NO_AUTO_UPDATE=1          # jamais
```

Après une mise à jour majeure de macOS, les Command Line Tools sont souvent cassés et les compilations échouent sur des en-têtes introuvables. La réinstallation les remet en état :

```bash
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install
```
