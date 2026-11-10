---
description: Garder une trace des commandes tapées en SSH avec PROMPT_COMMAND et rsyslog, sans valeur d'audit
tested_with:
  - "Bash 5.2 (Debian 12)"
  - "rsyslog 8.2302"
tags:
  - SSH
  - Audit
---

# Logger les actions SSH utilisateurs simplement

Parfois, il peut-être utile de logger les action utilisateurs, que ce
soit pour vérifier que celui-ci ne casse pas tout ou alors pour
« surveiller » tous les activités.

Ce n'est pas de l'audit : `PROMPT_COMMAND` est une variable de l'environnement de l'utilisateur, il la désactive en une commande (`unset PROMPT_COMMAND`, `bash --norc`, un autre shell), une commande passée directement (`ssh host 'cmd'`, scp, sftp) n'affiche pas de prompt donc n'est pas loggée, et `logger` permet de forger de fausses lignes. Pour une vraie piste d'audit, on passe par auditd (règle sur `execve`) ou le session recording de sudo.

Tout d'abord, il y a 2 moyens de logger les actions :

- En éditant le fichier bashrc global, `/etc/bash.bashrc` sur Debian/Ubuntu (sourcé aussi par `/etc/profile` pour les shells de login) ou `/etc/bashrc` sur RHEL, ce qui aura comme conséquence logger **tous** les utilisateurs
- En éditant le fichier `.bashrc` propre à chaque utilisateur. (Il se situe dans son répertoire home)

Dans tous les cas, les logs seront envoyés dans syslog (exploitable via
journalctl), ainsi que dans un fichier (que nous allons définir)

Quelque soit le fichier, voici la ligne à rajouter. Les simples quotes sont indispensables : sans elles, le shell exécute `logger` une seule fois à l'ouverture de la session au lieu de l'évaluer avant chaque prompt.

```bash
export PROMPT_COMMAND='RETRN_VAL=$?;logger -p local6.debug "$(whoami) [$$]: $(history 1 | sed "s/^[ ]*[0-9]\+[ ]*//") [$RETRN_VAL]"'
```

Avec cette ligne, nous aurons ce genre de résultats

```bash
nov. 04 16:27:21 hostname moche[1781]: moche [20803]: cd /incoming/Media [1]
```

Depuis Debian 12, rsyslog n'est plus installé par défaut (journald seul) : sans lui, les logs restent lisibles avec `journalctl` mais il n'y a pas de fichier dédié. On l'installe si besoin :

```bash
apt install rsyslog
```

Nous allons configurer rsyslog pour qu'il envoie les logs dans un
fichier, avec un fichier dédié `/etc/rsyslog.d/commands.conf` :

```bash
local6.*    /var/log/commands.log
```

Via cette commande, rsyslog enverra tout ce qui concerne `local6.`
quelque soit le niveau de debug `(.*)` dans le fichier
/var/log/commands.log

Puis nous redémarrons syslog

```bash
systemctl try-restart rsyslog.service
```

Une fois ceci fait, vous recevrez correctement vos fichier dans syslog
et dans le fichier que vous avez indiqués. Il faut maintenant configurer
la rotation automatique des logs.

Plutôt que d'ajouter le chemin dans `/etc/logrotate.d/rsyslog` (écrasé par les mises à jour du paquet), on crée un fichier dédié `/etc/logrotate.d/commands` :

```bash
/var/log/commands.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
```

Il s'agit ici d'un log basique, il est possible d'avoir un log
complet avec des logiciels tels que
[Snoopy](https://github.com/a2o/snoopy)
