---
description: Déployer une stack mail complète avec Postfix, Dovecot et rspamd via Docker Compose
tags:
  - Mail
  - SMTP
---

# Serveur mail Postfix/Dovecot/rspamd/DKIM sous Docker

Lorsque j'ai commencé cet article, je voulais faire un tutoriel pour
installer de A à Z son serveur mail avec rspamd, du DKIM...

Depuis ce temps, je suis passé à Docker. Mon cher collègue Hardware a fait une magnifique image Docker qui nous permettait d'obtenir un 10/10 à mail-tester, alors pourquoi se priver ?

!!! danger "Stack abandonnée, à ne plus déployer"
    `hardware/mailserver`, `hardware/postfixadmin` et `hardware/rainloop` sont archivés et marqués UNMAINTAINED depuis 2019-2020, RainLoop lui-même est archivé (dernière release v1.17.0 en août 2022) et `redis:4.0` n'a plus eu de release depuis 2019. Un serveur SMTP/IMAP exposé sur Internet sans correctifs de sécurité est un vrai risque. Pour un nouveau serveur, on part sur une stack maintenue comme [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver), avec [SnappyMail](https://github.com/the-djmaze/snappymail) ou Roundcube en webmail. Le compose ci-dessous reste à titre historique.

Quelle que soit l'image, le score mail-tester dépend surtout du DNS : PTR, SPF, DKIM et DMARC. Depuis février 2024, Gmail exige les 3 (SPF, DKIM et DMARC) des expéditeurs de plus de 5 000 mails par jour. La clé DKIM est générée par le serveur mail, SPF et DMARC sont 2 enregistrements TXT :

```text
domain.tld.         IN TXT "v=spf1 mx -all"
_dmarc.domain.tld.  IN TXT "v=DMARC1; p=quarantine; rua=mailto:postmaster@domain.tld"
```

Le compose d'origine :

```yaml
  mailserver:
    image: hardware/mailserver:1.1-stable
    container_name: mailserver
    restart: unless-stopped
    domainname: domain.tld  # Mail server A/MX/FQDN & reverse PTR = mail.domain.tld.
    hostname: mail
    ports:
      - "25:25"       # SMTP                - Required
      - "143:143"     # IMAP       STARTTLS - Optional - For webmails/desktop clients
      - "587:587"     # Submission STARTTLS - Optional - For webmails/desktop clients
      - "993:993"     # IMAPS      SSL/TLS  - Optional - For webmails/desktop clients
      - "4190:4190"   # SIEVE      STARTTLS - Optional - Recommended for mail filtering
    environment:
      - REDIS_HOST=redis_mailserver
      - DBHOST=db_mailserver
      - DBUSER=postfix
      - DBPASS=$DB_PASS
      - RSPAMD_PASSWORD=$RSPAMD_PASS
      - VIRTUAL_HOST=spam.domain.tld
      - VIRTUAL_PORT=11334
      - LETSENCRYPT_HOST=spam.domain.tld
      - LETSENCRYPT_EMAIL=admin@domain.tld
    volumes:
      - /home/USER/.apps/mailserver/mail:/var/mail
    depends_on:
      - db_mailserver
      - redis_mailserver

  # Configuration : https://github.com/hardware/mailserver/wiki/Postfixadmin-initial-configuration
  postfixadmin:
    image: hardware/postfixadmin
    container_name: postfixadmin
    restart: unless-stopped
    domainname: domain.tld
    hostname: mail
    environment:
      - DBHOST=db_mailserver
      - DBPASS=$DB_PASS
      - VIRTUAL_HOST=postfixadmin.domain.tld
      - VIRTUAL_PORT=8888
      - LETSENCRYPT_HOST=postfixadmin.domain.tld
      - LETSENCRYPT_EMAIL=admin@domain.tld
      - UID=100$UID
      - GID=100$UID
    depends_on:
      - mailserver
      - db_mailserver

  rainloop:
    image: hardware/rainloop
    container_name: rainloop
    restart: unless-stopped
    environment:
      - VIRTUAL_PORT=8888
      - VIRTUAL_HOST=webmail.domain.tld
      - LETSENCRYPT_HOST=webmail.domain.tld
      - LETSENCRYPT_EMAIL=admin@domain.tld
    volumes:
      - /home/USER/.apps/mailserver/rainloop:/rainloop/data
    depends_on:
      - mailserver
      - db_mailserver

  # Database
  db_mailserver:
    image: webhippie/mariadb
    container_name: db_mailserver
    restart: unless-stopped
    environment:
      - MARIADB_ROOT_PASSWORD=$ROOT_PASS
      - MARIADB_DATABASE=postfix
      - MARIADB_USERNAME=postfix
      - MARIADB_PASSWORD=$DB_PASS
    volumes:
      - /home/USER/.apps/mailserver/mysql/db:/var/lib/mysql

  # Database
  redis_mailserver:
    image: redis:4.0-alpine
    container_name: redis_mailserver
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - /home/USER/.apps/mailserver/redis/db:/data
```
