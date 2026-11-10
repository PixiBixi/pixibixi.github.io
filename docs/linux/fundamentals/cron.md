---
description: Planifier des tâches avec cron - crontab, dossiers cron.* et variables d'environnement
tags:
  - cron
---

# Rappel sur le cron

!!! warning "Systemd Equivalent"
    SystemD a introduit un nouveau type de cron dénommés les "timers", ils permettent un meilleur suivi ainsi qu'une granularité plus fine. Il en va donc de bonne pratique de préferer les timers aux crons. La planification se déclare avec `OnCalendar=` dans le `.timer`, et `systemd-analyze calendar "*-*-* 03:30:00"` affiche les prochains déclenchements pour valider l'expression.

La fonctionnalité cron a été développée afin de pouvoir automatiser
certaines tâches.

Les tâches planifiées peuvent être lancées en tant qu'utilisateur
standard. Nous gérons la plupart des tâche cron via la commande
**crontab**. D'autres scripts peuvent être directement déployés dans
certains dossiers « spéciaux »

## La commande crontab

```bash
crontab -e
```

Nous permet d'éditer les tâches cron pour l'user courant

```bash
crontab -l
```

Nous permet de lister les tâches cron pour l'utilisateur courant

```bash
crontab -l -u www-data
```

Nous permet de lister les tâches cron pour l'utilisateur www-data. Nous
pouvons également appliquer le paramètre **-u** pour éditer la liste des
cron.

Tous les crons des utilisateurs sont stockés dans `/var/spool/cron/crontabs/<user>` sur Debian/Ubuntu, et dans `/var/spool/cron/<user>` sur RHEL/Rocky/Alma (cronie). On ne les édite jamais à la main, on passe par `crontab -e`.

## Dossiers dédiés à cron

Si vous souhaitez déployez un script une fois/jour sans importance
d'heure, alors nous pouvons passer par certains dossiers dédiés.

```bash
/etc/
  |----- cron.d/
  |----- cron.hourly/
  |----- cron.daily/
  |----- cron.monthly/
  |----- cron.weekly/
  |----- crontab
```

Les dossiers `cron.hourly`, `cron.daily`, `cron.weekly` et `cron.monthly` prennent des scripts : un script déposé dans `cron.hourly` est exécuté toutes les heures, via `run-parts`. Le script doit être exécutable (et appartenir à root sur Debian).

!!! warning "Pas de point dans le nom sur Debian/Ubuntu"
    Le `run-parts` de Debian ignore silencieusement tout fichier dont le nom contient un point : `backup.sh` ne tourne jamais, `backup` si. Le `run-parts` de cronie (RHEL) n'a pas cette contrainte.

`cron.d` est différent : il prend des fichiers au format crontab, avec un champ utilisateur en plus (même format que `/etc/crontab`), pas des scripts. Même règle de nommage sans point sur Debian :

```bash
# /etc/cron.d/backup
30 3 * * * root /usr/local/bin/backup
```

## Variable cron

Une fonctionnalité de cron très pratique est l'envoi par mail de la sortie du cron. Par défaut le mail part au propriétaire de la crontab. Si on définit la variable *MAILTO*, le mail est envoyé à cet utilisateur/son alias, et `MAILTO=""` coupe l'envoi. Il faut un MTA local (postfix, nullmailer...) pour que le mail parte vraiment :

```bash
MAILTO=admin@example.com
30 3 * * * /usr/local/bin/backup
```

## Divers

Le site [crontab.guru](https://crontab.guru/) nous permet de voir
visuellement à quel moment une tâche va se déclencher sans avoir à
réfléchir. Pour faire le tour de tous les crons d'une machine, on regarde 3 endroits : le spool des utilisateurs (voir plus haut, selon la distribution), `/etc/crontab` et `/etc/cron.d/`, plus les dossiers `cron.hourly/daily/weekly/monthly`.
