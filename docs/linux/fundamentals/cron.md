# Rappel sur le cron

!!! warning Systemd Equivalent
    SystemD a introduit un nouveau type de cron dénommés les "timers", ils permettent un meilleur suivi ainsi qu'une granularité plus fine. Il en va donc de bonne pratique de préferer les timers aux crons

La fonctionnalité cron a été développée afin de pouvoir automatiser
certaines tâches.

Les tâches planifiées peuvent être lancées en tant qu'utilisateur
standard. Nous gérons la plupart des tâche cron via la commande
**crontab**. D'autres scripts peuvent être directement déployés dans
certains dossiers '"spéciaux'"

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

Tous les crons des utilisateurs sont stockés dans
**/var/spool/cron/crontabs**

## Dossiers dédiés à cron

Si vous souhaitez déployez un script une fois/jour sans importance
d'heure, alors nous pouvons passer par certains dossiers dédiés.

       /etc/
         |----- cron.d/
         |----- cron.hourly/
         |----- cron.daily/
         |----- cron.monthly/
         |----- cron.weekly/
         |----- crontab

Par exemple, comme vous vous en doutez, si vous souhaitez avoir un
script qui est exécutée toutes les heures, alors vous pouvez le déclarer
dans ce dossier.

## Variable cron

Une fonctionnalité de cron très pratique est l'envoie de mail du
résultat du cron. Si vous définissez la variable *MAILTO*, alors le mail
sera envoyé à cet utilisateur/son alias

## Divers

Le site [crontab.guru](http://crontab.guru/) nous permet de voir
visuellement à quel moment une tâche va se déclencher sans avoir à
réfléchir. Toutes les règles cron pour tous les utilisateurs sont
accessibles dans le dossier **/var/spool/cron**
