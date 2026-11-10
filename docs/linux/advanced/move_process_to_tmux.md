---
description: Rattacher un processus en arrière-plan à un nouveau TTY avec reptyr et tmux
tags:
  - Tmux
  - Process
---

# Déplacer un processus dans un tmux

Il peut être utile de déplacer un processus dans un tmux pour une
opération qui peut être plus longue que prévue. Techniquement, c'est
plutôt simple. **nelhage** a écrit un super outil permettant de
rattacher un processus à un nouveau TTY,
[reptyr](https://github.com/nelhage/reptyr)

Premièrement, on suspend le processus avec `CTRL-Z` puis on le relance en background avec `bg`, sinon il reste stoppé. On récupère son PID avec `jobs -l`, puis on le dissocie du shell avec `disown`.

```bash
└─$ bg
└─$ jobs -l
[1]+ 25644 Signal d'arrêt        php
└─$ disown 25644
-bash: avertissement :suppression de la tâche stoppée 1 avec le groupe de processus 25644
└─$ jobs -l
```

Une fois que c'est OK, on ouvre un tmux et on attach le processus au
nouveau TTY avec reptyr

```bash
└─$ reptyr 25644
```

Et voilà, on a désormais le processus dans un tmux !

Sur Ubuntu, `ptrace` est restreint par défaut (Yama) et reptyr échoue à s'attacher. On le débloque temporairement en root :

```bash
echo 0 > /proc/sys/kernel/yama/ptrace_scope
```

Pour le rendre permanent, ça se passe dans `/etc/sysctl.d/10-ptrace.conf`.
