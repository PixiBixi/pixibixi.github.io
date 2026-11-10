---
description: Personnaliser le Message of the Day avec affichage d'infos système à la connexion
tags:
  - motd
---

# Personnaliser ton motd

Voici un petit tutoriel qui permet de personnaliser le « Message Of The
Day » sur Debian (adaptable à toute distribution) Le « motd » c'est le
message que vous avez au moment où vous vous connectez sur votre shell.
Ce tutoriel vous permettra d'avoir un « motd » qui ressemblera à ça :

```text
--------- Welcome --------------------------------------------- --- -- - -
You are entering into a secured area! All activities on this system
are logged. Unauthorized access will be fully investigated and
reported to the appropriate law enforcement agencies.
------------------------------------------------------------ --- -- - -
You are connected from 203.0.113.7 as root@srv01
Uptime.....: 12 days, 04h21m33s
Memory.....: 3145MB (Used) / 12016MB (Total) / 7075MB (Free)
Load Avg...: 0.36, 0.21, 0.12 (1, 5, 15 min)
Top process: Memory: mysqld 12.4% Cpu: php-fpm8.2 6.6%
Update.....: 47 package update / 9 security update >>>>>> This server require a reboot <<<<<<
------------------------------------------------------------------ --- -- - -
```

On vide d'abord le motd statique, `/etc/motd` :

```bash
truncate -s 0 /etc/motd
```

Sur Debian et Ubuntu, `pam_motd` affiche aussi la sortie des scripts de `/etc/update-motd.d` (`10-uname` sur Debian, `50-motd-news`, `90-updates-available` et cie sur Ubuntu). Pour les couper, on retire le bit exécutable :

```bash
chmod -x /etc/update-motd.d/*
```

On créer ensuite le script qui affichera les informations choisies

```bash title="/etc/profile.d/motd.sh"
let upSeconds="$(/usr/bin/cut -d. -f1 /proc/uptime)"
let secs=$((${upSeconds}%60))
let mins=$((${upSeconds}/60%60))
let hours=$((${upSeconds}/3600%24))
let days=$((${upSeconds}/86400))

UPTIME=`printf "%d days, %02dh%02dm%02ds" "$days" "$hours" "$mins" "$secs"`
REMOTEIP=`echo $SSH_CLIENT | awk '{print $1}'`

REBOOT=""
if [ -f /var/run/reboot-required ]; then
REBOOT="\033[22;31m>>>>>> This server require a reboot <<<<<<\033[0m"
fi

PACKAGE=0
SECURITY=0
if [ -f /var/log/checkupdate.log ]; then PACKAGE=`awk -F ';' '{print $1}' /var/log/checkupdate.log` SECURITY=`awk -F ';' '{print $2}' /var/log/checkupdate.log`
fi

if [ "${SECURITY:-0}" -gt 0 ] 2>/dev/null; then SECURITY="\033[22;31m${SECURITY}\033[0m"
fi

# get the load averages
read one five fifteen rest < /proc/loadavg
echo -e "--------- \033[22;31mW\033[22;32melcome \033[0m--------------------------------------------- --- -- - -
You are entering into a secured area! All activities on this system
are logged. Unauthorized access will be fully investigated and
reported to the appropriate law enforcement agencies.
------------------------------------------------------------ --- -- - -
You are connected from ${REMOTEIP} as `whoami`@`hostname`
Uptime.....: ${UPTIME}
Memory.....: `free -m | grep Mem: | awk '{print $3}'`MB (Used) / `free -m | grep Mem: | awk '{print $2}'`MB (Total) / `free -m | grep Mem: | awk '{print $4}'`MB (Free)
Load Avg...: ${one}, ${five}, ${fifteen} (1, 5, 15 min)
Top process: Memory: `ps axo %mem,comm | grep -v "MEM"| sort -nr | head -n 1 | awk '{print $2}'` `ps axo %mem,comm | grep -v "MEM" | sort -nr | head -n 1 | awk '{print $1}'`% Cpu: `ps axo pcpu,comm | grep -v "CPU" | sort -nr | head -n 1 | awk '{print $2}'` `ps axo pcpu,comm | grep -v "CPU" | sort -nr | head -n 1 | awk '{print $1}'`%
Update.....: ${PACKAGE} package update / ${SECURITY} security update ${REBOOT}
------------------------------------------------------------------ --- -- - - \033[0m"
```

On créer ensuite le script qui vérifiera toutes les heures si de nouvelles mises à jour sont disponibles. Il simule un `apt-get upgrade` sur les listes de paquets déjà téléchargées (le timer `apt-daily` les rafraîchit tout seul) et écrit `<mises à jour>;<mises à jour de sécurité>` :

```bash title="/etc/cron.hourly/checkupdate"
#!/bin/bash
# Writes "<updates>;<security updates>", read by /etc/profile.d/motd.sh
UPGRADES=$(apt-get -s -o Debug::NoLocking=true upgrade | grep '^Inst')
TOTAL=$(printf '%s\n' "$UPGRADES" | grep -c '^Inst')
SECURITY=$(printf '%s\n' "$UPGRADES" | grep -ci 'security')
echo "${TOTAL};${SECURITY}" > /var/log/checkupdate.log
```

On fini par le rendre executable :

```bash
chmod +x /etc/cron.hourly/checkupdate
```

Sur Ubuntu, `/usr/lib/update-notifier/apt-check` (paquet `update-notifier-common`, qui n'existe pas sur Debian) sort le même format, en dernière ligne de stderr :

```bash
/usr/lib/update-notifier/apt-check 2>&1 | tail -n 1 > /var/log/checkupdate.log
```

Le bandeau reboot lit `/var/run/reboot-required`. Sur Debian, c'est le hook `/etc/kernel/postinst.d/unattended-upgrades` qui le crée après une mise à jour du kernel : sans le paquet `unattended-upgrades`, le bandeau ne s'affiche jamais.

Les plus impatients peuvent exécuter ce script
(`/etc/cron.hourly/checkupdate`) manuellement et ouvrir un nouveau shell
pour voir le résultat :)

Ce script est loin d'être parfait (Et n'a pas la prétention de
l'être), mais il fait ce qu'on lui demande.

---

## Voir aussi

- [Dotfiles](confrc.md) - configuration centralisée de l'environnement de travail
