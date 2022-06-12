# Apprendre à se servir de git

## Commandes utiles

    git push origin --delete branch_name

Delete la branche distante branch_name

------------------------------------------------------------------------

    $ git diff --name-only HEAD HEAD~1

Retrouver le nom des derniers fichiers commit

------------------------------------------------------------------------

    $ git remote set-url origin https://github.com/USERNAME/REPOSITORY.git

Change l'URL distante

------------------------------------------------------------------------

    $ git clean -d -fx .

Supprimer les fichiers non trackés inclus dans le gitignore

## .gitconfig

Afin d'être indépendant de tout environnement (ohmyzsh ou autre), j'ai
décidé d'utiliser les alias du .gitconfig disponible sur
[github](https://github.com/PixiBixi/dotfiles/blob/master/.gitconfig)

3 binaires sont nécessaires :

-   **diff-so-fancy** afin d'avoir un meilleur diff
-   **giturl** qui est une Gem Ruby afin d'ouvrir dans le navigateur
    l'URL du repository Git
-   **git-quick-stats** pour extraire les stats simplement d'un
    repository

