---
description: Commandes git essentielles - gestion de branches, nettoyage et configuration .gitconfig
tags:
  - Git
---

# Apprendre à se servir de git

## Commandes utiles

```sh
git push origin --delete branch_name
```

Delete la branche distante branch_name

------------------------------------------------------------------------

```sh
git diff --name-only HEAD HEAD~1
```

Retrouver le nom des derniers fichiers commit

------------------------------------------------------------------------

```sh
git remote set-url origin https://github.com/USERNAME/REPOSITORY.git
```

Change l'URL distante

------------------------------------------------------------------------

```sh
git clean -ndx .
git clean -d -fx .
```

Supprimer tous les fichiers non trackés du dossier courant, ceux du gitignore **et** les autres (`-d` ajoute les dossiers). C'est irréversible, d'où le dry-run `-n` d'abord pour relire la liste.

------------------------------------------------------------------------

```sh
git fetch --prune origin
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@')
git for-each-ref --format='%(refname:lstrip=3)' --merged "origin/$DEFAULT" refs/remotes/origin \
  | grep -vx -e HEAD -e "$DEFAULT" > merged-branches.txt
# Relire merged-branches.txt et retirer les branches à garder (release, protégées...)
xargs -r git push origin --delete < merged-branches.txt
```

Supprimer sur le repo distant toutes les branches déja merged dans la branche par défaut. On compare à `origin/<branche par défaut>` et pas à `HEAD`, sinon depuis une feature branch c'est elle qui part, et on ne liste que les branches distantes.

## .gitconfig

Afin d'être indépendant de tout environnement (ohmyzsh ou autre), j'ai
décidé d'utiliser les alias du .gitconfig disponible sur
[github](https://github.com/PixiBixi/dotfiles/blob/master/config/.gitconfig)

3 binaires sont nécessaires :

* `diff-so-fancy` afin d'avoir un meilleur diff
* [`gopen`](https://github.com/PixiBixi/gopen) pour ouvrir dans le navigateur
    le repository Git sur la branche et le fichier courants
* `git-quick-stats` pour extraire les stats simplement d'un repository

## Signer ses commits sans y penser

Configurer `user.signingkey` et `gpg.format` ne signe rien. Ces 2 clés disent
*avec quoi* signer, pas *qu'il faut* signer : sans `commit.gpgsign`, chaque
nouveau repo produit des commits non signés et personne ne s'en aperçoit avant
de regarder.

```sh
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/signing_key
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

Une clé SSH fait le travail depuis git 2.34, sans GPG. La même clé publique
s'ajoute côté GitHub dans *Settings > SSH and GPG keys* en type **Signing key**,
qui est une entrée distincte de la clé d'authentification même si le fichier est
le même. GitLab l'accepte aussi.

Le contrôle tient en une commande, `%G?` sortant `G` pour une bonne signature et
`N` pour rien du tout :

```sh
git log --format="%h %G? %s" -5
```

Pour rattraper un historique déjà poussé non signé, on ré-amende chaque commit depuis la base plutôt que de repartir de zéro. Ça réécrit tous les commits de la branche : on ne le fait que sur sa propre branche, jamais sur la branche partagée, et on pousse avec `--force-with-lease` (qui refuse d'écraser un commit poussé entre-temps par quelqu'un d'autre) :

```sh
git rebase --exec "git commit --amend --no-edit -S --quiet" origin/main
git push --force-with-lease
```

!!! warning "Pas de `user.email` globale"
    Garder l'identité par repo évite de signer un commit public avec l'adresse du boulot. Sans `user.email`, git devine une adresse `user@hostname` : il ne bloque (`unable to auto-detect email address`) que si le hostname n'a pas de domaine, sinon le commit passe avec cette adresse devinée. `git config --global user.useConfigOnly true` désactive la devinette, chaque repo neuf bloque alors tant que l'identité n'est pas posée. C'est un arbitrage, pas un oubli : poser `user.email` en global pour le confort revient à choisir laquelle des 2 adresses fuitera par défaut.

## Voir aussi

* [Réduire la taille de son repository Git](rework_files.md) - techniques avancées pour nettoyer un dépôt trop volumineux
