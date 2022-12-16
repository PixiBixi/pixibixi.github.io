# Reset son password Rancher

Une seule commande suffit :

```bash
kubectl -n cattle-system exec $(kubectl -n cattle-system get pods -l app=rancher | grep 1/1 | head -1 | awk { print $1 }) -- reset-password
```
