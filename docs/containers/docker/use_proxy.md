---
description: "Configurer un proxy HTTP pour Docker : proxy du daemon pour les pull, proxy client pour les build et les conteneurs, via daemon.json ou une unité systemd, avec NO_PROXY et la vérification que ça s'applique."
tags:
  - Docker
  - Proxy
---

# Configurer un proxy HTTP pour Docker

Docker derrière un proxy, ça rate parce qu'il n'y a pas un proxy à configurer mais **trois**, et qu'ils ne servent pas au même moment. Exporter `HTTP_PROXY` dans son shell ne fait rien du tout : le `docker pull` est exécuté par le daemon, pas par le client, et le daemon ne voit pas l'environnement du shell.

| Ce qu'on veut faire passer | Où se configure le proxy |
|---|---|
| `docker pull`, `docker push` | Le daemon (`daemon.json` ou unité systemd) |
| `RUN apt install` pendant un `docker build` | Le client (`~/.docker/config.json`) |
| Un processus dans un conteneur qui tourne | Le client, ou `-e` au `docker run` |

## Le proxy du daemon, pour les pull

Depuis Docker Engine 23.0, ça se déclare directement dans `daemon.json`, ce qui évite l'unité systemd :

```json title="/etc/docker/daemon.json"
{
  "proxies": {
    "http-proxy": "http://proxy.example.com:3128",
    "https-proxy": "http://proxy.example.com:3128",
    "no-proxy": "localhost,127.0.0.0/8,*.internal.example.com,10.0.0.0/8"
  }
}
```

```bash
systemctl restart docker
```

Le `https-proxy` prend bien une URL en `http://` : c'est l'adresse du proxy, pas le protocole de la connexion qui le traverse. Écrire `https://proxy...` fait échouer la connexion au proxy lui-même, sauf si le proxy fait vraiment du TLS, ce qui est rare.

## La méthode systemd, toujours valable

Sur une version antérieure à 23.0, ou quand `daemon.json` est géré par un outil de conf qu'on ne veut pas toucher, le proxy passe par un drop-in systemd :

```bash
mkdir -p /etc/systemd/system/docker.service.d

cat > /etc/systemd/system/docker.service.d/http-proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.0/8,docker-registry.example.com"
EOF

systemctl daemon-reload
systemctl restart docker
```

Le `daemon-reload` seul ne suffit pas, il faut bien le `restart` : la variable n'est lue qu'au démarrage du process. On vérifie qu'elle est arrivée jusqu'au daemon, une sortie vide signifiant qu'elle n'a pas été prise :

```bash
systemctl show --property=Environment docker
docker info | grep -i proxy
```

Ne pas mettre les deux méthodes en place en même temps : si `daemon.json` et l'unité systemd déclarent chacun un proxy, le daemon refuse de démarrer avec `conflicting proxy settings`.

## Le proxy du build et des conteneurs

Le daemon configuré, `docker pull` marche, et un `RUN apt update` dans un Dockerfile échoue quand même. C'est normal, le build tourne dans un conteneur qui n'hérite de rien. La configuration côté client injecte les variables dans tous les builds et tous les `docker run` :

```json title="~/.docker/config.json"
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:3128",
      "httpsProxy": "http://proxy.example.com:3128",
      "noProxy": "localhost,127.0.0.0/8,.internal.example.com"
    }
  }
}
```

Ce fichier appartient à l'utilisateur qui lance `docker`, donc celui de root n'est pas lu quand on passe par `sudo docker` avec `sudo` qui préserve `$HOME`, et inversement. C'est la deuxième cause de « ça marche chez moi ».

Ponctuellement, on peut faire la même chose en arguments de build, sans rien écrire sur le disque :

```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.example.com:3128 \
  --build-arg HTTPS_PROXY=http://proxy.example.com:3128 \
  --build-arg NO_PROXY=localhost,127.0.0.0/8 \
  -t mon-image .
```

Attention à ne pas les déclarer en `ENV` dans le Dockerfile : ils seraient persistés dans l'image et le conteneur essaierait de joindre le proxy de l'entreprise en production. `ARG` disparaît après le build, `ENV` non.

## NO_PROXY, la variable qui casse tout silencieusement

`NO_PROXY` ne comprend pas les jokers de la même façon partout. Ce qui marche de façon fiable, ce sont les suffixes de domaine et les CIDR :

```text
localhost,127.0.0.0/8,10.0.0.0/8,.example.com,registry.internal
```

Un `.example.com` avec le point initial couvre les sous-domaines. Un `*.example.com` est accepté par Docker mais pas par toutes les libs Go des outils qu'on met dans les conteneurs, donc autant garder la forme avec le point. Et le registry interne doit y figurer, sinon les pull internes partent vers le proxy et sortent en timeout alors que le registry est à 2 mètres.

## Vérifier avant d'accuser Docker

Si le pull échoue toujours, on teste depuis la machine avec les mêmes variables, ce qui isole en 10 secondes un problème de proxy d'un problème de Docker :

```bash
https_proxy=http://proxy.example.com:3128 curl -sSI https://registry-1.docker.io/v2/
```

Une réponse `401 Unauthorized` est le résultat **attendu** ici, elle prouve que la connexion passe. Un timeout ou un `403` du proxy désigne le proxy ou ses ACL, pas Docker.

Dernier piège, le proxy qui déchiffre le TLS : le daemon rejette alors le certificat du registry avec `x509: certificate signed by unknown authority`. Il faut poser le CA de l'entreprise dans le magasin système et redémarrer Docker, aucun réglage de proxy ne contourne ça.

```bash
cp entreprise-ca.crt /usr/local/share/ca-certificates/
update-ca-certificates
systemctl restart docker
```
