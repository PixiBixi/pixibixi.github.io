# Commandes utiles pour la CLI Azure

Quelques scripts/commandes qui peuvent être utiles pour mieux gérer ses resources Azure

??? note "Lister toutes les instances de tous les AKS de tous les RG"
    ```bash
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

??? note "Compter le nombre de VM par type"
    ```bash
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
