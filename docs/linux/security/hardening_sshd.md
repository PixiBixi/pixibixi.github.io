---
description: Hardening du serveur SSH sous Linux - désactiver l'authentification par mot de passe, restreindre les accès et sécuriser sshd_config.
tags:
  - SSH
  - Hardening
---

# Hardening simple du serveur SSH

## sshd_config

Par défaut, un serveur SSH est configuré de telle manière à être plutôt laxiste en termes de sécurité et un peu trop souple à notre goût. Il existe différentes manières de rendre un serveur plus ou moins sécurisé, on se contente ici des moyens simples et rapides.

Ce guide vise OpenSSH 9.6 ou plus récent : Debian 13 livre la 10.0, Ubuntu 24.04 la 9.6. Les options qui demandent une version plus récente l'indiquent.

### Où écrire la config

On ne modifie pas `/etc/ssh/sshd_config` directement : sur Debian et Ubuntu, il commence par `Include /etc/ssh/sshd_config.d/*.conf`. Pour chaque option, sshd garde **la première valeur lue**, donc un fichier comme `50-cloud-init.conf` qui contient `PasswordAuthentication yes` l'emporte sur ce qu'on écrit plus bas dans `sshd_config`. On met son hardening dans un fichier qui passe en premier :

```bash
sudoedit /etc/ssh/sshd_config.d/00-hardening.conf
```

Avant chaque restart, on valide la syntaxe puis on relit la config effective, celle que sshd appliquera vraiment :

```bash
sudo sshd -t
sudo sshd -T | grep -Ei 'passwordauthentication|permitrootlogin|authenticationmethods'
```

On garde aussi une session SSH ouverte pendant le restart : une erreur de config ne coupe pas les sessions existantes. On peut alors corriger depuis celle-ci.

### Authentification

Le paramètre le plus important lors d'une attaque est le type de connexion SSH. Tant que possible, il est **nécessaire** de désactiver les connexions par password :

```bash
AuthenticationMethods publickey
PasswordAuthentication no
KbdInteractiveAuthentication no
```

`AuthenticationMethods publickey` suffit à refuser le password, mais les 2 autres lignes rendent l'intention lisible dans `sshd -T`. `KbdInteractiveAuthentication` remplace `ChallengeResponseAuthentication`, qui n'est plus qu'un alias.

Dans les anciennes versions d'OpenSSH, la connexion en root était autorisée en password. Depuis OpenSSH 7.0, le défaut est `prohibit-password` : root ne se connecte que par clef. Il est tout de même conseillé de refuser explicitement toute connexion à l'utilisateur root :

```bash
PermitRootLogin no
```

### Bannière et délais

Par défaut, lors d'une connexion SSH, Debian renvoie sa version ainsi que la version du serveur OpenSSH utilisée :

```text
remote software version OpenSSH_7.9p1 Debian-10+deb10u2
```

L'option `DebianBanner`, propre au patch Debian, retire le suffixe Debian. La version d'OpenSSH (`OpenSSH_10.0p1`) reste annoncée, il est impossible de la masquer sans recompiler :

```bash
DebianBanner no
```

Par défaut, on a 2 minutes (120s) pour s'authentifier une fois connecté. Cette valeur est inutilement longue. Elle est contrôlée par la directive `LoginGraceTime`, on la passe à 30s :

```bash
LoginGraceTime 30
```

Si on oublie de verrouiller son poste avec des connexions SSH ouvertes, il peut être intéressant de couper automatiquement les sessions inactives. `ClientAliveInterval` et `ClientAliveCountMax` ne servent **pas** à ça : ils détectent un client mort (réseau coupé, laptop en veille). Un client vivant répond aux keepalives, sa session n'est jamais coupée. Et depuis OpenSSH 8.2, `ClientAliveCountMax 0` désactive même la déconnexion.

Pour un vrai timeout d'inactivité, on utilise `ChannelTimeout` (OpenSSH 9.2+). Ici, une session interactive sans trafic pendant 15 minutes est fermée :

```bash
ChannelTimeout session=15m
```

On peut garder en plus la détection des clients morts, ici au bout de 3 keepalives sans réponse espacés de 60s :

