---
article: docs/linux/misc/install_ruby.md
checked: '2026-11-11'
commit: a7a4d72f1b15c475681e68dd8214ae30bf6a6dad
sources:
- repo: rbenv-rbenv
  path: libexec/rbenv
  lines: 73-75
  ref: v1.1.2
  commit: a3fa9b73b8e6907845bdf47d2c2924c187580bdc
unpinned: 3
---

# docs/linux/misc/install_ruby.md

## Findings

- L19 ERROR corrigé : `rbenv init` remplacé par l'ajout de `eval "$(rbenv init -)"` au `~/.bashrc` puis `exec bash`, avec la note que rbenv 1.3+ modifie lui-même les fichiers d'init. Preuve : debian:trixie-20251020, `apt install rbenv` donne rbenv 1.1.2, `rbenv init` affiche seulement "# Load rbenv automatically by appending ... eval "$(rbenv init -)"" ; rbenv-rbenv libexec/rbenv-init@origin/master (v1.3.2) "Modifies shell initialization files".
- L29 IMPRECISE corrigé : exemple passé à 3.4.1 (via `variables: ruby_version`), ajout des dépendances de build Debian, note sur OpenSSL 1.1 compilé pour les versions EOL 2.7.x. Preuve : dans le conteneur, `apt install rbenv build-essential libssl-dev libyaml-dev zlib1g-dev libffi-dev` puis `rbenv install 3.4.1` OK en 3 min, `ruby -ropenssl -ryaml -rzlib` OK ; ruby-build share/ruby-build/2.7.4@origin/master (openssl-1.1.1w + warn_eol).
- L35 IMPRECISE corrigé : précise que le paquet Debian tire ruby-build en Recommends (`rbenv install` vient de là) et que le plugin git sert à avoir une liste de versions à jour (celle du paquet est figée : 3.4.1 max avec ruby-build 20241225), le plugin passant devant. Preuve : `apt-cache show rbenv` : `Recommends: ruby-build` ; rbenv libexec/rbenv:73-75 @v1.1.2 (plugins/*/bin préfixés au PATH). Ajout de la commande d'upgrade du plugin (README ruby-build:24-27).
- L65 IMPRECISE corrigé : ajout de `git -C ruby-build pull` puis relance de `install.sh`. Preuve : ruby-build README:68 (versions = fichiers de définition embarqués) et install.sh `Usage: PREFIX=/usr/local ./install.sh` @573f87a. Non testé en conteneur.

## En plus

- `~/.rbenv/xxx` précisé en `~/.rbenv/versions/<version>`. Preuve : sortie `Installed ruby-3.4.1 to /root/.rbenv/versions/3.4.1`.
- Prompts `$` retirés des blocs de commandes (copier-coller cassé).

## Modernisation

- Appliquée : exemple en Ruby 3.x ; mention de rbenv 1.3.0.

## Tests

- Docker debian:trixie-20251020 : rbenv 1.1.2-2, ruby-build 20241225.2-1.1, compilation Ruby 3.4.1 (aarch64). Conteneur supprimé.

## À signaler

- `tested_with` ajouté : "rbenv 1.1.2 et ruby-build 20241225 (paquets Debian 13), Ruby 3.4.1". La partie ruby-build standalone n'a été vérifiée que par le source.
