---
description: "Signer les emails sortants avec DKIM sous Exim (Debian exim4) : clé RSA 2048, record TXT découpé, macros DKIM_*, signature sur le domaine du From et DMARC"
tags:
  - Exim
  - DKIM
  - DMARC
  - Mail
tested_with:
  - "Exim 4.98 (Debian 13)"
variables:
  - name: domain
    default: example.com
  - name: selector
    default: s2026
---

# Configurer DKIM avec Exim

Sans DKIM, Gmail et consorts rangent vite nos mails en spam. Avec Exim, c'est une clé, un record DNS et 4 macros.

Les macros `DKIM_*` sont celles du paquet Debian `exim4`, qui les branche sur le transport `remote_smtp`. Sur un Exim upstream, on pose directement `dkim_domain`, `dkim_selector`, `dkim_private_key` et `dkim_canon` sur le transport SMTP.

## Générer la clé

On génère une clé RSA 2048 bits, une par domaine et par sélecteur. 1024 bits est le minimum toléré par la RFC 8301, plus la recommandation. Le sélecteur est daté pour pouvoir faire tourner la clé plus tard sans casser les mails en transit :

```bash
mkdir -p /etc/exim4/dkim
openssl genrsa -out /etc/exim4/dkim/<domain>.<selector>.pem 2048
chown root:Debian-exim /etc/exim4/dkim/<domain>.<selector>.pem
chmod 640 /etc/exim4/dkim/<domain>.<selector>.pem
```

## Publier la clé publique

Une clé 2048 bits dépasse les 255 caractères d'une chaîne TXT : il faut découper la valeur en plusieurs chaînes, que le résolveur recolle. La plupart des interfaces DNS le font seules, pour un fichier de zone BIND on génère le record directement :

```bash
PUB=$(openssl pkey -in /etc/exim4/dkim/<domain>.<selector>.pem -pubout -outform DER | base64 -w0)
echo "<selector>._domainkey.<domain>. 3600 IN TXT ( \"v=DKIM1; k=rsa; p=\" $(echo "$PUB" | fold -w 250 | sed 's/.*/"&"/' | tr '\n' ' '))"
```

Ce qui donne ce genre de record :

```bind
s2026._domainkey.example.com. 3600 IN TXT ( "v=DKIM1; k=rsa; p=" "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArCc13vRZ3WkDgnkVoLrTl454sFUb..." "...0B72XATYpgNN2GHwIDAQAB" )
```

On ne publie rien d'autre côté DKIM : les vieux `_domainkey IN TXT "t=y; o=-;"` (DomainKeys) et `_adsp._domainkey` (ADSP, passé Historic) ne sont plus lus par personne. Et pas de `t=y` sur le record en prod : il déclare le domaine en test, et un receveur traite alors le mail comme s'il n'était pas signé.

On vérifie la publication :

```bash
dig +short TXT <selector>._domainkey.<domain>
```

## Configurer Exim

On signe avec le domaine du header `From`, pas celui de l'enveloppe (`$sender_address_domain`) : c'est le `From` que DMARC compare à la signature. La clé est cherchée d'après le domaine et le sélecteur. Si elle n'existe pas, `DKIM_PRIVATE_KEY` vaut `0` et le mail part sans signature, sans erreur : le même fichier sert pour tous les domaines du serveur.

En config split (`dc_use_split_config='true'` dans `/etc/exim4/update-exim4.conf.conf`), les macros vont dans un fichier lu avant le transport, `/etc/exim4/conf.d/main/000_localmacros`. En config non split, dans `/etc/exim4/exim4.conf.localmacros` :

```text title="/etc/exim4/conf.d/main/000_localmacros"
DKIM_CANON = relaxed
DKIM_DOMAIN = ${lc:${domain:$h_from:}}
DKIM_SELECTOR = <selector>
DKIM_PRIVATE_KEY = ${lookup{$dkim_domain.$dkim_selector.pem}dsearch,filter=file,ret=full{/etc/exim4/dkim}{$value}{0}}
```

Le `dsearch` n'est pas là pour faire joli. Le domaine vient du header `From`, donc du client : Exim le marque « tainted » (depuis la 4.94) et refuse d'ouvrir un fichier dont le chemin en est construit. Avec un simple `/etc/exim4/dkim/$dkim_domain.pem`, le log affiche `Tainted filename` et le mail part **sans signature**, sans erreur. Le chemin renvoyé par `dsearch` vient du disque, il est sûr.

`DKIM_SELECTOR` est obligatoire : Exim ne le déduit pas du nom de la clé, et vide, il désactive la signature sans rien dire.

On régénère la config et on vérifie que le transport a bien pris les options :

```bash
update-exim4.conf
systemctl restart exim4
exim4 -bP transport remote_smtp | grep dkim
```

Reste à envoyer un mail vers une boîte Gmail et à chercher `dkim=pass header.d=<domain>` dans l'en-tête `Authentication-Results` du message reçu.

## Lignes de plus de 998 caractères

La config Debian refuse en entrée tout mail dont une ligne dépasse 998 octets (`maximum allowed line length is 998 octets`), la limite SMTP. Certaines applis génèrent du HTML sur une seule ligne. Pour les laisser passer, en entrée comme en sortie, on ajoute dans le même fichier :

```text
IGNORE_SMTP_LINE_LENGTH_LIMIT = 1
```

## Ajouter DMARC

DKIM seul ne dit pas au receveur quoi faire d'un mail non signé. C'est le rôle de DMARC, que Gmail et Yahoo exigent pour les gros expéditeurs depuis 2024. On commence en `p=none` pour recevoir les rapports sans rien bloquer, puis on passe en `quarantine` puis `reject` une fois que tous les flux sont signés :

```bind
_dmarc.<domain>. 3600 IN TXT "v=DMARC1; p=none; rua=mailto:dmarc@<domain>"
```

## Faire tourner la clé

On génère une clé avec un nouveau sélecteur, on publie son record, on attend la propagation, puis on change `DKIM_SELECTOR`. L'ancien record reste publié quelques jours, le temps que les mails déjà en file soient vérifiés.

Exim sait aussi signer 2 fois, en Ed25519 et en RSA : la spec d'Exim conseille de garder la RSA à côté, Ed25519 étant récente. La clé Ed25519 a son propre sélecteur, et son record publie la clé brute (`k=ed25519`), pas le DER complet :

```bash
openssl genpkey -algorithm ed25519 -out /etc/exim4/dkim/<domain>.<selector>-ed.pem
PUB=$(openssl pkey -outform DER -pubout -in /etc/exim4/dkim/<domain>.<selector>-ed.pem | tail -c +13 | base64)
echo "<selector>-ed._domainkey.<domain>. 3600 IN TXT \"v=DKIM1; k=ed25519; p=$PUB\""
```

Puis on liste les 2 sélecteurs, `DKIM_PRIVATE_KEY` trouve chaque clé grâce à `$dkim_selector` :

```text
DKIM_SELECTOR = <selector>-ed : <selector>
```
