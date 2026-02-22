---
description: Générer et configurer les clés DKIM pour signer les emails sortants avec Exim
---

# Configurer DKIM avec Exim

Pour configurer DKIM avec Exim, on s'emmerde pas, j'ai écris un petit
script pour faire ça

```bash
CUSTOMER=ei
TYPE=prod
SELECTOR=${TYPE}-${CUSTOMER}


openssl genrsa -out ${SELECTOR}.dkim.pkey.pem 1024
openssl rsa -in ${SELECTOR}.dkim.pkey.pem -out ${SELECTOR}.dkim.pem -pubout
command sed -i -e /ifdef DKIM_DOMAIN/i'
.ifndef DKIM_DOMAIN'
dkim_domain = ${if match_domain{$sender_address_domain}{+local_domains} {$sender_address_domain} { '''
    ${if match_domain{$sender_address_domain}{+cyrus_all_domains} {$sender_address_domain}  {}} '''
  }}'
.endif /etc/exim4/conf.d/transport/30_exim4-config_remote_smtp


PUBLIC_KEY="$(command cat "${SELECTOR}.dkim.pem"|grep -v ''-|tr -d \n)"
command echo "# Dkim configuration for server with selector {$SELECTOR}.

_asp._domainkey IN TXT '"dkim=all'"
_adsp._domainkey IN TXT '"dkim=all'"
_domainkey IN TXT '"t=y; o=-;'"

${SELECTOR}._domainkey 1 IN TXT '"v=DKIM1; k=rsa; p=${PUBLIC_KEY};'"
"   Yes
```

Et côté exim, ça se configure comme ça :

```bash
### main/02_exim4-config_dkim
#################################

# The signing method for DKIM
DKIM_CANON = relaxed

# Domain for which DKIM signing is used.
# This option must be unset if multiple domains are handled by this server.
DKIM_DOMAIN = ${sender_address_domain}

# private key used for DKIM.
DKIM_PRIVATE_KEY = /etc/exim4/keys/prod-ei.dkim.pkey.pem

# DKIM selector, guessed from the DKIM private key file extension.
DKIM_SELECTOR = prod-ei

# Avoid message is too big error
IGNORE_SMTP_LINE_LENGTH_LIMIT=1
```

Puis côté DNS, ça nous donne ce genre de record :

```bind
    preprod-df._domainkey.dpfsol.net.   120 IN  TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDF2DawbF8KlxduaXU0GHp/VMTXPyhYvAr9/zWs6u3AqpktH4/+7u66BOf3NJvEmsuJezjwpYA8YmyJ4aRyRkOqeB+k1FeMadWtCkcy/LpBGkBbBCvb3QPDZRP85oiOR9Lt4Oo5/m+YKbwYkEIAe/5yHDMlXZ3NGEMDzalHbAcdRwIDAQAB;"
```
