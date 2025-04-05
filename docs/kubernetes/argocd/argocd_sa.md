# Creer son service account ArgoCD

Un SA est toujours utile si l'on souhaite taper l'API pour une quelconque raison.

Quelques étapes sont nécessaires, rien de bien compliquer

Dans notre cas, nous déployons ArgoCD via le Helm chart

On commence par définir le SA dans le `values.yaml` du chart

```
argo-cd:
  configs:
    cm:
      accounts.mysuperSA: apiKey

    rbac:
      policy.csv: |
        p, mysuperSA, applications, get, */*, allow
```

Ici, nous définissons un compte qui aura comme nom  `mysuperSA` et aura l'autorisation (`allow`) l'accès à toutes les applications en get de tous les projets ArgoCD (`*/*`)

La syntaxe des politiques ArgoCD est la suivante : `p, <role/user/group>, <resource>, <action>, <object>, <effect>`. Je vous invite à consulter la [documentation ArgoCD RABC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)

Une fois ceci fait, on vérifie que notre compte existe :
```
➜  docs git:(master) ✗ argocd account list
NAME                 ENABLED  CAPABILITIES
mysuperSA            true     apiKey
```

On voit que ce compte existe. Il faut maintenant qu'on lui créé son token associé :

```
argocd account generate-token --account mysuperSA
```

Et voilà, vous possédez maintenant un token à utiliser pour accéder à votre ArgoCD
