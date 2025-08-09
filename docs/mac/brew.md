# Brew, l'APT-GET du Mac

## Présentation

Mac OS est un OS absolument génial, il est d'une simplicité incroyable,
et nous facilite la vie avec une gestuelle de trackpad fantastique. La
seule critique que nous pouvons lui reprocher est qu'il lui manque un
gestionnaire de paquet en ligne de commande.

Pas de panique, c'est pour cela que *Homebrew* a été développé.

Homebrew (aka brew) fonctionne comme APK pour Alpine, ou bien encore
apt-get pour les distributions Debian Based.

Il est possible d'ajouter une tonne de paquets indispensable, mais
pourtant manquant par défaut sous Mac.

## Installation

De base, Homebrew nécéssite les outils de développement CLI de XCode, il
existe une parade afin d'installer uniquement les outils CLI de XCode,
et non XCode (Qui pèse prêt de 11GB, ce qui est considérable pour un SSD
de 128/256GB)

Tout d'abord, nous devons installer les outils CLI de XCode

```bash
xcode-select --install
```

Puis on installe Homebrew

```bash
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

## Commandes de base Homebrew

Comme tout gestionnaire de paquet, Homebrew dispose de commandes
relativement basiques

  * **brew update** : Met à jour les formules de brew et brew
  * **brew upgrade** : Met à jour les paquets installés via brew
  * **brew search** : Cherche les paquets correspondant à la chaine de
    caractère (accepte les expression régulières)
  * **brew install** : Permet d'installer un packages
  * **brew uninstall** : Désinstalle un paquet
  * **brew list** : Liste les packages installés via brew

Pour plus d'informations concernant les commandes, je vous conseille
[Oh My ZSH](https://github.com/robbyrussell/oh-my-zsh) avec le plugin
brew d'activé

## Caskroom

Caskroom est un complément à Homebrew, Homebrew dispo d'énormément de
packages issus de la communauté UNIX (Liste complète disponible
[ici](https://github.com/Homebrew/homebrew-core/tree/master/Formula)),
il lui manque énormément de '"vrais'" applications (Chrome, VLC...)

C'est là que Caskroom intervient, celui-ci comble le manque en
application que Homebrew a. Vous pouvez regarder tous les packages
disponibles via Cask
[ici](https://github.com/caskroom/homebrew-cask/tree/master/Casks)

Concernant les commandes, celle-ci sont les mêmes que pour homebrew,
mais en y ajoutant cask devant

Par exemple, **brew search vlc** deviendra **brew cask search vlc**

## Meilleurs Packages

### Homebrew

  * `bash` : Version récente de bash
  * `bat` : cat en plus utile
  * `composer` : Gestionnaire de paquet pour PHP
  * `dfc` : Commande df en mieux
  * `docx2txt` : Convertit un docx en txt
  * `duf` : df amélioré (<https://github.com/muesli/duf>)
  * `exa` : remplacant de ls
  * `findutils` : find GNU
  * `gist` : Permet d'envoyer un fichier au service Gist de Github directement en CLI
  * `git-quick-stats` : Comme son nom l'indique, affiche rapidement les stats d'un repo Git
  * `git` : Outil de versionning
  * `grv` : Git en ligne de commande
  * `htop` : Commande top en mieux
  * `httpie` : cURL en mieux
  * `iproute2mac` : Ajoute toutes les commandes ip sur Mac
  * `lftp` : client FTP/SFTP en ligne de commande
  * `livestreamer` : Permet de regarder des streams sur VLC via le CLI
  * `mpv` : Excellent player vidéo open source
  * `ncdu` : Gestionnaire d'espace libre en CLI
  * `nghttp` : Permet de bench un serveur HTTP2
  * `nmap` : Outil de scan réseau
  * `php-cs-fixer` : Fix les erreurs standards en PHP + refactoring
  * `php73` : PHP en ligne de commande
  * `speedtest_cli` : Speedtest en ligne de commande
  * `testssl` : Outil de bench SSL (ciphers protocoles & co)
  * `tmate` : Permet de partager une session SSH
  * `tmux` : Multiplexeur de terminal
  * `trash` : Corbeille en CLI
  * `tree` : Permet de lister récursivement tous les fichiers sous forme d'arbre
  * `wget` : Télécharger des fichiers en ligne de commande
  * `whois` : Permet d'avoir un vrai whois
  * `youtubedl` : Permet de télécharger les vidéos YT et de beaucoup d'autres services en 1 ligne de commande

### Homecask

  * `daisydisk` (<https://daisydiskapp.com/>) : Analyser son
    utilisation disque
  * `dropbox` : Travail colaboratif
  * `elmedia-player` : Excellent player vidéo sous Mac
  * `flux` : Enlève la lumière bleue de l'écran
  * `google-chrome` : Le célèbre navigateur web
  * `livestreamer-twitch-gui` : Interface graphique Twitch pour
    Livestreamer
  * `maccy` : Clipboard manager, réellement indispensable
  * `mediainfo` : Permet d'obtenir toutes les informations sur un
    média
  * `quicklook` ([Plus d'informations](https://github.com/sindresorhus/quick-look-plugins))
  * `soundnode` : GUI pour SoundCloud
  * `sublime-text` : L'éditeur de code par excellence
  * `suspicious-package` : Pour tout connaitre des paquets suspicieux
  * `the-unarchiver` : Tout désarchiver en 1 clic
  * `tunnelblick` : Client VPN
  * `virtualbox` : Virtualiser vos OS en quelques clics
  * `vlc` : Le célèbre lecteur multimédia
  * `vscodium` : Version de VSCode sans bloatware

## Divers

### Bundle

Sous Brew, il existe une sous-commande absolument magique qui s'appelle `bundle`.

Brew nous permet de générer dans un fichier l'ensemble des packages, tap & autres que nous avons. Pour ma part, ils sont disponibles [ici](https://github.com/PixiBixi/dotfiles/blob/master/Brewfile).

Voici les principales commandes à connaitre !

  * `brew bundle dump` : Permet de générer le fichier Brewfile
    * `--file=my_brewfile` : Pour spécifier un nom différent
  * `brew bundle install` : Permet d'installer tout ce qui est dans le fichier ~/Brewfile
    * `--file=my_brewfile` : Permet de spécifier un nom différent

### cask-upgrade

brew cu permet de mettre à jour facilement toutes ses applications installées avec brew. Je vous invite à aller consulter le [README](https://github.com/buo/homebrew-cask-upgrade) de cask-upgrade, qui est bougrement bien fait
