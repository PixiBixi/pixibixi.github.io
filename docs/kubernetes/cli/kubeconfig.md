---
description: Gérer plusieurs fichiers kubeconfig et contextes Kubernetes avec des variables d'environnement et kubectx
tags:
  - kubeconfig
  - kubectl
---

# Manage son $KUBECONFIG

De base, kubectl va chercher sa configuration dans `~/.kube/config`. Il
est possible de modifier KUBECONFIG pour gérer plusieurs clusters
différents.

Par exemple

```bash
export KUBECONFIG=/Users/jeremy/.kube/A:/Users/jeremy/.kube/B
```

Via ce KUBECONFIG, nous avons la configuration du fichier A et B
chargés. Nous pouvons faire plus dynamique via un script à mettre dans
son bashrc par exemple

```bash
#!/usr/bin/env bash
DEFAULT_KUBECONFIG_FILE="$HOME/.kube/config"
if test -f "${DEFAULT_KUBECONFIG_FILE}"
then
  export KUBECONFIG="$DEFAULT_KUBECONFIG_FILE"
fi

# Your additional kubeconfig files should be inside ~/.kube/config-files
ADD_KUBECONFIG_FILES="$HOME/.kube/config-files"
[ ! -d "${ADD_KUBECONFIG_FILES}" ] && mkdir -p "${ADD_KUBECONFIG_FILES}"
while IFS= read -r -d '' kubeconfigFile
do
    export KUBECONFIG="$kubeconfigFile${KUBECONFIG:+:$KUBECONFIG}"
done < <(find "${ADD_KUBECONFIG_FILES}" -type f \( -name "*.yml" -o -name "*.yaml" \) -print0)
```

Tous les fichiers dans `~/.kube/config-files` (sous-dossiers compris) et finissant en `.yml` ou `.yaml` seront chargés automatiquement, même avec des espaces dans le nom ! Free to use avec kubectx o/

L'ordre dans KUBECONFIG compte : en cas de conflit (même nom de context, de cluster ou de user, ou le `current-context`), c'est le premier fichier de la liste qui gagne. Ici `~/.kube/config` est ajouté en dernier, donc un fichier de `config-files` a la priorité sur lui.

## Utilisation avancée

Autre manière, il y a l'outil kubeswitch qui permet de gérer facilement plusieurs contextes via son fichier de configuration [switch-config.yaml](https://github.com/danielfoehrKn/kubeswitch/blob/master/docs/kubeconfig_stores.md).

Mon fichier de configuration est disponible dans mon [dotfiles](https://github.com/PixiBixi/dotfiles/blob/master/config/.kube/switch-config.yaml)

Sans `switch-config.yaml`, kubeswitch ne lit que `~/.kube/config`. Pour charger automatiquement tous les fichiers `.yaml` de `~/.kube/kubeconfig/`, on déclare un store `filesystem` :

```yaml
kind: SwitchConfig
version: v1alpha1
kubeconfigStores:
  - kind: filesystem
    kubeconfigName: "*.yaml"
    paths:
      - ~/.kube/kubeconfig/
```

Si vous n'avez que des clusters managés par Rancher, c'est encore mieux ! l'URL Rancher, un token, quelques [lignes de configuration](https://github.com/danielfoehrKn/kubeswitch/blob/master/docs/stores/rancher/rancher.md) et hop, tous vos clusters sont automagiquement découverts. D'autres [fournisseurs](https://github.com/danielfoehrKn/kubeswitch/tree/master/docs/stores) sont également disponibles

Pour split, n'oubliez pas [konfig](https://github.com/corneliusweig/konfig). Par exemplep pour notre context tools

```bash
konfig split tools > tools.yaml
```

## Voir aussi

* [Outils pour K8s](tools.md) - kubectx, kubeswitch et konfig pour gérer plusieurs clusters
