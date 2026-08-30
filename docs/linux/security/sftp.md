---
description: Chrooter un utilisateur avec OpenSSH, en SFTP avec internal-sftp et en SSH avec un vrai jail monté à la main ou avec jailkit.
tags:
  - SFTP
  - SSH
---

# Chrooter un utilisateur en SFTP ou en SSH

Si on nous demande un serveur FTP mais qu'on n'a pas envie d'en installer un, le SFTP est souvent la bonne réponse.

À ne surtout pas confondre avec le FTPS (également appelé FTPES) : le FTPS se repose sur un daemon FTP, alors que SFTP se repose sur le daemon SSH.

2 types de chroot sont possibles :

* Dans le chroot SFTP, on a les mêmes droits qu'avec un serveur FTP classique
* Dans le chroot SSH, il s'agit d'un environnement SSH classique, mais l'accès aux différents fichiers/binaires système peut être limité par l'administrateur

## Chroot SFTP

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

`internal-sftp` est implémenté dans le process sshd lui-même, donc il n'a besoin d'aucun binaire ni d'aucune lib dans le répertoire chrooté. C'est toute la différence avec la suite : dès qu'on veut un shell, il faut peupler le jail.

## Monter un jail SSH à la main

Ici l'utilisateur ouvre une vraie session interactive, mais il ne voit qu'une poignée de commandes et rien du reste du système. OpenSSH fait le `chroot()`, il ne remplit pas le répertoire : tout ce dont le shell a besoin doit y être copié, sinon la connexion se ferme immédiatement.

On commence par le squelette. La racine du jail appartient à root et n'est pas writable par l'utilisateur, c'est une exigence d'OpenSSH et elle vaut aussi pour tous les répertoires parents :

```bash
jail=/srv/jail
mkdir -p "$jail"/{bin,dev,etc,lib,usr,home/jeremy}
chown root:root "$jail"
chmod 755 "$jail"
chown jeremy:jeremy "$jail/home/jeremy"
```

Bash a besoin de quelques devices, sans quoi la moindre redirection part en erreur :

```bash
mknod -m 666 "$jail/dev/null"    c 1 3
mknod -m 666 "$jail/dev/zero"    c 1 5
mknod -m 666 "$jail/dev/random"  c 1 8
mknod -m 666 "$jail/dev/urandom" c 1 9
mknod -m 666 "$jail/dev/tty"     c 5 0
```

Ensuite les binaires, avec les libs dont chacun dépend : on les liste avec `ldd` et on recopie tout en gardant l'arborescence d'origine :

```bash
for bin in /bin/bash /bin/ls /bin/cat /bin/mkdir /bin/rm /usr/bin/id /usr/bin/scp; do
    mkdir -p "$jail$(dirname "$bin")"
    cp -f "$bin" "$jail$bin"
    ldd "$bin" | grep -oE '/[^ ]+\.so[^ ]*' | while read -r lib; do
        mkdir -p "$jail$(dirname "$lib")"
        cp -f "$lib" "$jail$lib"
    done
done
```

Il reste à donner un `passwd` et un `group` minimaux, sinon `ls -l` affiche des UID bruts et le prompt bash sort cassé. On ne copie que les lignes concernées, surtout pas les fichiers entiers :

```bash
grep "^jeremy:" /etc/passwd > "$jail/etc/passwd"
grep "^jeremy:" /etc/group  > "$jail/etc/group"
```

Côté `sshd_config`, on chroote sur le jail et non sur `%h`, puisque le home de l'utilisateur vit maintenant à l'intérieur :

```bash title="/etc/ssh/sshd_config"
Match user jeremy
    ChrootDirectory /srv/jail
```

Si on veut aussi le SFTP dans ce jail, `internal-sftp` continue de marcher sans rien copier. En revanche `scp` et `rsync` sont de vrais binaires, ils doivent être présents dans le jail et avec leurs libs.

## Jailkit : le même jail sans le ldd

