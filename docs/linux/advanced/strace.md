# Utilisation de strace

Quelques usages assez sympa de strace :

``` bash
strace echo "Coucou"
```

Nous permet de strace la commande qui est indiquée en paramètre.

``` bash
sudo strace --summary -f $(pgrep php-fpm | paste -s | sed -e s/'([0-9]'+')/-p '1/g -e s/'t/ /g)
```

Permet d'avoir une vue résumé de l'ensemble des calls fait par les
processus PHP-FPM. (-f permet un follow des child si le process fork)

On peut également filtrer par type de call avec -e

``` bash
sudo strace -e stat -f $(pgrep php-fpm | paste -s | sed -e s/'([0-9]'+')/-p '1/g -e s/'t/ /g)
```

Ici, on va filtrer uniquement les calls de type *stat*
