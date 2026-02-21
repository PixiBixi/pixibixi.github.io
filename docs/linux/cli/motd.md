# Personnaliser ton motd

Voici un petit tutoriel qui permet de personnaliser le '"Message Of The
Day'" sur Debian (adaptable à toute distribution) Le '"motd'" c'est le
message que vous avez au moment où vous vous connectez sur votre shell.
Ce tutoriel vous permettra d'avoir un '"motd'" qui ressemblera à ça:'

```bash
apt-get install update-notifier-common
```

Supprimer le contenu du motd actuel avec vim /etc/motd

On créer ensuite le script qui affichera les informations choisies

<!-- markdownlint-disable MD046 -->
??? abstract "/etc/profile.d/motd.sh"
    ```bash
    let upSeconds="$(/usr/bin/cut -d. -f1 /proc/uptime)"
    let secs=$((${upSeconds}%60))
    let mins=$((${upSeconds}/60%60))
    let hours=$((${upSeconds}/3600%24))
    let days=$((${upSeconds}/86400))

    UPTIME=`printf "%d days, %02dh%02dm%02ds" "$days" "$hours" "$mins" "$secs"`
    REMOTEIP=`echo $SSH_CLIENT | awk {print $1}`

    if [ -f /var/run/reboot-required ]; then
    REBOOT="'033[22;31m>>>>>> This server require a reboot <<<<<<'033[0m"
    fi

    if [ -f /var/log/checkupdate.log ]; then PACKAGE=`cat /var/log/checkupdate.log | awk -F ; {print $1}` SECURITY=`cat /var/log/checkupdate.log | awk -F ; {print $2}`
    fi

    if [ "$SECURITY" -gt 0 ]; then SECURITY="'033[22;31m${SECURITY}'033[0m"
    fi

    # get the load averages
    read one five fifteen rest < /proc/loadavg
    echo -e "--------- '033[22;31mW'033[22;32melcome '033[0m--------------------------------------------- --- -- - -
    You are entering into a secured area! All activities on this system
    are logged. Unauthorized access will be fully investigated and
    reported to the appropriate law enforcement agencies.
    ------------------------------------------------------------ --- -- - -
    You are connected from ${REMOTEIP} as `whoami`@`hostname`
    Uptime.....: ${UPTIME}
    Memory.....: `free -m | grep Mem: | awk {print $3}`MB (Used) / `free -m | grep Mem: | awk {print $2}`MB (Total) / `free -m | grep Mem: | awk {print $4}`MB (Free)
    Load Avg...: ${one}, ${five}, ${fifteen} (1, 5, 15 min)
    Top process: Memory: `ps axo %mem,comm | grep -v "MEM"| sort -nr | head -n 1 | awk {print $2}` `ps axo %mem,comm | grep -v "MEM" | sort -nr | head -n 1 | awk {print $1}`% Cpu: `ps axo pcpu,comm | grep -v "CPU" | sort -nr | head -n 1 | awk {print $2}` `ps axo pcpu,comm | grep -v "CPU" | sort -nr | head -n 1 | awk {print $1}`%
    Update.....: ${PACKAGE} package update / ${SECURITY} security update ${REBOOT}
    ------------------------------------------------------------------ --- -- - - '033[0m"
    ```
<!-- markdownlint-enable MD046 -->

On créer ensuite le script qui vérifiera toutes les heures si de
nouvelles mises à jour sont disponibles

??? abstract "/etc/cron.hourly/checkupdate"
    ```bash
    #!/bin/bash
    if [ -f /var/log/checkupdate.log ]; then
    rm -f /var/log/checkupdate.log
    fi
    /usr/lib/update-notifier/apt-check >> /var/log/checkupdate.log 2>&1
    ```

On fini par le rendre executable :

```bash
chmod +x /etc/cron.hourly/checkupdate
```

Les plus impatients peuvent exécuter ce script
(`/etc/cron.hourly/checkupdate`) manuellement et ouvrir un nouveau shell
pour voir le résultat :)

Ce script est loin d'être parfait (Et n'a pas la prétention de
l'être), mais il fait ce qu'on lui demande.