Recopier les libs à la main tient tant qu'on a 3 commandes, ça devient inmaintenable dès qu'on veut un éditeur et des outils réseau. `jailkit` fait exactement ce travail, et il sait aussi mettre à jour un jail existant :

```bash
apt install jailkit
```

Le projet n'a plus bougé depuis la 2.23 d'octobre 2021 et ça fait hésiter, à raison. Dans les faits il est toujours packagé dans Debian bookworm, trixie et sid. L'upstream répond encore sur les CVE, la dernière note date de mars 2026 : c'est du logiciel fini plutôt que du logiciel mort. Et il n'existe pas vraiment de remplaçant sur ce besoin précis, un shell chrooté sur une machine classique.

Un point à garder en tête quand même, `jk_chrootsh` est setuid root, puisqu'il faut ce privilège pour appeler `chroot()`. C'est un binaire de plus dans la surface d'attaque. Si le besoin réel se limite à du transfert de fichiers, `internal-sftp` fait le travail sans rien installer.

`jk_init` peuple le jail par groupes de commandes prédéfinis, listés dans `/etc/jailkit/jk_init.ini` :

```bash
jk_init -v -j /srv/jail basicshell editors netutils sftp scp
```

`jk_jailuser` déplace ensuite l'utilisateur dans le jail : il recopie sa ligne de `/etc/passwd` dans `/srv/jail/etc/passwd`, déplace son home et remplace son shell par `/usr/sbin/jk_chrootsh` :

```bash
jk_jailuser -m -j /srv/jail jeremy
```

Le shell d'entrée devient `jeremy:x:1000:1000::/srv/jail/./home/jeremy:/usr/sbin/jk_chrootsh`. Le `/./` marque la racine du jail, ce qui suit est le home relatif une fois dedans. Comme c'est `jk_chrootsh` qui fait le `chroot()`, on n'a pas besoin du bloc `Match` dans `sshd_config` : le jail s'applique aussi à une connexion `su` ou `console`, pas seulement à SSH.

Pour ajouter une commande oubliée après coup, `jk_cp` copie le binaire avec ses dépendances :

```bash
jk_cp -v -j /srv/jail /usr/bin/rsync
```

Et le point qu'on oublie systématiquement : les libs du jail sont des copies, elles ne bougent pas quand le système se met à jour. Après un `apt upgrade`, un jail non rafraîchi tourne avec les anciennes libs, failles comprises. `jk_update` resynchronise :

```bash
jk_update -j /srv/jail
```

Un `--dry-run` est disponible pour voir ce qui bougerait avant de le faire.

## Les erreurs qui reviennent

La connexion qui se ferme sans message est le cas normal, tout se passe dans les logs du serveur :

```bash
journalctl -u ssh -f
```

Ce qu'on y lit le plus souvent :

* `fatal: bad ownership or modes for chroot directory` : la racine du jail ou un de ses parents n'est pas `root:root` en `755`. Le `chmod 755` ne suffit pas si `/srv` lui-même est writable par un groupe
* `/bin/bash: No such file or directory` alors que le fichier est bien là : c'est une lib qui manque, pas le binaire. Vérifier avec `chroot /srv/jail /bin/bash` en local, l'erreur est la même mais on peut itérer sans se déconnecter
* pas de prompt et rien dans les logs : `/dev/null` ou `/dev/tty` absents

Le `chroot` local est d'ailleurs le meilleur test avant même de toucher au `sshd_config` :

```bash
chroot /srv/jail /bin/bash
```

## Ce qu'un chroot ne protège pas

!!! warning "Un chroot n'est pas une sandbox"
    C'est un changement de racine, pas une frontière de sécurité. Un utilisateur qui devient root à l'intérieur du jail en sort, c'est documenté et trivial.

Donc pas de binaire setuid dans le jail, et si le jail est sur sa propre partition on la monte en `nosuid,nodev`.

Si l'objectif est de contenir un utilisateur hostile et pas juste de ranger un prestataire dans son coin, le chroot est le mauvais outil : conteneur, VM ou `systemd-nspawn` sont faits pour ça.
