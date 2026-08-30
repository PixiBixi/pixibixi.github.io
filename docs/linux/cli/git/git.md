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
git clean -d -fx .
```

Supprimer les fichiers non trackés inclus dans le gitignore

------------------------------------------------------------------------

```sh
for BR in $(git branch --all --merged |grep -v $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')) ; do
    git push origin --delete "${BR#remotes/origin/}"
done
```

Supprimer sur le repo distant toutes les branches déja merged

## .gitconfig

Afin d'être indépendant de tout environnement (ohmyzsh ou autre), j'ai
décidé d'utiliser les alias du .gitconfig disponible sur
[github](https://github.com/PixiBixi/dotfiles/blob/master/.gitconfig)

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

Pour rattraper un historique déjà poussé non signé, on ré-amende chaque commit
depuis la base plutôt que de repartir de zéro :

```sh
git rebase --exec "git commit --amend --no-edit -S --quiet" origin/main
```

!!! warning "Pas de `user.email` globale"
    Garder l'identité par repo évite de signer un commit public avec l'adresse
    du boulot, mais le prix est un `Author identity unknown` sur chaque repo
    neuf. C'est un arbitrage, pas un oubli : le poser en global pour le confort
    revient à choisir laquelle des 2 adresses fuitera par défaut.

## Voir aussi

* [Réduire la taille de son repository Git](rework_files.md) - techniques avancées pour nettoyer un dépôt trop volumineux
