# Hardening simple du serveur SSH

## sshd_config

Par défaut, un serveur SSH est configuré de tel manière à être plutôt
laxiste en terme de sécurité et être un peu trop souple à notre gout. Il
existe différentes manières de rendre un serveur plus ou moins sécurisé.
Dans cet article, nous allons nous content des moyens simples & rapides
pour rendre notre serveur plus sécurisé.

Attention, ce guide considère que vous ayez une version de OpenSSH
relativement récente, 7.x au minimum

Le paramètre le plus important lors d'une attaque est le type de
connexion SSH. Tant que possible, il est **nécessaire** de désactiver
les connexions par password.

```bash
AuthenticationMethods publickey
```

Dans les anciennes version de OpenSSH, la connexion en root était
autorisée en password. Depuis quelques temps, la connexion est autorisée
par clef uniquement. Il est tout de même conseillé de refuser
explicitement toute connexion à l'utilisateur root.

```bash
PermitRootLogin No
```

Par défaut, lors d'une connexion SSH. Debian renvoie sa version ainsi
que la version du serveur OpenSSH utilisée.

```bash
remote software version OpenSSH_7.9p1 Debian-10+deb10u2
```

Pour désactiver ce comportement, il suffit de passer la variable
`DebianBanner` de son sshd_config à `no`

```bash
DebianBanner no
```

Par défaut, lorsque nous nous connectons à un serveur SSH, nous avons 2
minutes (120s) pour nous login. Cette valeur est inutilement longue.
Cette valeur est controlée par la directive `LoginGraceTime` et doit
être définit à 30s.

```bash
LoginGraceTime 30
```

Si par mégarde vous oubliez de vérouiller votre poste avec des
connexions SSH ouvertes, il peut être intéressant de configurer une
valeur pour laquelle votre sesssion SSH sera automatiquement terminée. 2
paramètres cohabitent :

  * `ClientAliveCountMax` - Indique le nombre total de messages de
    vérification envoyés par le serveur SSH sans obtenir de réponse du
    client SSH. La valeur par défaut est 3.
  * `ClientAliveInterval` - Indique le délai d'attente en secondes.
    Après x secondes, le serveur SSH envoie un message au client pour
    lui demander une réponse. Deafult est égal à 0 (le serveur
    n'enverra pas de message au client pour vérifier.).

Par exemple, si vous souhaitez une déconnexion automatique au bout de 3
minutes, voici la configuration à appliquer :

```bash
ClientAliveInterval 180
ClientAliveCountMax 0
```

Une fois l'utilisateur authentifié, nous devons nous assurer que le
canal de communication est correctement chiffré. Pour cela, la fondation
Mozilla nous fournit des données utiles :

```bash
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-512,hmac-sha2-256,umac-128@openssh.com
```

Si vous souhaitez savoir quels ciphers ou autres sont disponibles dans
votre version d'OpenSSH, il est possible d'utiliser les commandes
suivantes

```bash
ssh -Q cipher
ssh -Q cipher-auth
ssh -Q mac
ssh -Q kex
ssh -Q key
```

Utiliser si possible les mécanismes de sandbox du kernel dans les
processus non privilégiés

```bash
UsePrivilegeSeparation sandbox
```

### Avancé

Par défaut, peu d'informations sont loguées dans les logs, une
information pouvant être utile est la fingerprint de la clé utilisée,
nous devons donc passer le LogLevel à verbose.

```bash
LogLevel VERBOSE
```

Il est également possible de log les actions effectuées en SFTP.

```bash
Subsystem sftp  /usr/lib/ssh/sftp-server -f AUTHPRIV -l INFO
```

Pour une sécurisation encore plus poussée, il est possible d'activer le
2FA sur votre serveur SSH. Cependant, si vous vous connectez &
deconnectez souvent de vos serveurs, celui-ci peut vite devenir très
contraignant

Dans le cadre où vous utilisez un serveur intermédiaire pour vous
connecter à vos serveurs (bastion), il est possible d'autoriser le
login uniquement à partir des IPs de ces derniers :

```bash
AllowGroups admin@1.2.3.4 admin@10.20.30.40
```

Cette syntaxe est également possible pour la directive AllowUsers.

Les variables d'environnement peuvent être modifiées lors d'une
connexion SSH depuis une clef, ces derniers peuvent très largement
altérer le comportement de certains programmes (LD_PRELOAD,
LD_LIBRARY_PATH...). Pour cela, une option existe pour désactiver la
modification des variables systèmes lors d'une connexion SSH.

```bash
PermitUserEnvironment no
```

Toutefois, les variables listées dans la directives `AcceptEnv`
restent modifiables.

## authorized_keys

Beaucoup d'options sont également possibles au niveau du fichier
*authorized_keys*

  * `no-agent-forwarding`: Désactivation du SSH agent forwarding
  * `no-port-forwarding`: Désactivation du SSH port forwarding.
  * `no-X11-forwarding`: Désactivation du X11 display forwarding.
  * `no-pty`: Désactive la possibilité de démarrer un shell
  * `no-user-rc`: Empêche l'interprétation du fichier ~/.ssh/rc.

Par défaut, tout est autorisé. Cependant, une autre approche est
possible. Via le keyword `restrict`, ce qui va implicitement refuser
toutes les options SSH. Par exemple, si vous souhaitez tout de même
autoriser l'agent forwarding

```bash
restrict,agent-forwarding ecdsa-sha2-nistp521 AAAAE
```

Il est également possible de forcer une commande lors de la connexion
avec une clef spécifique :

```bash
command="/usr/local/bin/backup" ecdsa-sha2-nistp521 AAAAE
```

Une option plutôt pratique via ce fichier authorized_keys et qu'il est
possible de simuler une connexion SFTP pour une clef précise

```bash
restrict,command="false" ecdsa-sha2-nistp521 AAAAE
```

Avec la clef suivante, vous n'aurez uniquement le droit à effectuer une
navigation dans les différents répertoires de votre utilisateur

Il est également possible de limiter la connexion via votre clef pour
différentes machines, option une nouvelle fois utile lors de
l'utilisation d'un bastion

```bash
from="1.2.3.4,10.20.30.40" ecdsa-sha2-nistp521 AAAAE
```

## Entrées SSHFP

A outre mesure, il est possible de sécuriser une connexion SSH avec les entrées DNS SSHFP. ssh (s'il est configuré avec VerifyHostKeyDNS=yes) va automatiquement vérifier le record SSHFP et permettre la connexion.

Si SSHFP est correctement configuré, vous aurez cette entrée :

```
debug1: matching host key fingerprint found in DNS
```

Et pour générez vos entrées SSHFP :

```bash
#!/bin/bash
IFS=$'\n'
for LINE in $(cat ~/.ssh/known_hosts) ; do
    WANTED=$(echo "$LINE" | awk -F" " '{print $1}')
    PORT=$(echo "$WANTED" | awk -F":" '{print $2}'|awk '{ print substr( $0, 0,4 ) }')
    HOST=$(echo "$WANTED" | ggrep -oP '\[.*?\]'|tr -d "]"|tr -d "["|head -1)
    [ ! $PORT ] && PORT=22
    echo "$HOST - $PORT"
    ssh-keygen -r $HOST
    # sleep 1
    # ssh-keyscan -p $PORT -D $HOST
done
```
