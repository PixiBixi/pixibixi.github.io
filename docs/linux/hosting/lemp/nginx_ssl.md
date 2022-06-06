# Forcer le SSL sous NGINX 
 
Pour forcer le SSL/TLS sous nginx, rien de plus simple, il suffit 
simplement d'ajouter cette directive dans votre server-block nginx 
 
``` nginx 
server { 
... 
    return 301 https://$host$request_uri; 
... 
} 
``` 
 
Il ne faut pas oublier de faire un autre server-block qui écoute sur le 
port 443 et qui comporte toutes les instructions nécéssaire au bon 
fonctionnement du site web. 
