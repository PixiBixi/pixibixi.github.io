# Utiliser un proxy pour pull les images Docker

Utiliser un proxy avec le daemon Docker est tout sauf intuitif, nous ne
pouvons pas utiliser les variables d'environnement classiques ni le
fichier de configuration *daemon.json*

Voici la procédure à suivre sous un système basé sur Debian :

-   Créer le dossier où se situera le fichier de configuration Docker

```bash
$ mkdir /etc/systemd/system/docker.service.d
```

-   Nous allons créer le fichier *http-proxy.conf* qui contiendra la
    variable HTTP_PROXY qui sera reconnue par Docker

```bash
cat > /etc/systemd/system/docker.service.d/http-proxy.conf << EOF
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:80/"
EOF
```

-   Si vous utilisez un registry interne, il est également possible
    d'ignorer certaines IPs/nom de domaine (A ajouter au même fichier)

```bash
Environment="NO_PROXY=localhost,127.0.0.0/8,docker-registry.somecorporation.com"
```

-   Nous rechargeons le daemond systemd

```bash
$ systemctl daemon-reload
```

-   Nous vérifions si la variable a bien été prise en compte par
    systemd, si vous n'avez aucun retour, la variable n'a pas été
    appliquée

```bash
$ systemctl show --property=Environment docker
```

-   Si la variable a bien été appliquée, nous pouvons redémarrer Docker

```bash
$ systemctl restart docker
```
