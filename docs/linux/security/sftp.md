# Accès sécurisé via sFTP (Chroot SSH)

## Introduction

Si on vous demande un serveur FTP, mais que vous ne n'avez pas envie
d'en installer un, il se peut alors que le SFTP soit alors la solution
pour vous.

A ne surtout pas confondre avec le FTPS (également appeler FTPES) car
celui-ci se repose sur un daemon FTP, alors que SFTP se repose sur le
daemon SSH.

2 types de chroot sont possible, le chroot SFTP, et le chroot SSH

-   Dans le chroot SFTP, vous aurez également les mêmes droits qu'avec
    un serveur FTP
-   Dans le chroot SSH, il s'agit alors d'un environnement SSH
    classique, cependant, l'accès aux différents fichiers/binaires
    système peut être limité par l'administrateur de la machine

## SFTP

Pour le SFTP, nous devons appliquer des droits spéciaux sur le folder à
chroot (Généralement, on chroot un user dans son home directory), mais
nous devons également modifier le sshd_config

```bash
Subsystem sftp internal-sftp
Match user jeremy
    ChrootDirectory %h
```

Dans notre exemple, l'utilisateur *jeremy* sera chroot dans son home
directory. Mais si nous faisons que cela, le chroot ne marchera pas.

```bash
$ chown -R jeremy:jeremy /home/jeremy
$ chown root:root /home/jeremy
$ chmod 755 /home/jeremy
```

Et on redémarre OpenSSH

```bash
$ systemctl try-restart sshd
```