```bash
ClientAliveInterval 60
ClientAliveCountMax 3
```

Côté shell, `TMOUT=900` dans `/etc/profile.d/` fait le même travail pour bash, mais l'utilisateur peut le désactiver lui-même.

### Chiffrement

Une fois l'utilisateur authentifié, on doit s'assurer que le canal de communication est correctement chiffré. Les vieux guides (dont celui de Mozilla) recommandaient de surcharger `KexAlgorithms`, `Ciphers` et `MACs`. Sur OpenSSH 9.6+, c'est contre-productif : les défauts sont meilleurs que ces listes. Le KEX par défaut est post-quantique (`mlkem768x25519-sha256` depuis la 10.0, `sntrup761x25519-sha512` avant). Le strict KEX contre Terrapin est actif lui aussi. Une liste figée dans la config bloque ces évolutions aux prochaines mises à jour.

On garde donc les défauts et on vérifie ce qui est réellement proposé. Pour savoir quels algorithmes sont disponibles dans sa version d'OpenSSH, on peut utiliser les commandes suivantes :

```bash
ssh -Q cipher
ssh -Q cipher-auth
ssh -Q mac
ssh -Q kex
ssh -Q key
```

L'outil [ssh-audit](https://github.com/jtesta/ssh-audit) liste ce que le serveur annonce et signale ce qui est faible. Son [guide de hardening](https://www.sshaudit.com/hardening_guides.html) donne, par distribution, les algorithmes à retirer si l'on veut aller plus loin.

### Limiter le brute force

Depuis OpenSSH 9.8, `PerSourcePenalties` est actif par défaut : sshd bloque temporairement une adresse source qui échoue à s'authentifier ou fait crasher la phase de pré-authentification. C'est un fail2ban intégré, il n'y a rien à configurer. On le vérifie avec `sshd -T | grep -i persourcepenalties`.

L'ancienne directive `UsePrivilegeSeparation sandbox` des vieux guides est à **supprimer** : la sandbox est obligatoire depuis OpenSSH 7.5. À partir de la 10.4, l'option n'est plus reconnue. sshd refuse alors de démarrer avec `Bad configuration option`.

### Avancé

Par défaut, peu d'informations sont loguées. Une information pouvant être utile est la fingerprint de la clé utilisée, on passe donc le LogLevel à verbose :

```bash
LogLevel VERBOSE
```

Il est également possible de logger les actions effectuées en SFTP. `internal-sftp` marche sur toutes les distributions, alors que le chemin de `sftp-server` change (`/usr/lib/openssh/sftp-server` sur Debian et Ubuntu, `/usr/lib/ssh/sftp-server` sur Arch) :

```bash
Subsystem sftp internal-sftp -f AUTHPRIV -l INFO
```

Pour une sécurisation encore plus poussée, on peut ajouter un second facteur. Le plus simple est une clé FIDO2 (YubiKey...) : une clé `ed25519-sk` générée avec `ssh-keygen -t ed25519-sk -O verify-required` exige la présence physique de la clé et son PIN, sans module PAM côté serveur. Le 2FA par TOTP via PAM reste possible, mais devient vite contraignant si on se connecte et déconnecte souvent.

Dans le cas où on utilise un serveur intermédiaire pour se connecter à ses serveurs (bastion), on peut n'autoriser le login qu'à partir des IPs de ces derniers. La forme `user@host` n'existe que pour `AllowUsers` :

```bash
AllowUsers admin@1.2.3.4 admin@10.20.30.40
```

`AllowGroups` n'accepte que des noms de groupe : `AllowGroups admin@1.2.3.4` cherche un groupe nommé littéralement `admin@1.2.3.4` et refuse tout le monde. Pour filtrer un groupe par adresse source, on passe par un bloc `Match`, placé en fin de fichier. Ici, le groupe `admin` est refusé depuis toute adresse autre que les 2 bastions :

```bash
Match Address *,!1.2.3.4,!10.20.30.40
    DenyGroups admin
```

Avant d'appliquer un filtrage d'accès, on teste la règle avec `sshd -T -C user=admin,host=bastion,addr=1.2.3.4` : une erreur ici verrouille l'accès au serveur.

