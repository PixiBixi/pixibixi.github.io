# Uploader ses ISO en ligne de commande

Pour télécharger directement des ISO en ligne de commande, tout
d'abord, nous devons activer l'accès à distance SSH.

Une fois connecté en SSH, nous listons nos différents Datastore

``` bash
[root@sd-138937:~] ls /vmfs/volumes/
175cbc75-2791da45-30ab-7f5251c2304f  5e94e6de-1a29e44a-0b7d-a81e84f120ab  5e94f09f-c5361e02-1601-a81e84f120ab  datastore1
5e94e6b0-a3e573e4-89f5-a81e84f120ab  5e94e6de-fe55fd96-82de-a81e84f120ab  SSD                                  e9156572-a7b7f9e4-723f-31781f79407c
```

Une fois choisis le datastore, nous lançons le téléchargement

``` bash
[root@sd-138937:/vmfs/volumes] wget http://ftp.rezopole.net/centos/7.7.1908/isos/x86_64/CentOS-7-x86_64-NetInstall-1908.iso
```
