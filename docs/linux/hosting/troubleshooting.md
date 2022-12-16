# MOZILLA_PKIX_ERROR_REQUIRED_TLS_FEATURE_MISSING

Une erreur courante avec Mozilla Firefox est l'erreur
MOZILLA_PKIX_ERROR_REQUIRED_TLS_FEATURE_MISSING.

Personnellement, j'ai souvent rencontré cette erreur avec des
certificats Let's Encrypt ayant été créé avec l'argument
**'--must-staple**. Ce bug se produit lorsque qu'aucun résolveur n'est
définit au niveau de nginx. Sans résolveur, nginx n'est pas capable
d'effectuer l'OCSP Stapling.

Au niveau du nginx :

```nginx
http {
    ...
    resolver 1.1.1.1;
    ...
}
```

Et au niveau de notre server-block (par ex: sites-enabled/coucou.fr) :

```nginx
server {
    server_name coucou.fr
    ssl_certificate /etc/letsencrypt/live/coucou.fr-0002/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/coucou.fr-0002/privkey.pem; # managed by Certbot
    ssl_stapling on;
}
```

Il faut vérifier que vous ayez la variable **ssl_stapling** à **on**. Le
resolver étant chargé au démarrage de nginx, un reload ne suffira pas,
il faudra un restart.

Dans le cadre de Let's Encrypt, étant donner que nous donnons la chaine
complète en tant que **ssl_certificate** à nginx, nous n'avons
aucunement besoin de spécifier **ssl_trusted_certificate**
