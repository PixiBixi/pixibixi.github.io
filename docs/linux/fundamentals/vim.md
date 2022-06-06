# VIM: L'editeur de texte de la mort 
 
![](https://i.imgur.com/u1Nt2cK.png){.align-center} 
 
Dans cet article, nous allons voir tous les raccourcis, afin d'utiliser 
au mieux vim (En illustration, voici un screenshot de mon interface de 
vim) 
 
## Raccourcis 
 
### Fenêtres 
 
-   Nouvelle fenêtre : 
    -   **Ctrl W + V** : Verticale Fenêtre 
    -   **Ctrl W + N** : Horizontale Fenêtre 
-   Pour switch de fenêtre : W + Flèche 
-   **Ctrl F** : Descend d'un écran 
-   **Ctrl B** : Monte d'un écran 
 
### Texte 
 
-   **c i** : Pour remove le contenu d'une parenthèse'... (Change 
    Inside) 
-   **d s (** : Remove des parenthèse'... : 
-   **%s/search/replace/g** : Pour sed un fichier 
-   **F2, paste normal, puis F2** : Pour coller un texte **sans problème 
    de tab** 
-   **daw** : Supprime le mot courant (Delete a Word) 
-   **das** : Supprime tout un bloc de texte tant qu'il n'y a aucun 
    saut de ligne 
-   **R** : Pour remplacer du texte : 
-   **J** : Pour joindre 2 lignes 
-   **g U** : Pour passer du texter en uppercase 
-   **g u** : Pour passer du texter en lowercase 
 
### Copie/Delete 
 
-   **yy** ou **Y** : Copier une ligne 
-   **v** : Permet de passer en mode visuel pour sélectionner plusieurs 
    lignes 
-   **dd** : Delete une ligne 
-   **cw** : Delete un mot 
-   **p** : Copier après la ligne courante 
-   **P** : Copier avant la ligne courante 
 
<https://jordanelver.co.uk/blog/2014/03/12/sorting-columnds-of-text-in-vim-using-sort/> 
='> Faire des colonnes propres 
 
### Misc 
 
-   **'<** : Diminiue la tab 
-   **'>** : Augmente la tab 
-   **:r!ls :** Permet d'importer le résultat de la commande ls dans le 
    document actuel 
-   **:r '<filename'>** : Importe '<filename'> dans le document actuel 
-   **:!ls** : Permet de faire la commande ls depuis vim 
-   **:!php -l %** : Permet d'exécuter un check syntax sur le document 
    actuel 
-   **:vs** : Editer le même fichier sur 2 colonnes 
 
```{=html} 
<!-- --> 
``` 
-   **G** : Pour aller tout en bas d'un fichier 
-   **Ctrl-P** : Liste des fichiers + Ouvrir 
 
```{=html} 
<!-- --> 
``` 
-   **gf** : Ouvre le lien du fichier 
    -   **Ctrl-o** : Revenir au fichier original 
-   **gx** : Ouvre le lien vers un browser 
-   **gd** : Déclaration locale d'une variable/fonction 
-   **gD** : Déclaration globale d'une variable/fonction 
 
```{=html} 
<!-- --> 
``` 
-   **Ctrl a** : Incrémenter un chiffre 
-   **Ctrl x** : Décrémenter un chiffre 
 
### Plugins 
 
-   **tpope/vim-surround** : cs'"' : Change les **'"** en **'** 
 
## Configuration 
 
Pour la configuration, tous mes fichiers sont disponibles sur mon GitHub 
([Repository](https://github.com/PixiBixi/dotfiles)) 
 
Pour installer ma configuration, rien de plus simple, il vous suffit 
d'avoir un environnement UNIX/BSD : 
 
``` bash 
$ curl https://raw.githubusercontent.com/PixiBixi/dotfiles/master/init.sh | bash 
``` 
 
Et voilà, vous avez avec ma configuration 
