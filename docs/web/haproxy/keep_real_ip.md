# Conserver l'IP de son visiteur sur un reverse-proxy

Tout d'abord, si vous n'avez aucune notion sur HAproxy, je vous invite à aller consulter mon [guide HAproxy](./overview.md)

Comme vous pouvez vous en douter, dans le cadre de l'utilisation d'un reverse-proxy, il est (malheureusement) très facile de log la mauvaise IP.

Plus important, il est possible que votre site web autorise (ou non) l'accès à certaines pages selon l'IP, il est donc important de conserver la bonne IP tout au long du process.

Pour cela, rien de plus simple côté HAproxy, il vous suffit d'ajouter cette option dans un frontend.

```haproxy
frontend proxy
    ...
    option forwardfor
    ...
```

Cette petite option va override un quelconque header `X-Forwarded-For` existant et y mettre l'adresse IP de votre client, plutot simple non ? :)
