---
description: Configurer un accès SFTP sécurisé avec chroot pour restreindre les utilisateurs à leur répertoire home
tags:
  - SFTP
  - SSH
---

# Accès sécurisé via sFTP (Chroot SSH)

Si on nous demande un serveur FTP mais qu'on n'a pas envie d'en installer un, le SFTP est souvent la bonne réponse.

À ne surtout pas confondre avec le FTPS (également appelé FTPES) : le FTPS se repose sur un daemon FTP, alors que SFTP se repose sur le daemon SSH.

2 types de chroot sont possibles :

* Dans le chroot SFTP, on a les mêmes droits qu'avec un serveur FTP classique
* Dans le chroot SSH, il s'agit d'un environnement SSH classique, mais l'accès aux différents fichiers/binaires système peut être limité par l'administrateur

## SFTP

Pour le SFTP, on doit appliquer des droits spéciaux sur le folder à chroot (généralement, on chroot un user dans son home directory) et modifier le `sshd_config` :

```bash
Subsystem sftp internal-sftp
Match user jeremy
    ChrootDirectory %h
```

Dans cet exemple, l'utilisateur *jeremy* sera chroot dans son home directory. Mais si on fait que ça, le chroot ne marchera pas. Il faut également corriger les droits :

```bash
chown -R jeremy:jeremy /home/jeremy
chown root:root /home/jeremy
chmod 755 /home/jeremy
```

Et on redémarre OpenSSH :

```bash
systemctl try-restart sshd
```
