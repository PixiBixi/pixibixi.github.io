# EphemeralDisks : comment faire ?

Les EphemeralDisks sur Azure peuvent être pratiques pour économiser de l'argent sur les VMs Spots.

Attention, tous les SKU ne sont pas compatibles avec les EphemeralDisks. Pour savoir si votre gamme l'est :

```bash
az vm list-skus --location westeurope --size d4as
      {
        "name": "EphemeralOSDiskSupported",
        "value": "False"
      },
```

Ici, notre gamme n'est pas compatible.

Les gammes compatibles contiennent un d dans leur gabarit, par exemple les d4a**d*s (quelque soit la génération)

```bash
az vm list-skus --location westeurope --size d4ads_v5
      {
        "name": "EphemeralOSDiskSupported",
        "value": "True"
      },
```
