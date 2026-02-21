# 2-3 tips pour la stack LGTM

Quelques calls API à gauche à droite qui nous sont bien pratiques pour du Prometheus ou autre

## Prometheus

Notre premier call Prometheus nous permet de lister toutes les métriques disponibles dans notre Prometheus

```sh
curl http://127.0.0.1:9090/api/v1/label/__name__/values
```
