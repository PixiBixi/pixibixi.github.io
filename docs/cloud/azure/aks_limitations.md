# Limitations AKS

Probablement un article assez basique, mais rappelons tout de même les limitations que j'ai pu rencontrer :)

## Networking

Imaginons le cas où nous avons beaucoup de nodepool du a une application qui a besoin de replicas sur un /24 soit 255 IPs disponibles avec un _Max pod per node_ à 100.

Ce paramètre indique à Azure le nombre d'IPs à **réserver** par node. Toute la subtilité est dans ce mot. Nous pouvons donc déployer uniquement 2 nodes dans ce subnet. (3*100 > 255)

Pour déterminer au mieux ce paramètre, vous pouvez compter vos pods par node.

```bash
kubectl get pods -A -o jsonpath='{range .items[?(@.spec.nodeName!="")]}{.spec.nodeName}{"\n"}{end}' | sort | uniq -c | sort -n
14 aks-apipool-32017537-vmss00002m
14 aks-default-25750393-vmss00000c
14 aks-default-25750393-vmss00000d
15 aks-apipool-32017537-vmss00000z
15 aks-redis-16823788-vmss000000
18 aks-default-25750393-vmss00000m
19 aks-apipool-32017537-vmss000008
22 aks-apipool-32017537-vmss000000
25 aks-default-25750393-vmss000000
```

Ce paramètre a un minimum à 30. Dans notre exemple, nous voyons un max pod à 25, il convient donc de définir ce paramètre à 30, nous pourrons ainsi schedule 8 noeuds à la place de 3.
