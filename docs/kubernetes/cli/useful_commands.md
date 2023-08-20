# Commandes utiles pour K8S

Pour K8S, les commandes sont assez difficiles de base. De plus, il
existe certaines commandes assez tricky que je vais essayer de
répertorier ici

```bash
$ kubectl delete pods --field-selector=status.phase!=Running -A
```

Permet de supprimer les pods de la liste qui ne sont pas running (Dont
les evicted)


```bash
$ kubectl get Issuers,ClusterIssuers,Certificates,CertificateRequests,Orders,Challenges -A
```

Liste toutes les ressources qui sont link à la génération d'un
certificat

```bash
$ kubectl get pods -o name | xargs -I{} kubectl exec {} -- <command goes here>
```

Permet d'exécuter la même commande sur de multiples pods
