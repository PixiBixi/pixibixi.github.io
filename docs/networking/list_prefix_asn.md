# Lister les préfixes annoncés par un AS

Il peut être utile pour scripter ou autre de lister tous les préfixes
annoncés par un ASN

``` bash
AS=3215
whois -h asn.shadowserver.org "prefix $AS"
```

Nous retournera tous les préfixes annoncés par 3215 (Orange)
