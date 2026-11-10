---
description: Réinitialiser le mot de passe administrateur Rancher en une commande kubectl
tags:
  - Rancher
---

# Reset son password Rancher

Une seule commande suffit, `-c rancher` vise le bon container quand le sidecar d'audit log est activé :

```bash
kubectl -n cattle-system exec deploy/rancher -c rancher -- reset-password
```

Elle affiche un nouveau mot de passe généré (20 caractères) pour l'admin par défaut. Elle échoue s'il n'y a pas exactement un user portant le label d'admin de bootstrap.

Pour viser un pod `Running` plutôt que celui choisi par `deploy/`, on récupère son nom :

```bash
kubectl -n cattle-system exec $(kubectl -n cattle-system get pods -l app=rancher --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}') -c rancher -- reset-password
```