Les variables d'environnement peuvent être définies par l'utilisateur via `~/.ssh/environment` ou l'option `environment=` d'une clef dans `authorized_keys`. Elles peuvent très largement altérer le comportement de certains programmes (LD_PRELOAD, LD_LIBRARY_PATH...). `PermitUserEnvironment no` l'interdit, c'est déjà la valeur par défaut, on peut l'écrire pour que ce soit explicite :

```bash
PermitUserEnvironment no
```

Toutefois, les variables envoyées par le client et listées dans la directive `AcceptEnv` restent modifiables.

## authorized_keys

Beaucoup d'options sont également possibles au niveau du fichier *authorized_keys* :

* `no-agent-forwarding` : désactivation du SSH agent forwarding
* `no-port-forwarding` : désactivation du SSH port forwarding
* `no-X11-forwarding` : désactivation du X11 display forwarding
* `no-pty` : empêche l'allocation d'un terminal. Ça ne bloque **pas** l'exécution de commandes : `ssh host bash -i` ou n'importe quelle commande passe toujours. Pour bloquer le shell, on utilise `restrict` avec `command=`
* `no-user-rc` : empêche l'interprétation du fichier ~/.ssh/rc

Par défaut, tout est autorisé. Cependant, une autre approche est possible via le keyword `restrict`, qui refuse implicitement toutes les options SSH. Par exemple, si on souhaite tout de même autoriser l'agent forwarding :

```bash
restrict,agent-forwarding ecdsa-sha2-nistp521 AAAAE
```

Il est également possible de forcer une commande lors de la connexion avec une clef spécifique :

```bash
command="/usr/local/bin/backup" ecdsa-sha2-nistp521 AAAAE
```

Une option plutôt pratique via ce fichier authorized_keys est de limiter une clef précise au SFTP. La commande forcée remplace aussi le subsystem demandé par le client, il faut donc forcer `internal-sftp` lui-même (un `command="false"` ferait échouer le SFTP aussi) :

```bash
restrict,command="internal-sftp" ecdsa-sha2-nistp521 AAAAE
```

Avec cette clef, on n'a droit qu'au SFTP, sans shell ni forwarding. Sans `ChrootDirectory` dans sshd_config, l'utilisateur voit toutefois tout le filesystem que ses droits Unix lui permettent de lire, pas seulement ses répertoires.

Il est également possible de limiter la connexion via sa clef à certaines machines, option une nouvelle fois utile lors de l'utilisation d'un bastion :

```bash
from="1.2.3.4,10.20.30.40" ecdsa-sha2-nistp521 AAAAE
```

Pour gérer des dizaines de serveurs, les certificats SSH (`TrustedUserCAKeys`) évitent de distribuer chaque clef dans chaque `authorized_keys` : une CA signe les clefs, avec une durée de validité.

## Entrées SSHFP

En outre, on peut publier les fingerprints des clés du serveur dans des entrées DNS SSHFP. ssh, configuré avec `VerifyHostKeyDNS yes`, les compare à la clé présentée par le serveur. La confiance automatique, sans question sur la fingerprint, n'existe que si la réponse DNS est validée par **DNSSEC** : zone signée et resolver validant (avec glibc, il faut aussi `options trust-ad` dans `/etc/resolv.conf`). Sans DNSSEC, ssh se comporte comme avec `VerifyHostKeyDNS ask` et pose la question habituelle.

Si SSHFP est correctement configuré, on obtient cette entrée en `ssh -v` :

```text
debug1: matching host key fingerprint found in DNS
```

Pour générer ses entrées SSHFP, on lance `ssh-keygen -r` **sur le serveur lui-même** : sans `-f`, il lit les clés d'hôte locales (`/etc/ssh/ssh_host_*`) et les imprime sous le nom donné en argument :

```bash
ssh-keygen -r "$(hostname -f)"
```

Depuis un autre poste, `ssh-keyscan -D` récupère les clés présentées par le serveur et les sort au format SSHFP. On vérifie alors la fingerprint par un autre canal avant de publier :

```bash
ssh-keyscan -D -p 22 serveur.example.com
```
