# Logger les actions SSH utilisateurs simplement

Parfois, il peut-être utile de logger les action utilisateurs, que ce
soit pour vérifier que celui-ci ne casse pas tout ou alors pour
'"surveiller'" tous les activités.

Tout d'abord, il y a 2 moyens de logger les actions :

-   En éditant le fichier *bash.rc* se situant dans */etc* ce qui aura
    comme conséquence logger **tous** les utilisateurs
-   En éditant le fichier *.bashrc* propre à chaque utilisateur. (Il se
    situe dans son répertoire home)

Dans tous les cas, les logs seront envoyés dans syslog (exploitable via
journalctl), ainsi que dans un fichier (que nous allons définir)

Quelque soit le fichier, voici la ligne à rajouter :

```bash
export PROMPT_COMMAND=RETRN_VAL=$?;logger -p local6.debug "$(whoami) [$$]: $(history 1 | sed "s/^[  ]*[0-9]'+[  ]*//" ) [$RETRN_VAL]"
```

Avec cette ligne, nous aurons ce genre de résultats

```bash
nov. 04 16:27:21 hostname moche[1781]: moche [20803]: cd /incoming/Media [1]
```

Nous allons configurer rsyslog pour qu'il envoie les logs dans un
fichier :

```bash
local6.*    /var/log/commands.log
```

Via cette commande, rsyslog enverra tout ce qui concerne **local6.**
quelque soit le niveau de debug **(.'*)** dans le fichier
/var/log/commands.log

Puis nous redémarrons syslog

```bash
systemctl try-restart rsyslog.service
```

Une fois ceci fait, vous recevrez correctement vos fichier dans syslog
et dans le fichier que vous avez indiqués. Il faut maintenant configurer
la rotation automatique des logs.

Il suffit d'ajouter le chemin de votre fichier de logs (Pour nous
/var/log/commands.log) dans le fichier de configuration logrotate se
situant dans /etc/logrotate.d/rsyslog

```bash
[...]
/var/log/mail.info
[...]
/var/log/debug
**/var/log/commands.log**
```

Il s'agit ici d'un log basique, il est possible d'avoir un log
complet avec des logiciels tels que
[Snoopy](https://github.com/a2o/snoopy)
