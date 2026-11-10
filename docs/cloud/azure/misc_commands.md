---
description: Commandes utiles pour la CLI Azure - gestion des ressources, AKS, réseau et identités
tags:
  - Azure
  - CLI
---

# Commandes utiles pour la CLI Azure

Quelques scripts/commandes qui peuvent être utiles pour mieux gérer ses resources Azure

Les 2 scripts ci-dessous passent par `az aks list`, qui ne voit que la subscription active (`az account show`). Sur un tenant avec plusieurs subscriptions, on fait un `az account set -s <id>` avant chaque run, ou on passe par [Azure Resource Graph](#tous-les-aks-de-toutes-les-subscriptions-avec-resource-graph) qui couvre toutes les subscriptions d'un coup.

```bash title="Lister tous les nodepools de tous les AKS de la subscription active"
#!/bin/bash

output_file="aks_vm_sizes.csv"
echo "ResourceGroup,ClusterName,ClusterStatus,NodepoolName,VMSize,Location,NodeCount,IsSpot" > "$output_file"

# Liste tous les clusters AKS
az aks list --query '[].{name:name, resourceGroup:resourceGroup, location:location, status:powerState.code}' -o json | jq -c '.[]' | while read -r cluster; do
    name=$(echo "$cluster" | jq -r '.name')
    rg=$(echo "$cluster" | jq -r '.resourceGroup')
    location=$(echo "$cluster" | jq -r '.location')
    status=$(echo "$cluster" | jq -r '.status') # Running or Stopped

    # Liste les nodepools pour ce cluster
    az aks nodepool list \
        --cluster-name "$name" \
        --resource-group "$rg" \
        --query '[].{name:name, vmSize:vmSize, count:count, priority:scaleSetPriority}' -o json | jq -c '.[]' | while read -r pool; do

        pool_name=$(echo "$pool" | jq -r '.name')
        vm_size=$(echo "$pool" | jq -r '.vmSize')
        count=$(echo "$pool" | jq -r '.count')
        priority=$(echo "$pool" | jq -r '.priority')

        if [[ "$priority" == "Spot" ]]; then
            is_spot="true"
        else
            is_spot="false"
        fi

        echo "$rg,$name,$status,$pool_name,$vm_size,$location,$count,$is_spot" >> "$output_file"
    done
done

echo "✅ CSV détaillé généré : $output_file"
```

Nous donne un csv listant tout de ce genre :

```csv
ResourceGroup,ClusterName,ClusterStatus,NodepoolName,VMSize,Location,NodeCount,IsSpot
service-rg,service,Running,default,Standard_D4s_v3,westeurope,17,false
service-rg,service,Running,espool,Standard_D4as_v5,westeurope,0,true
```

```bash title="Compter le nombre de VM par type"
#!/bin/bash

# Fichier temporaire pour collecter les VMSize et counts
tmp_file=$(mktemp)

# Fichier de sortie
output_file="aks_vm_summary.csv"

# Header CSV
echo "VMSize,TotalNodeCount" > "$output_file"

# Liste des clusters AKS
az aks list --query '[].{name:name, resourceGroup:resourceGroup}' -o json | jq -c '.[]' | while read -r cluster; do
    name=$(echo "$cluster" | jq -r '.name')
    rg=$(echo "$cluster" | jq -r '.resourceGroup')

    # Pour chaque nodepool, on récupère la taille et le nombre de nœuds
    az aks nodepool list --cluster-name "$name" --resource-group "$rg" --query '[].{vmSize:vmSize, count:count}' -o json | jq -c '.[]' | while read -r pool; do
        vm_size=$(echo "$pool" | jq -r '.vmSize')
        count=$(echo "$pool" | jq -r '.count')
        echo "$vm_size,$count" >> "$tmp_file"
    done
done

# Agrégation et export CSV
awk -F',' '{count[$1]+=$2} END {for (vm in count) print vm "," count[vm]}' "$tmp_file" | sort >> "$output_file"

# Nettoyage
rm "$tmp_file"

echo "✅ Résumé CSV généré : $output_file"
```

Ne prends pas en compte s'il s'agit de VM Spot ou Regular

Exemple output :

```csv
VMSize,TotalNodeCount
Standard_D16ads_v6,2
Standard_D2s_v5,6
```

## Tous les AKS de toutes les subscriptions avec Resource Graph

Plutôt que de boucler sur les clusters puis les nodepools, une seule requête Azure Resource Graph lit les `agentPoolProfiles` de tous les clusters, sur toutes les subscriptions auxquelles on a accès. Il faut l'extension `resource-graph` :

```bash
az extension add --name resource-graph
```

Même CSV que le premier script, en une requête :

```bash title="Nodepools de tous les AKS, toutes subscriptions"
echo "ResourceGroup,ClusterName,ClusterStatus,NodepoolName,VMSize,Location,NodeCount,IsSpot" > aks_vm_sizes.csv
az graph query --first 1000 -o json -q "
  resources
  | where type =~ 'microsoft.containerservice/managedclusters'
  | mv-expand pool = properties.agentPoolProfiles
  | project resourceGroup, name, status = tostring(properties.powerState.code),
      pool = tostring(pool.name), vmSize = tostring(pool.vmSize), location,
      count = toint(pool['count']),
      isSpot = iff(tostring(pool.scaleSetPriority) == 'Spot', 'true', 'false')
  | order by resourceGroup asc, name asc" \
  | jq -r '.data[] | [.resourceGroup, .name, .status, .pool, .vmSize, .location, .count, .isSpot] | map(tostring) | join(",")' \
  >> aks_vm_sizes.csv
```

Et le total de nodes par type de VM :

```bash title="Compter le nombre de VM par type, toutes subscriptions"
az graph query -o json -q "
  resources
  | where type =~ 'microsoft.containerservice/managedclusters'
  | mv-expand pool = properties.agentPoolProfiles
  | summarize TotalNodeCount = sum(toint(pool['count'])) by VMSize = tostring(pool.vmSize)
  | order by VMSize asc" \
  | jq -r '.data[] | "\(.VMSize),\(.TotalNodeCount)"'
```
