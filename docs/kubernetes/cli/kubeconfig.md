# Manage son '$KUBECONFIG

De base, kubectl va chercher sa configuration dans '~/.kube/config. Il
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
[ ! -d $ADD_KUBECONFIG_FILES ] && mkdir -p "${ADD_KUBECONFIG_FILES}"
OIFS="$IFS"
IFS=$'n
for kubeconfigFile in `find "${ADD_KUBECONFIG_FILES}" -type f -name "*.yml" -o -name "*.yaml"`
do
    export KUBECONFIG="$kubeconfigFile:$KUBECONFIG"
done
IFS="$OIFS"
```

Tous les fichiers dans '~/.kube/config-files et finissant en yml seront
chargés automatiquement ! Free to use avec kubectx o/
